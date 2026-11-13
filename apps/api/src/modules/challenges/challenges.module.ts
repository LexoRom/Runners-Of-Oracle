import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common';
import { encrypt } from '../../lib/crypto';

class ChallengeFilterDto {
  @IsOptional() @IsString() theme?: string;
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) difficulty?: number;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() type?: string;
}

@ApiTags('Défis')
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les défis (filtres : theme, difficulty, status, type)' })
  list(@Query() query: ChallengeFilterDto) {
    return this.prisma.challenge.findMany({
      where: {
        ...(query.status ? { status: query.status as any } : { status: 'PUBLISHED' }),
        ...(query.theme ? { theme: { slug: query.theme } } : {}),
        ...(query.difficulty ? { difficulty: query.difficulty } : {}),
        ...(query.type ? { type: query.type as any } : {}),
      },
      include: { theme: { select: { slug: true, name: true } } },
      orderBy: [{ theme: { order: 'asc' } }, { order: 'asc' }],
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Détail d’un défi (tests cachés jamais renvoyés)' })
  async detail(@Param('slug') slug: string) {
    const challenge = await this.prisma.challenge.findUnique({
      where: { slug },
      include: { theme: true, versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!challenge) throw new (require('@nestjs/common').NotFoundException)('Défi introuvable');
    // On ne renvoie jamais les tests ni la solution de référence (§8, §9)
    const { testsEncrypted: _t, referenceSolutionEncrypt: _r, ...version } = challenge.versions[0] ?? ({} as any);
    return { ...challenge, version };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @Post()
  @ApiOperation({ summary: 'Créer un défi (admin)' })
  create(@Body() body: any) {
    return this.prisma.challenge.create({ data: body });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMINISTRATEUR')
  @Post(':id/versions')
  @ApiOperation({ summary: 'Ajouter une version (tests + solution chiffrés AES-256-GCM)' })
  async addVersion(@Param('id') id: string, @Body() body: { statement?: string; starterCode?: string; tests: any[]; referenceSolution?: string }) {
    const last = await this.prisma.challengeVersion.findFirst({ where: { challengeId: id }, orderBy: { version: 'desc' } });
    const version = (last?.version ?? 0) + 1;
    return this.prisma.challengeVersion.create({
      data: {
        challengeId: id,
        version,
        statement: body.statement ?? null,
        starterCode: body.starterCode ?? null,
        testsEncrypted: encrypt(JSON.stringify(body.tests ?? [])),
        referenceSolutionEncrypt: body.referenceSolution ? encrypt(body.referenceSolution) : '',
      },
    });
  }
}

@Module({ controllers: [ChallengesController] })
export class ChallengesModule {}
