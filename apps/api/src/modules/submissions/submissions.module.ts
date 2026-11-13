import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common';
import { randomUUID } from 'node:crypto';
import * as vm from 'node:vm';

class CreateSubmissionDto {
  @IsString() language: string;
  @IsString() code: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) teamId?: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

@ApiTags('Défis')
@Controller('challenges/:challengeId/submissions')
export class ChallengeSubmissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Soumettre une solution (exécution sandbox + scoring)' })
  async submit(
    @Param('challengeId') challengeId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSubmissionDto,
  ) {
    // Vérification des prérequis (§4.7)
    const prereqs = await this.prisma.challengePrerequisite.findMany({ where: { challengeId } });
    const missing: string[] = [];
    for (const p of prereqs) {
      if (p.requiredChallengeId) {
        const best = await this.prisma.bestScore.findFirst({ where: { challengeId: p.requiredChallengeId, userId: user.sub } });
        if (!best) missing.push('Défi prérequis non réussi');
      }
      if (p.requiredLessonId) {
        const progress = await this.prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.sub, lessonId: p.requiredLessonId } } });
        if (!progress) missing.push('Cours prérequis non terminé');
      }
    }
    if (missing.length > 0) {
      throw new ForbiddenException({ code: 'prerequisites_missing', message: 'Prérequis non satisfaits', details: missing });
    }

    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!challenge) throw new (require('@nestjs/common').NotFoundException)('Défi introuvable');
    if (challenge.status !== 'PUBLISHED') throw new (require('@nestjs/common').ForbiddenException)('Défi non publié');

    const version = challenge.versions[0];
    if (!version) throw new (require('@nestjs/common').NotFoundException)('Aucune version de défi');

    // Tests stockés chiffrés en production (AES-256-GCM, §9) ; en dev ils sont en clair.
    let tests: { input: any; expected: any }[] = [];
    try {
      tests = JSON.parse(version.testsEncrypted);
    } catch {
      tests = [];
    }

    // Soumission officielle d'équipe : seul le capitaine déclenche (§4.6)
    let isOfficial = false;
    if (dto.teamId) {
      const member = await this.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: String(dto.teamId), userId: user.sub } },
      });
      if (member?.role === 'CAPTAIN') isOfficial = true;
    }

    const submission = await this.prisma.submission.create({
      data: {
        challengeId,
        userId: user.sub,
        teamId: dto.teamId ? String(dto.teamId) : null,
        language: dto.language,
        code: dto.code,
        status: 'RUNNING',
        testsTotal: tests.length,
        isOfficial,
      },
    });

    // Python : runner isolé prévu à la vague 2 (§8) — renvoyer une erreur claire plutôt qu'un faux résultat.
    if (dto.language === 'python') {
      await this.prisma.submission.update({
        where: { id: submission.id },
        data: { status: 'FAILED', output: 'Python runner en cours d’implémentation (vague 2). Utilisez JavaScript.' },
      });
      return this.prisma.submission.findUnique({ where: { id: submission.id } });
    }

    const { passed, totalTimeMs, output } = this.runJs(dto.code, tests);

    const allPassed = passed === tests.length && tests.length > 0;
    const basePoints = challenge.basePoints * challenge.difficulty;
    let perfPoints = 0;
    if (allPassed && challenge.tOpt != null && challenge.tMax != null && challenge.tMax > challenge.tOpt) {
      const ratio = clamp(1 - (totalTimeMs - challenge.tOpt) / (challenge.tMax - challenge.tOpt), 0, 1);
      perfPoints = Math.round(challenge.perfMax * ratio);
    }
    const score = allPassed ? basePoints + perfPoints : 0;

    const updated = await this.prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'DONE',
        cpuTimeMs: totalTimeMs,
        testsPassed: passed,
        testsTotal: tests.length,
        score,
        output,
      },
    });

    // Meilleur score + gain de Bits (une seule fois par défi)
    const existingBest = await this.prisma.bestScore.findFirst({
      where: { challengeId, userId: user.sub },
    });
    if (score > 0 && (!existingBest || score > existingBest.score)) {
      if (existingBest) {
        await this.prisma.bestScore.update({
          where: { id: existingBest.id },
          data: { score, submissionId: submission.id },
        });
      } else {
        await this.prisma.bestScore.create({
          data: { challengeId, userId: user.sub, score, submissionId: submission.id },
        });
      }

      // Récompense Bits (§4.10) : gains une fois par défi, bonus si record battu
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: user.sub } });
      if (wallet) {
        const gain = 100 + (existingBest ? 25 : 0);
        await this.prisma.transaction.create({
          data: {
            walletId: wallet.id,
            amount: gain,
            reason: existingBest ? 'RECORD_BONUS' : 'CHALLENGE_SOLVED',
            idempotencyKey: `solve:${submission.id}`,
          },
        });
        await this.prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: gain } } });
      }
    }

    return updated;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Résultat d’une soumission' })
  get(@Param('id') id: string) {
    return this.prisma.submission.findUnique({ where: { id } });
  }

  private runJs(code: string, tests: { input: any; expected: any }[]) {
    const sandbox: any = { console: { log: () => {} } };
    vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });

    let passed = 0;
    let totalTime = 0;
    const outputs: string[] = [];

    // Compilation
    let compiled: any;
    try {
      const script = new vm.Script(`${code}\n; (typeof solve === 'function' ? solve : null);`);
      compiled = script.runInContext(sandbox, { timeout: 1000 });
    } catch (e: any) {
      return { passed: 0, totalTimeMs: 0, output: `Erreur de compilation : ${e?.message ?? e}` };
    }
    if (typeof compiled !== 'function') {
      return { passed: 0, totalTimeMs: 0, output: 'La fonction solve(input) est introuvable' };
    }

    for (const t of tests) {
      const times: number[] = [];
      let ok = false;
      let lastError = '';
      for (let i = 0; i < 5; i++) {
        const start = process.hrtime.bigint();
        try {
          const result = compiled(t.input);
          const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
          times.push(elapsed);
          if (i === 0) {
            ok = JSON.stringify(result) === JSON.stringify(t.expected);
            if (!ok) outputs.push(`Test ${tests.indexOf(t) + 1} : attendu ${JSON.stringify(t.expected)}, obtenu ${JSON.stringify(result)}`);
          }
        } catch (e: any) {
          lastError = e?.message ?? String(e);
          times.push(0);
          if (i === 0) outputs.push(`Test ${tests.indexOf(t) + 1} : exception ${lastError}`);
          break;
        }
      }
      if (ok) passed++;
      if (times.length) {
        times.sort((a, b) => a - b);
        totalTime += times[Math.floor(times.length / 2)];
      }
    }

    return {
      passed,
      totalTimeMs: Math.round(totalTime * 100) / 100,
      output: outputs.length ? outputs.join('\n') : 'Tous les tests sont passés',
    };
  }
}

// Second controller for GET /submissions/:id lives in the same module
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Résultat d’une soumission' })
  get(@Param('id') id: string) {
    return this.prisma.submission.findUnique({ where: { id } });
  }
}

@Module({
  controllers: [ChallengeSubmissionsController, SubmissionsController],
  providers: [],
})
export class SubmissionsModule {}
