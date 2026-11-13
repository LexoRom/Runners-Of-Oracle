import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthModule, AuthService } from '../auth/auth.module';
import { AuthUser, CurrentUser, JwtAuthGuard } from '../../common';
import { UpdateProfileDto } from '../auth/auth.dto';

@ApiTags('Utilisateur')
@Controller('me')
export class UsersController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Profil de l’utilisateur connecté' })
  async me(@CurrentUser() user: AuthUser) {
    const u = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!u) throw new (require('@nestjs/common').NotFoundException)();
    return {
      id: u.id,
      email: u.email,
      pseudo: u.pseudo,
      status: u.status,
      preferredLanguage: u.preferredLanguage,
      theme: u.theme,
      soundEnabled: u.soundEnabled,
      emailVerified: Boolean(u.emailVerifiedAt),
      createdAt: u.createdAt,
      roles: user.roles,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  @ApiOperation({ summary: 'Modifier son profil' })
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    const updated = await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        pseudo: dto.pseudo,
        preferredLanguage: dto.preferredLanguage,
        theme: dto.theme,
        soundEnabled: dto.soundEnabled,
      },
    });
    return { id: updated.id, pseudo: updated.pseudo, preferredLanguage: updated.preferredLanguage, theme: updated.theme, soundEnabled: updated.soundEnabled };
  }

  @UseGuards(JwtAuthGuard)
  @Get('export')
  @ApiOperation({ summary: 'Export RGPD des données personnelles' })
  async exportData(@CurrentUser() user: AuthUser) {
    const [u, submissions, bestScores, lessons, lore] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: user.sub } }),
      this.prisma.submission.findMany({ where: { userId: user.sub } }),
      this.prisma.bestScore.findMany({ where: { userId: user.sub } }),
      this.prisma.lessonProgress.findMany({ where: { userId: user.sub } }),
      this.prisma.loreProgress.findMany({ where: { userId: user.sub } }),
    ]);
    return { user: u, submissions, bestScores, lessonProgress: lessons, loreProgress: lore, exportedAt: new Date() };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiOperation({ summary: 'Lister ses sessions actives' })
  sessions(@CurrentUser() user: AuthUser) {
    return this.prisma.session.findMany({
      where: { userId: user.sub, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, ip: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Révoquer une session spécifique' })
  async revokeSession(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.prisma.session.updateMany({
      where: { id, userId: user.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Suppression logique du compte (30 jours avant effacement définitif)' })
  async deleteAccount(@CurrentUser() user: AuthUser) {
    await this.prisma.user.update({
      where: { id: user.sub },
      data: { status: 'PENDING_DELETION', deletedAt: new Date(), pseudo: `deleted_${user.sub.slice(0, 8)}` },
    });
    await this.auth.logoutAll(user.sub);
  }
}

@Module({ imports: [AuthModule], controllers: [UsersController] })
export class UsersModule {}
