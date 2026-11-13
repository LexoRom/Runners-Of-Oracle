import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';

class CreateTeamDto {
  @IsString() @Length(2, 30) name: string;
  @IsString() @Length(2, 5) @Matches(/^[A-Z0-9]+$/) tag: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() logoUrl?: string;
}

class InviteDto {
  @IsString() pseudo: string;
}

class TransferCaptaincyDto {
  @IsString() newCaptainPseudo: string;
}

@ApiTags('Équipes')
@Controller('teams')
export class TeamsController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Créer une équipe (le créateur devient capitaine, max 5 membres)' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: { name: dto.name, tag: dto.tag, description: dto.description, logoUrl: dto.logoUrl, captainId: user.sub },
    });
    await this.prisma.teamMember.create({ data: { teamId: team.id, userId: user.sub, role: 'CAPTAIN' } });
    return team;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une équipe et de ses membres' })
  async get(@Param('id') id: string) {
    return this.prisma.team.findUnique({
      where: { id },
      include: { members: { include: { user: { select: { id: true, pseudo: true } } } } },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/invitations')
  @ApiOperation({ summary: 'Inviter un joueur par pseudo' })
  async invite(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: InviteDto) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Équipe introuvable');
    if (team.captainId !== user.sub) throw new ForbiddenException('Réservé au capitaine');
    // Vérifier la limite de membres
    const currentCount = await this.prisma.teamMember.count({ where: { teamId: id, role: 'MEMBER' } });
    if (currentCount >= (team.memberLimit ?? 5)) throw new ForbiddenException('Équipe complète');
    const invitee = await this.prisma.user.findUnique({ where: { pseudo: dto.pseudo } });
    if (!invitee) throw new NotFoundException('Utilisateur introuvable');
    const existing = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId: invitee.id } } });
    if (existing) throw new ConflictException('Déjà membre');
    return this.prisma.teamMember.create({ data: { teamId: id, userId: invitee.id, role: 'MEMBER' } });
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/transfer-captaincy')
  @ApiOperation({ summary: 'Transférer la capitainerie à un autre membre' })
  async transferCaptaincy(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: TransferCaptaincyDto) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Équipe introuvable');
    if (team.captainId !== user.sub) throw new ForbiddenException('Seul le capitaine peut transférer la capitainerie');
    const newCaptainUser = await this.prisma.user.findUnique({ where: { pseudo: dto.newCaptainPseudo } });
    if (!newCaptainUser) throw new NotFoundException('Utilisateur introuvable');
    // Le nouveau capitaine doit être membre de l'équipe
    const newCaptainMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId: newCaptainUser.id } },
    });
    if (!newCaptainMember) throw new ForbiddenException('L\'utilisateur n\'est pas membre de l\'équipe');
    // Mise à jour du capitaine (on utilise l'ID du nouvel utilisateur)
    await this.prisma.team.update({ where: { id }, data: { captainId: newCaptainUser.id } });
    // Mise à jour du rôle du nouveau capitaine
    await this.prisma.teamMember.update({
      where: { teamId_userId: { teamId: id, userId: newCaptainUser.id } },
      data: { role: 'CAPTAIN' },
    });
    // Ancien capitaine devient membre
    await this.prisma.teamMember.update({
      where: { teamId_userId: { teamId: id, userId: user.sub } },
      data: { role: 'MEMBER' },
    });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join-by-link')
  @ApiOperation({ summary: 'Rejoindre une équipe via lien d\'invitation' })
  async joinByLink(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Équipe introuvable');
    // Vérifier la limite de membres
    const memberCount = await this.prisma.teamMember.count({ where: { teamId: id, role: 'MEMBER' } });
    if (memberCount >= (team.memberLimit ?? 5)) throw new ForbiddenException('Équipe complète');
    // Vérifier si l'utilisateur n'est pas déjà dans une équipe
    const existingMembership = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId: user.sub } } });
    if (existingMembership) throw new ConflictException('Vous êtes déjà membre d\'une équipe');
    // Vérifier si l'utilisateur a une autre équipe (solo enforcement)
    const otherTeam = await this.prisma.teamMember.findFirst({ where: { userId: user.sub } });
    if (otherTeam) throw new ForbiddenException('Vous appartenez déjà à une équipe (solo enforcement)');
    return this.prisma.teamMember.create({ data: { teamId: id, userId: user.sub, role: 'MEMBER' } });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/members/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclure un membre (capitaine) ou quitter (soi-même)' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('userId') userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException();
    if ((user as AuthUser).sub !== team.captainId && (user as AuthUser).sub !== userId) {
      throw new ForbiddenException('Droits insuffisants');
    }
    await this.prisma.teamMember.delete({ where: { teamId_userId: { teamId: id, userId } } });
  }
}

@Module({ controllers: [TeamsController] })
export class TeamsModule {}