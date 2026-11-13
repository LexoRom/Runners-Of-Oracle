import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpException,
  Injectable,
  Logger,
  Module,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { hash, verify } from '@node-rs/argon2';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.module';
import { ACCESS_COOKIE, REFRESH_COOKIE, sessionCookieOptions } from '../../common';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyEmailDto } from './auth.dto';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const ACCESS_TTL_MS = 15 * 60 * 1000;

// Mots de passe compromis : en production, vérification contre une liste type
// Have I Been Pwned k-anonymity (§4.1). Ici, garde-fou sur les plus courants.
const WEAK_PASSWORDS = ['password1234', 'motdepasse12', '123456789012', 'qwertyuiop12', 'azertyuiop12'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');
  /** Anti-bruteforce progressif en mémoire (§4.1) — Redis à la vague 2. */
  private readonly attempts = new Map<string, { count: number; until: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async rolesOf(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({ where: { userId }, include: { role: true } });
    return rows.map((r) => r.role.name);
  }

  private async issueSession(user: { id: string; pseudo: string }, userAgent?: string, ip?: string, familyId?: string) {
    const roles = await this.rolesOf(user.id);
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, pseudo: user.pseudo, roles },
      { expiresIn: (process.env.ACCESS_TOKEN_TTL ?? '15m') as any },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: sha256(refreshToken),
        familyId: familyId ?? randomUUID(),
        userAgent: userAgent ?? null,
        ip: ip ?? null,
        expiresAt: new Date(Date.now() + days * 86_400_000),
      },
    });

    return { accessToken, refreshToken, expiresIn: ACCESS_TTL_MS / 1000 };
  }

  async register(dto: RegisterDto) {
    if (WEAK_PASSWORDS.includes(dto.password.toLowerCase())) {
      throw new BadRequestException({ code: 'weak_password', message: 'Ce mot de passe figure parmi les plus compromis' });
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { pseudo: dto.pseudo }] },
    });
    if (existing) {
      throw new ConflictException({ code: 'account_exists', message: 'E-mail ou pseudo déjà utilisé' });
    }

    const passwordHash = await hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        pseudo: dto.pseudo,
        passwordHash,
        status: 'LIMITED',
      },
    });

    const playerRole = await this.prisma.role.findUnique({ where: { name: 'JOUEUR' } });
    if (playerRole) {
      await this.prisma.userRole.create({ data: { userId: user.id, roleId: playerRole.id } });
    }
    await this.prisma.wallet.create({ data: { userId: user.id, balance: 0 } });

    const token = await this.jwt.signAsync({ sub: user.id, type: 'verify' }, { expiresIn: '24h' as any });
    const link = `${process.env.WEB_APP_URL ?? 'http://localhost:5173'}/verify-email?token=${token}`;
    this.logger.log(`[MAIL] Confirmation de compte pour ${user.email} → ${link}`);

    return {
      message: 'Compte créé. Un e-mail de confirmation a été envoyé.',
      status: user.status,
      // En développement uniquement : évite de dépendre du client mail.
      devLink: process.env.NODE_ENV === 'production' ? undefined : link,
    };
  }

  async login(dto: LoginDto, userAgent?: string, ip?: string) {
    const key = dto.identifier.toLowerCase();
    const lock = this.attempts.get(key);
    if (lock && lock.until > Date.now()) {
      throw new HttpException(
        { code: 'too_many_attempts', message: 'Trop de tentatives, réessayez dans quelques minutes' },
        429,
      );
    }

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: key }, { pseudo: dto.identifier }] },
    });

    const passwordOk = user && !user.deletedAt
      ? await verify(user.passwordHash, dto.password).catch(() => false)
      : false;

    if (!passwordOk) {
      const count = (lock?.count ?? 0) + 1;
      const delayMs = count >= 5 ? Math.min(30 * 60_000, 60_000 * 2 ** (count - 5)) : 0;
      this.attempts.set(key, { count, until: Date.now() + delayMs });
      throw new UnauthorizedException({ code: 'invalid_credentials', message: 'Identifiants incorrects' });
    }

    if (user!.status === 'BANNED' || user!.status === 'PENDING_DELETION') {
      throw new ForbiddenException({ code: 'account_disabled', message: 'Ce compte est désactivé' });
    }

    this.attempts.delete(key);
    const tokens = await this.issueSession(user!, userAgent, ip);
    return { ...tokens, user: this.publicUser(user!) };
  }

  async refresh(refreshToken?: string, userAgent?: string, ip?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException({ code: 'no_refresh_token', message: 'Session introuvable' });
    }

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: sha256(refreshToken) },
    });
    if (!session) {
      throw new UnauthorizedException({ code: 'invalid_refresh_token', message: 'Session invalide' });
    }

    // Réutilisation d'un jeton déjà consommé → révocation de toute la famille (§10)
    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({ code: 'token_reuse', message: 'Session compromise, reconnectez-vous' });
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'session_expired', message: 'Session expirée' });
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) throw new UnauthorizedException({ code: 'invalid_session', message: 'Session invalide' });

    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    const tokens = await this.issueSession(user, userAgent ?? session.userAgent ?? undefined, ip, session.familyId);
    return { ...tokens, user: this.publicUser(user) };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.session.updateMany({
        where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { message: 'Déconnecté' };
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { message: 'Toutes les sessions ont été révoquées' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (user) {
      const token = randomBytes(32).toString('base64url');
      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 3_600_000) },
      });
      const link = `${process.env.WEB_APP_URL ?? 'http://localhost:5173'}/reset-password?token=${token}`;
      this.logger.log(`[MAIL] Réinitialisation pour ${user.email} → ${link}`);
    }
    // Réponse identique que l'adresse existe ou non (§4.1)
    return { message: 'Si un compte existe pour cette adresse, un e-mail a été envoyé.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(dto.token) } });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'invalid_token', message: 'Lien invalide ou expiré' });
    }
    if (WEAK_PASSWORDS.includes(dto.password.toLowerCase())) {
      throw new BadRequestException({ code: 'weak_password', message: 'Ce mot de passe est trop courant' });
    }

    const passwordHash = await hash(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    return { message: 'Mot de passe mis à jour. Toutes les sessions ont été révoquées.' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; type: string }>(dto.token);
      if (payload.type !== 'verify') throw new Error('wrong type');
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { emailVerifiedAt: new Date(), status: 'ACTIVE' },
      });
      return { message: 'Adresse e-mail confirmée' };
    } catch {
      throw new BadRequestException({ code: 'invalid_token', message: 'Lien de confirmation invalide ou expiré' });
    }
  }

  publicUser(user: { id: string; email: string; pseudo: string; status: string; preferredLanguage: string; theme: string; soundEnabled: boolean; emailVerifiedAt: Date | null; createdAt: Date }) {
    return {
      id: user.id,
      email: user.email,
      pseudo: user.pseudo,
      status: user.status,
      preferredLanguage: user.preferredLanguage,
      theme: user.theme,
      soundEnabled: user.soundEnabled,
      emailVerified: Boolean(user.emailVerifiedAt),
      createdAt: user.createdAt,
    };
  }
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie(ACCESS_COOKIE, accessToken, sessionCookieOptions(ACCESS_TTL_MS));
    res.cookie(REFRESH_COOKIE, refreshToken, sessionCookieOptions(30 * 86_400_000));
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }

  @Post('register')
  @ApiOperation({ summary: 'Créer un compte (e-mail, pseudo, mot de passe ≥ 12 caractères)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion par e-mail ou pseudo — pose les cookies de session' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, req.headers['user-agent'], req.ip);
    this.setCookies(res, result.accessToken, result.refreshToken);
    const { accessToken: _accessToken, refreshToken: _refreshToken, ...rest } = result;
    return rest;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotation du refresh token (réutilisation = révocation de la famille)' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.refresh(req.cookies?.[REFRESH_COOKIE], req.headers['user-agent'], req.ip);
    this.setCookies(res, result.accessToken, result.refreshToken);
    const { accessToken: _accessToken, refreshToken: _refreshToken, ...rest } = result;
    return rest;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Révoque la session courante' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearCookies(res);
    return result;
  }

  @Post('forgot-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Demande de réinitialisation (jeton à usage unique, 1 heure)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Réinitialise le mot de passe et révoque toutes les sessions' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('verify-email')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirme l’adresse e-mail' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
      signOptions: { issuer: 'codequest' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
