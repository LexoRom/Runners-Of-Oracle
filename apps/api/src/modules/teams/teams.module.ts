import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common';

class CreateTeamDto {
  @IsString() @Length(2, 30) name: string;
  @IsString() @Length(2, 5) @Matches(/^[A-Z0-9]+$/) tag: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() logoUrl?: string;
}

class InviteDto {
  @IsString() pseudo: string;
}

@ApiTags('Équipes')
@Controller('teams')
export class TeamsController {
  constructor(private readonly prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Créer une équipe (le créateur devient capitaine)' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTeamDto) {
    const team = await this.prisma.team.create({
      data: { name: dto.name, tag: dto.tag, description: dto.description, logoUrl: dto.logoUrl, captainId: user.sub },
    });
    await this.prisma.teamMember.create({ data: { teamId: team.id, userId: user.sub, role: 'CAPTAIN' } });
    return team;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d’une équipe et de ses membres' })
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
    if (!team || team.captainId !== user.sub) throw new ForbiddenException('Réservé au capitaine');
    const invitee = await this.prisma.user.findUnique({ where: { pseudo: dto.pseudo } });
    if (!invitee) throw new NotFoundException('Utilisateur introuvable');
    const existing = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId: invitee.id } } });
    if (existing) throw new ConflictException('Déjà membre');
    return this.prisma.teamMember.create({ data: { teamId: id, userId: invitee.id, role: 'MEMBER' } });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/members/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Exclure un membre (capitaine) ou quitter (soi-même)' })
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('userId') userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException();
    if (user.sub !== team.captainId && user.sub !== userId) {
      throw new ForbiddenException('Droits insuffisants');
    }
    await this.prisma.teamMember.delete({ where: { teamId_userId: { teamId: id, userId } } });
  }
}

@Module({ controllers: [TeamsController] })
export class TeamsModule {}
