import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const SENSITIVE = ['password', 'token', 'email', 'refreshToken', 'accessToken', 'secret'];

function mask(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(mask);
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE.some((s) => k.toLowerCase().includes(s))) {
      out[k] = '***';
    } else {
      out[k] = mask(v);
    }
  }
  return out;
}

@Injectable()
export class LogMaskingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    // eslint-disable-next-line no-console
    console.log(`[${req.method}] ${req.url}`, mask(req.body ?? {}));
    return next.handle().pipe(
      tap(() => {
        // eslint-disable-next-line no-console
        // (réponse non loggée pour éviter de fuiter des données)
      }),
    );
  }
}
