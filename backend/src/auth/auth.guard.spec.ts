import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
  const pool = { query: jest.fn() } as unknown as Pool;
  const guard = new AuthGuard(jwt, pool);

  function context(authorization?: string): ExecutionContext {
    const request: Record<string, unknown> = { headers: {} };
    if (authorization) (request.headers as Record<string, string>).authorization = authorization;
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => jest.clearAllMocks());

  it('rejects requests without a bearer token', async () => {
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token when its persistent session is revoked or missing', async () => {
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', email: 'a@b.com', sid: 'session-1' });
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });
    await expect(guard.canActivate(context('Bearer token'))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches the authenticated user only for an active persistent session', async () => {
    (jwt.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1', email: 'a@b.com', sid: 'session-1' });
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 1, rows: [{ id: 'session-1' }] });
    const ctx = context('Bearer token');
    expect(await guard.canActivate(ctx)).toBe(true);
    const req = ctx.switchToHttp().getRequest() as { user: { id: string; email: string; sessionId: string } };
    expect(req.user).toEqual({ id: 'user-1', email: 'a@b.com', sessionId: 'session-1' });
  });
});
