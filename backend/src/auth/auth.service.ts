import { BadRequestException, ConflictException, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID, createPublicKey, createHash, verify as verifySignature, KeyObject } from 'node:crypto';
import { Pool } from 'pg';
import { UsersService } from '../users/users.service';
import { PG_POOL } from '../database/database.module';

const SESSION_TTL_MS = 60 * 60 * 1000;
const DEVICE_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const MIN_REGISTRATION_PASSWORD_LENGTH = 12;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService, private readonly jwtService: JwtService, @Inject(PG_POOL) private readonly pool: Pool) {}

  async register(email: string, password: string) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new BadRequestException('A valid email is required');
    }
    if (typeof password !== 'string' || password.length < MIN_REGISTRATION_PASSWORD_LENGTH) {
      throw new BadRequestException(`Password must contain at least ${MIN_REGISTRATION_PASSWORD_LENGTH} characters`);
    }
    const user = await this.usersService.create(email, password);
    return this.createSession(user);
  }

  async login(email: string, password: string) {
    // Login stays compatible with existing valid accounts regardless of updated registration minimums
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      throw new BadRequestException('Email and password are required');
    }
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) throw new UnauthorizedException('Invalid email or password');
    return this.createSession(user);
  }

  private async createSession(user: { id: string; email: string }) {
    const sessionId = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.pool.query('INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)', [sessionId, user.id, expiresAt]);
    const accessToken = await this.jwtService.signAsync({ sub: user.id, email: user.email, sid: sessionId });
    return { access_token: accessToken, token_type: 'Bearer', expires_at: expiresAt.toISOString(), user: { id: user.id, email: user.email } };
  }

  async logout(sessionId: string, userId: string) {
    await this.pool.query('UPDATE user_sessions SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL', [sessionId, userId]);
    return { success: true };
  }

  async createDeviceChallenge(userId: string) {
    const id = randomUUID();
    const challenge = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + DEVICE_CHALLENGE_TTL_MS);
    await this.pool.query('INSERT INTO device_registration_challenges (id, user_id, challenge, expires_at) VALUES ($1, $2, $3, $4)', [id, userId, challenge, expiresAt]);
    return { challenge_id: id, challenge, expires_at: expiresAt.toISOString(), algorithm: 'Ed25519' };
  }

  async registerDevice(userId: string, input: { challengeId: string; deviceName: string; publicKey: string; signature: string }) {
    if (
      typeof input?.challengeId !== 'string' ||
      !UUID_REGEX.test(input.challengeId) ||
      typeof input.deviceName !== 'string' ||
      !input.deviceName.trim() ||
      input.deviceName.trim().length > 100 ||
      typeof input.publicKey !== 'string' ||
      !input.publicKey.trim() ||
      typeof input.signature !== 'string' ||
      !input.signature.trim()
    ) {
      throw new BadRequestException('Valid challenge ID, device name, public key and signature are required');
    }
    let key: KeyObject;
    try { key = createPublicKey(input.publicKey); } catch { throw new BadRequestException('Invalid public key'); }
    if (key.asymmetricKeyType !== 'ed25519') throw new BadRequestException('Only Ed25519 device keys are supported');
    if (!BASE64URL_REGEX.test(input.signature)) {
      throw new BadRequestException('Invalid signature encoding');
    }
    const signature = Buffer.from(input.signature, 'base64url');
    if (signature.length !== 64) {
      throw new BadRequestException('Invalid signature encoding');
    }
    const challengeResult = await this.pool.query('SELECT challenge FROM device_registration_challenges WHERE id = $1 AND user_id = $2 AND consumed_at IS NULL AND expires_at > NOW()', [input.challengeId, userId]);
    if (!challengeResult.rowCount) throw new UnauthorizedException('Registration challenge is invalid, expired or already used');
    const challenge = challengeResult.rows[0].challenge as string;
    if (!verifySignature(null, Buffer.from(challenge, 'utf8'), key, signature)) throw new UnauthorizedException('Device key proof failed');
    const fingerprint = createHash('sha256').update(key.export({ type: 'spki', format: 'der' })).digest('hex');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const consumed = await client.query('UPDATE device_registration_challenges SET consumed_at = NOW() WHERE id = $1 AND user_id = $2 AND consumed_at IS NULL AND expires_at > NOW() RETURNING id', [input.challengeId, userId]);
      if (!consumed.rowCount) throw new UnauthorizedException('Registration challenge was already consumed');
      const inserted = await client.query('INSERT INTO user_devices (user_id, device_name, public_key_pem, key_fingerprint) VALUES ($1, $2, $3, $4) RETURNING id, device_name, key_fingerprint, registered_at', [userId, input.deviceName.trim(), key.export({ type: 'spki', format: 'pem' }), fingerprint]);
      await client.query('COMMIT');
      return inserted.rows[0];
    } catch (error) { await client.query('ROLLBACK'); if ((error as { code?: string }).code === '23505') throw new ConflictException('This device is already registered'); throw error; }
    finally { client.release(); }
  }

  async createDeviceAuthorizationChallenge(userId: string, deviceId: string) {
    if (typeof deviceId !== 'string' || !deviceId.trim()) {
      throw new BadRequestException('Device ID is required');
    }
    const device = await this.pool.query(
      'SELECT id FROM user_devices WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL',
      [deviceId, userId],
    );
    if (!device.rowCount) throw new UnauthorizedException('Active registered device not found');

    const id = randomUUID();
    const challenge = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + DEVICE_CHALLENGE_TTL_MS);
    await this.pool.query(
      `INSERT INTO device_authorization_challenges (id, user_id, device_id, challenge, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, userId, deviceId, challenge, expiresAt],
    );
    return {
      challenge_id: id,
      challenge,
      device_id: deviceId,
      expires_at: expiresAt.toISOString(),
      algorithm: 'Ed25519',
      purpose: 'device-possession-verification',
    };
  }

  async verifyDeviceAuthorization(
    userId: string,
    deviceId: string,
    challengeId: string,
    signatureValue: string,
  ) {
    if (
      typeof deviceId !== 'string' ||
      !deviceId.trim() ||
      typeof challengeId !== 'string' ||
      !challengeId.trim() ||
      typeof signatureValue !== 'string' ||
      !signatureValue.trim()
    ) {
      throw new BadRequestException('Device ID, challenge ID and signature are required');
    }

    const result = await this.pool.query(
      `SELECT c.challenge, d.public_key_pem
       FROM device_authorization_challenges c
       JOIN user_devices d ON d.id = c.device_id AND d.user_id = c.user_id
       WHERE c.id = $1 AND c.user_id = $2 AND c.device_id = $3
         AND c.consumed_at IS NULL AND c.expires_at > NOW()
         AND d.revoked_at IS NULL`,
      [challengeId, userId, deviceId],
    );
    if (!result.rowCount) {
      throw new UnauthorizedException('Device challenge is invalid, expired, consumed or device revoked');
    }

    if (!BASE64URL_REGEX.test(signatureValue)) {
      throw new BadRequestException('Invalid signature encoding');
    }
    const signature = Buffer.from(signatureValue, 'base64url');
    if (signature.length !== 64) {
      throw new BadRequestException('Invalid signature encoding');
    }

    const { challenge, public_key_pem: publicKeyPem } = result.rows[0] as {
      challenge: string;
      public_key_pem: string;
    };
    const publicKey = createPublicKey(publicKeyPem);
    if (!verifySignature(null, Buffer.from(challenge, 'utf8'), publicKey, signature)) {
      throw new UnauthorizedException('Device proof failed');
    }

    const consumed = await this.pool.query(
      `UPDATE device_authorization_challenges c SET consumed_at = NOW()
       FROM user_devices d
       WHERE c.id = $1 AND c.user_id = $2 AND c.device_id = $3
         AND c.consumed_at IS NULL AND c.expires_at > NOW()
         AND d.id = c.device_id AND d.user_id = c.user_id AND d.revoked_at IS NULL
       RETURNING c.id`,
      [challengeId, userId, deviceId],
    );
    if (!consumed.rowCount) {
      throw new UnauthorizedException('Device challenge has already been consumed');
    }

    return { verified: true, device_id: deviceId, verified_at: new Date().toISOString() };
  }

  async listDevices(userId: string) {
    const result = await this.pool.query('SELECT id, device_name, key_fingerprint, registered_at FROM user_devices WHERE user_id = $1 AND revoked_at IS NULL ORDER BY registered_at DESC', [userId]);
    return result.rows;
  }

  async revokeDevice(userId: string, deviceId: string) {
    if (typeof deviceId !== 'string' || !UUID_REGEX.test(deviceId)) {
      throw new BadRequestException('Valid device ID is required');
    }
    const result = await this.pool.query('UPDATE user_devices SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id', [deviceId, userId]);
    if (!result.rowCount) throw new BadRequestException('Active device not found');
    return { success: true };
  }
}
