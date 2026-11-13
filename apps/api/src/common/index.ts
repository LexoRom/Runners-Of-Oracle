import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  SetMetadata,
  UnauthorizedException,
  CanActivate,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';

/**
 * Format d'erreur unique exigé par le §7 : { code, message, details }
 */
const HTTP_CODES: Record<number, string> = {
  400: 'bad_request',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable_entity',
  429: 'too_many_requests',
  500: 'internal_error',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = 500;
    let code = 'internal_error';
    let message = 'Erreur interne du serveur';
    let details: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = HTTP_CODES[status] ?? 'error';
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const p = payload as Record<string, any>;
        if (typeof p.code === 'string') code = p.code;
        if (Array.isArray(p.message)) {
          message = 'Requête invalide';
          details = p.message;
        } else if (typeof p.message === 'string') {
          message = p.message;
        }
        if (p.details !== undefined) details = p.details;
      }
    } else if (exception instanceof Error) {
      message = 'Erreur interne du serveur';
    }

    if (status >= 500) this.logger.error(exception as Error);

    res.status(status).json({ code, message, details });
  }
}

// ─── RBAC (§3) ───────────────────────────────────────────────────────────────

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  sub: string;
  pseudo: string;
  roles: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    let token: string | undefined = req.cookies?.cq_access;
    const header = req.headers?.authorization;
    if (!token && typeof header === 'string' && header.startsWith('Bearer ')) {
      token = header.slice(7);
    }
    if (!token) {
      throw new UnauthorizedException({ code: 'unauthenticated', message: 'Session requise' });
    }
    try {
      req.user = this.jwt.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException({ code: 'invalid_token', message: 'Session expirée ou invalide' });
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user;
    const roles = user?.roles ?? [];
    if (!required.some((r) => roles.includes(r))) {
      throw new ForbiddenException({ code: 'forbidden', message: 'Droits insuffisants' });
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  return ctx.switchToHttp().getRequest().user;
});

/** Cookies de session (§10) : HttpOnly + SameSite=Lax, Secure en production. */
export const ACCESS_COOKIE = 'cq_access';
export const REFRESH_COOKIE = 'cq_refresh';

export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeMs,
  };
}
