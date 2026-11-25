import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { generateKeyPairSync, sign as signMessage } from 'node:crypto';
import { Pool } from 'pg';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService device proof', () => {
  const users = {} as UsersService;
  const jwt = {} as JwtService;
  const pool = { query: jest.fn() } as unknown as Pool;
  const service = new AuthService(users, jwt, pool);
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  beforeEach(() => jest.clearAllMocks());

  it('creates a short-lived challenge only for an active device owned by the user', async () => {
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'device-1' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const response = await service.createDeviceAuthorizationChallenge('user-1', 'device-1');

    expect(response.algorithm).toBe('Ed25519');
    expect(response.device_id).toBe('device-1');
    expect(response.challenge).toBeTruthy();
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO device_authorization_challenges'),
      expect.arrayContaining(['user-1', 'device-1', response.challenge]),
    );
  });

  it('verifies a valid signature and consumes its one-time challenge', async () => {
    const challenge = 'server-generated-one-time-challenge';
    const signature = signMessage(null, Buffer.from(challenge, 'utf8'), privateKey).toString('base64url');
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ challenge, public_key_pem: publicKeyPem }],
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'challenge-1' }] });

    const response = await service.verifyDeviceAuthorization('user-1', 'device-1', 'challenge-1', signature);

    expect(response.verified).toBe(true);
    expect(response.device_id).toBe('device-1');
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE device_authorization_challenges'),
      ['challenge-1', 'user-1', 'device-1'],
    );
  });

  it('rejects a signature that does not match the registered key', async () => {
    const signature = signMessage(null, Buffer.from('different-message'), privateKey).toString('base64url');
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ challenge: 'expected-message', public_key_pem: publicKeyPem }],
    });

    await expect(
      service.verifyDeviceAuthorization('user-1', 'device-1', 'challenge-1', signature),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(pool.query).toHaveBeenCalledTimes(1);
  });

  it('rejects an expired, consumed, revoked or non-owned challenge', async () => {
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(
      service.verifyDeviceAuthorization('user-1', 'device-1', 'challenge-1', 'x'.repeat(86)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects missing challenge proof fields', async () => {
    await expect(
      service.verifyDeviceAuthorization('user-1', 'device-1', '', ''),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
