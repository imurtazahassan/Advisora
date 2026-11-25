import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { generateKeyPairSync, randomUUID, sign as signMessage } from 'node:crypto';
import type { Pool } from 'pg';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService (VS-01)', () => {
  const users = {
    create: jest.fn(),
    findByEmail: jest.fn(),
  } as unknown as UsersService;
  const jwt = {
    signAsync: jest.fn(),
  } as unknown as JwtService;
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  const pool = {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue(mockClient),
  } as unknown as Pool;
  const service = new AuthService(users, jwt, pool);
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

  beforeEach(() => {
    jest.clearAllMocks();
    (pool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('registration password minimum boundary (ED-01: 12 chars) and login compatibility', () => {
    it('rejects an 11-character registration password (boundary N-1)', async () => {
      await expect(service.register('user@example.com', 'A'.repeat(11))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(users.create).not.toHaveBeenCalled();
    });

    it('accepts a 12-character registration password (boundary N)', async () => {
      (users.create as jest.Mock).mockResolvedValueOnce({ id: 'user-1', email: 'user@example.com' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });
      (jwt.signAsync as jest.Mock).mockResolvedValueOnce('jwt-token');

      const result = await service.register('user@example.com', 'A'.repeat(12));

      expect(result.access_token).toBe('jwt-token');
      expect(result.user).toEqual({ id: 'user-1', email: 'user@example.com' });
      expect(users.create).toHaveBeenCalledWith('user@example.com', 'A'.repeat(12));
    });

    it('accepts a 13-character registration password (boundary N+1)', async () => {
      (users.create as jest.Mock).mockResolvedValueOnce({ id: 'user-2', email: 'user2@example.com' });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });
      (jwt.signAsync as jest.Mock).mockResolvedValueOnce('jwt-token-2');

      const result = await service.register('user2@example.com', 'A'.repeat(13));

      expect(result.access_token).toBe('jwt-token-2');
      expect(users.create).toHaveBeenCalledWith('user2@example.com', 'A'.repeat(13));
    });

    it('rejects non-string passwords and malformed emails on registration', async () => {
      await expect(service.register('invalid-email', 'A'.repeat(12))).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        service.register('user@example.com', ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'] as unknown as string),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('keeps login compatible with pre-existing valid accounts shorter than 12 characters', async () => {
      const legacyPassword = 'Legacy10!!'; // 10 chars
      const passwordHash = await bcrypt.hash(legacyPassword, 4);
      (users.findByEmail as jest.Mock).mockResolvedValueOnce({
        id: 'legacy-user',
        email: 'legacy@example.com',
        password_hash: passwordHash,
      });
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });
      (jwt.signAsync as jest.Mock).mockResolvedValueOnce('legacy-jwt');

      const result = await service.login('legacy@example.com', legacyPassword);

      expect(result.access_token).toBe('legacy-jwt');
      expect(result.user).toEqual({ id: 'legacy-user', email: 'legacy@example.com' });
      expect(JSON.stringify(result)).not.toContain(passwordHash);
    });

    it('rejects wrong password with generic UnauthorizedException', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123', 4);
      (users.findByEmail as jest.Mock).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        password_hash: passwordHash,
      });

      await expect(service.login('user@example.com', 'WrongPassword123')).rejects.toThrow(
        'Invalid email or password',
      );
    });

    it('revokes session on logout', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [] });
      const res = await service.logout('session-1', 'user-1');
      expect(res).toEqual({ success: true });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET revoked_at = NOW()'),
        ['session-1', 'user-1'],
      );
    });
  });

  describe('device registration and Ed25519 proof-of-possession', () => {
    it('registers a valid Ed25519 device using a one-time challenge', async () => {
      const challengeId = randomUUID();
      const challenge = 'registration-challenge-value';
      const signature = signMessage(null, Buffer.from(challenge, 'utf8'), privateKey).toString('base64url');
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ challenge }] });
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: challengeId }] }) // consume challenge
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'dev-1', device_name: 'My Device', key_fingerprint: 'abc', registered_at: new Date() }],
        })
        .mockResolvedValueOnce({}); // COMMIT

      const device = await service.registerDevice('user-1', {
        challengeId,
        deviceName: 'My Device',
        publicKey: publicKeyPem,
        signature,
      });

      expect(device.device_name).toBe('My Device');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('rejects non-Ed25519 public keys and duplicate device registrations', async () => {
      const challengeId = randomUUID();
      const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const rsaPem = rsa.publicKey.export({ type: 'spki', format: 'pem' }).toString();

      await expect(
        service.registerDevice('user-1', {
          challengeId,
          deviceName: 'RSA Device',
          publicKey: rsaPem,
          signature: 'x'.repeat(86),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      const challenge = 'reg-ch';
      const signature = signMessage(null, Buffer.from(challenge, 'utf8'), privateKey).toString('base64url');
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1, rows: [{ challenge }] });
      const dupErr = Object.assign(new Error('duplicate'), { code: '23505' });
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: challengeId }] }) // consume
        .mockRejectedValueOnce(dupErr)
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        service.registerDevice('user-1', {
          challengeId,
          deviceName: 'Dup Device',
          publicKey: publicKeyPem,
          signature,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

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

    it('rejects missing challenge proof fields and malformed device IDs on revocation', async () => {
      await expect(
        service.verifyDeviceAuthorization('user-1', 'device-1', '', ''),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.revokeDevice('user-1', 'not-a-uuid')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
