import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common';

class JoinEventDto {
  @IsString() teamId?: string;
}

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les events (statuts, plages horaires)' })
  list() {
    return this.prisma.event.findMany({
      include: { challenge: { select: { title: true, slug: true } } },
      orderBy: { startsAt: 'asc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’un event' })
  get(@Param('id') id: string) {
    return this.prisma.event.findUnique({
      where: { id },
      include: { challenge: true, participants: { include: { user: { select: { pseudo: true } }, team: { select: { name: true, tag: true } } } } },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  @ApiOperation({ summary: 'Rejoindre un event (joueur ou équipe)' })
  async join(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: JoinEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event introuvable');
    const now = new Date();
    if (now < event.startsAt || now > event.endsAt) {
      throw new BadRequestException({ code: 'out_of_window', message: 'Event hors plage horaire' });
    }
    if (event.status !== 'OPEN' && event.status !== 'SCHEDULED') {
      throw new BadRequestException({ code: 'event_closed', message: 'Event fermé' });
    }
    const existing = await this.prisma.eventParticipant.findFirst({
      where: { eventId: id, ...(dto.teamId ? { teamId: dto.teamId } : { userId: user.sub }) },
    });
    if (existing) return existing;
    return this.prisma.eventParticipant.create({
      data: { eventId: id, userId: dto.teamId ? null : user.sub, teamId: dto.teamId ?? null },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/start')
  @HttpCode(200)
  @ApiOperation({ summary: 'Démarrer l’essai (1 seul essai par joueur/équipe — §4.4)' })
  async start(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: JoinEventDto) {
    const participant = await this.prisma.eventParticipant.findFirst({
      where: { eventId: id, ...(dto.teamId ? { teamId: dto.teamId } : { userId: user.sub }) },
    });
    if (!participant) throw new BadRequestException({ code: 'not_joined', message: 'Rejoignez l’event d’abord' });
    if (participant.attemptUsedAt) {
      throw new ConflictException({ code: 'attempt_used', message: 'Essai déjà consommé' });
    }
    const updated = await this.prisma.eventParticipant.update({
      where: { id: participant.id },
      data: { startedAt: new Date() },
    });
    return { participant: updated, message: 'Chronomètre démarré — l’essai est consommé à la première soumission' };
  }
}

@Module({ controllers: [EventsController] })
export class EventsModule {}
