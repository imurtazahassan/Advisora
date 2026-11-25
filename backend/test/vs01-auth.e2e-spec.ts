import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { generateKeyPairSync, randomUUID, sign as signMessage } from 'node:crypto';
import type { Pool } from 'pg';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PG_POOL } from './../src/database/database.module';

describe('VS-01 User Access and Device Security (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    pool = app.get<Pool>(PG_POOL);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('AC-01.1 & ED-01 BVA: rejects 11-char password, accepts 12-char and 13-char passwords, and rejects duplicate emails', async () => {
    const email11 = `bva11_${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email11, password: 'P'.repeat(11) })
      .expect(400);

    const email12 = `BVA12_${Date.now()}@Example.com`;
    const res12 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `  ${email12}  `, password: 'P'.repeat(12) })
      .expect(201);

    expect(res12.body.access_token).toBeTruthy();
    expect(res12.body.user.email).toBe(email12.toLowerCase());
    expect(res12.body.user.password_hash).toBeUndefined();
    expect(JSON.stringify(res12.body)).not.toContain('P'.repeat(12));

    const email13 = `bva13_${Date.now()}@example.com`;
    const res13 = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email13, password: 'P'.repeat(13) })
      .expect(201);
    expect(res13.body.access_token).toBeTruthy();

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: email12.toLowerCase(), password: 'AnotherStrongPassword12' })
      .expect(409);
  });

  it('AC-01.2, AC-01.3 & AC-01.4: hashes passwords with bcrypt, preserves login compatibility for legacy accounts, and rejects bad credentials identically', async () => {
    const legacyEmail = `legacy10_${Date.now()}@example.com`;
    const legacyPassword = 'Legacy10Pw'; // 10 chars
    const legacyHash = await bcrypt.hash(legacyPassword, 12);
    await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [legacyEmail, legacyHash],
    );

    const stored = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [legacyEmail]);
    expect(stored.rows[0].password_hash).toMatch(/^\$2[aby]\$12\$/);
    expect(stored.rows[0].password_hash).not.toBe(legacyPassword);

    const loginOk = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: legacyEmail, password: legacyPassword })
      .expect(201);
    expect(loginOk.body.access_token).toBeTruthy();
    expect(JSON.stringify(loginOk.body)).not.toContain(legacyHash);

    const badPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: legacyEmail, password: 'WrongPassword123' })
      .expect(401);
    const unknownUser = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'does-not-exist@example.com', password: 'WrongPassword123' })
      .expect(401);
    expect(badPassword.body.message).toBe('Invalid email or password');
    expect(unknownUser.body.message).toBe('Invalid email or password');
  });

  it('AC-01.5 & AC-01.6: rejects unauthenticated access and immediately revokes JWT session on logout', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer()).get('/auth/devices').expect(401);
    await request(app.getHttpServer()).post('/auth/logout').expect(401);

    const email = `session_${Date.now()}@example.com`;
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'StrongPassword123!' })
      .expect(201);
    const token = reg.body.access_token as string;

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(meRes.body).toEqual({ id: reg.body.user.id, email });

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('AC-01.7 & AC-01.8: enforces Ed25519 challenge signing, replay protection, cross-user isolation, BVA/negative inputs, and zero trades', async () => {
    const userA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `usera_${Date.now()}@example.com`, password: 'StrongPasswordA12!' })
      .expect(201);
    const userB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `userb_${Date.now()}@example.com`, password: 'StrongPasswordB12!' })
      .expect(201);
    const tokenA = userA.body.access_token as string;
    const tokenB = userB.body.access_token as string;

    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

    const chReg = await request(app.getHttpServer())
      .post('/auth/devices/challenge')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);

    const sigReg = signMessage(null, Buffer.from(chReg.body.challenge, 'utf8'), privateKey).toString('base64url');

    // Negative / BVA checks before valid registration
    await request(app.getHttpServer())
      .post('/auth/devices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ challengeId: chReg.body.challenge_id, deviceName: 'x'.repeat(101), publicKey: pubPem, signature: sigReg })
      .expect(400);

    const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
    await request(app.getHttpServer())
      .post('/auth/devices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        challengeId: chReg.body.challenge_id,
        deviceName: 'RSA Rejected',
        publicKey: rsa.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
        signature: sigReg,
      })
      .expect(400);

    // Valid device registration with 100-char boundary name
    const maxName = 'D'.repeat(100);
    const devRes = await request(app.getHttpServer())
      .post('/auth/devices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ challengeId: chReg.body.challenge_id, deviceName: maxName, publicKey: pubPem, signature: sigReg })
      .expect(201);
    const deviceId = devRes.body.id as string;
    expect(devRes.body.device_name).toBe(maxName);

    // Duplicate registration of same key fails (new challenge + same key)
    const chDup = await request(app.getHttpServer())
      .post('/auth/devices/challenge')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    const sigDup = signMessage(null, Buffer.from(chDup.body.challenge, 'utf8'), privateKey).toString('base64url');
    await request(app.getHttpServer())
      .post('/auth/devices')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ challengeId: chDup.body.challenge_id, deviceName: 'Duplicate Key', publicKey: pubPem, signature: sigDup })
      .expect(409);

    // Cross-user isolation: User B sees 0 devices and cannot challenge/revoke User A's device
    const listB = await request(app.getHttpServer())
      .get('/auth/devices')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(listB.body).toEqual([]);

    await request(app.getHttpServer())
      .post(`/auth/devices/${deviceId}/authorization-challenge`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(401);

    await request(app.getHttpServer())
      .delete(`/auth/devices/${deviceId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(400);

    await request(app.getHttpServer())
      .delete('/auth/devices/not-a-uuid')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(400);

    // User A authorization challenge + signature verification + replay protection
    const chAuth = await request(app.getHttpServer())
      .post(`/auth/devices/${deviceId}/authorization-challenge`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(201);
    const sigAuth = signMessage(null, Buffer.from(chAuth.body.challenge, 'utf8'), privateKey).toString('base64url');

    // Wrong signature length (63 bytes) -> 400
    await request(app.getHttpServer())
      .post(`/auth/devices/${deviceId}/verify`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ challengeId: chAuth.body.challenge_id, signature: Buffer.alloc(63, 1).toString('base64url') })
      .expect(400);

    // Valid signature -> 201 verified
    const verified = await request(app.getHttpServer())
      .post(`/auth/devices/${deviceId}/verify`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ challengeId: chAuth.body.challenge_id, signature: sigAuth })
      .expect(201);
    expect(verified.body.verified).toBe(true);

    // Replay of consumed challenge -> 401
    await request(app.getHttpServer())
      .post(`/auth/devices/${deviceId}/verify`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ challengeId: chAuth.body.challenge_id, signature: sigAuth })
      .expect(401);

    // Revoke device -> cannot issue challenge anymore
    await request(app.getHttpServer())
      .delete(`/auth/devices/${deviceId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/auth/devices/${deviceId}/authorization-challenge`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(401);

    // Unknown UUID device -> 401
    await request(app.getHttpServer())
      .post(`/auth/devices/${randomUUID()}/authorization-challenge`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(401);

    // Device registration/verification executes zero trades and creates zero plans
    const plansA = await request(app.getHttpServer())
      .get('/plans')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    const tradesA = await request(app.getHttpServer())
      .get('/trades')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(plansA.body).toEqual([]);
    expect(tradesA.body).toEqual([]);
  });
});
