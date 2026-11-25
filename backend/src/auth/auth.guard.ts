import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';

export interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; sessionId: string };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, @Inject(PG_POOL) private readonly pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Authentication required');
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; sid: string }>(header.slice(7));
      if (!payload?.sub || !payload?.email || !payload?.sid) {
        throw new UnauthorizedException('Invalid session claims');
      }
      const result = await this.pool.query(
        `SELECT s.id FROM user_sessions s JOIN users u ON u.id = s.user_id
         WHERE s.id = $1 AND s.user_id = $2 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
        [payload.sid, payload.sub],
      );
      if (!result.rowCount) throw new UnauthorizedException('Session expired or revoked');
      request.user = { id: payload.sub, email: payload.email, sessionId: payload.sid };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
