import {
  Controller,
  Get,
  Module,
  Param,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.module';

@ApiTags('Classements')
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('players')
  @ApiOperation({ summary: 'Classement des joueurs (global, par thème, période)' })
  async players(@Query('theme') theme?: string, @Query('limit') limit = '50') {
    const take = Math.min(Number(limit) || 50, 100);
    const rows = await this.prisma.bestScore.findMany({
      where: { userId: { not: null }, ...(theme ? { challenge: { theme: { slug: theme } } } : {}) },
      include: { user: { select: { pseudo: true } }, challenge: { select: { title: true, theme: { select: { slug: true } } } } },
      orderBy: [{ score: 'desc' }, { createdAt: 'asc' }],
      take,
    });
    return rows.map((r, i) => ({
      rank: i + 1,
      pseudo: r.user?.pseudo,
      score: r.score,
      challenge: r.challenge?.title,
      theme: r.challenge?.theme?.slug,
      submittedAt: r.createdAt,
    }));
  }

  @Get('teams')
  @ApiOperation({ summary: 'Classement des équipes' })
  async teams(@Query('limit') limit = '50') {
    const take = Math.min(Number(limit) || 50, 100);
    const teams = await this.prisma.team.findMany({
      include: { bestScores: { select: { score: true } } },
      take: 200,
    });
    const ranked = teams
      .map((t) => ({ id: t.id, name: t.name, tag: t.tag, score: t.bestScores.reduce((s, b) => s + b.score, 0) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, take)
      .map((t, i) => ({ rank: i + 1, ...t }));
    return ranked;
  }

  @Get('events/:id')
  @ApiOperation({ summary: 'Classement d’un event' })
  async event(@Param('id') id: string) {
    const participants = await this.prisma.eventParticipant.findMany({
      where: { eventId: id },
      include: { user: { select: { pseudo: true } }, team: { select: { name: true, tag: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return participants.map((p, i) => ({
      rank: i + 1,
      pseudo: p.user?.pseudo ?? p.team?.name,
      team: p.team?.tag,
      joinedAt: p.joinedAt,
      startedAt: p.startedAt,
      attemptUsedAt: p.attemptUsedAt,
    }));
  }
}

@Module({ controllers: [LeaderboardsController] })
export class LeaderboardsModule {}
