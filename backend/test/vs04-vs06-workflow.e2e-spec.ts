import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('VS-04 through VS-06 plan and execution safety workflow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('enforces authentication, allocation boundaries, owner isolation, and no execution on plan creation', async () => {
    await request(app.getHttpServer()).get('/plans').expect(401);

    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `plan-owner-${Date.now()}@example.test`, password: 'ValidDemoPassword123!' })
      .expect(201);
    const ownerToken = registered.body.access_token as string;

    await request(app.getHttpServer())
      .post('/plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ symbol: 'BTC/USDT', quoteAsset: 'USDT', availableBalance: 1000, allocationPct: 5.01 })
      .expect(400);

    const created = await request(app.getHttpServer())
      .post('/plans')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ symbol: 'BTC/USDT', quoteAsset: 'USDT', availableBalance: 1000, allocationPct: 2 })
      .expect(201);
    expect(created.body.trade_executed).toBe(false);
    expect(created.body.execution_mode).toBe('SIMULATED_ONLY');

    const listed = await request(app.getHttpServer()).get('/plans').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].tranches).toHaveLength(3);
    expect(listed.body[0].tranches.every((tranche: { status: string }) => tranche.status === 'SCHEDULED')).toBe(true);
    const notifications = await request(app.getHttpServer()).get('/notifications').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(notifications.body.some((notification: { event_type: string }) => notification.event_type === 'PLAN_CREATED')).toBe(true);

    const secondUser = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `plan-other-${Date.now()}@example.test`, password: 'ValidDemoPassword123!' })
      .expect(201);
    await request(app.getHttpServer())
      .get(`/plans/${created.body.id}`)
      .set('Authorization', `Bearer ${secondUser.body.access_token}`)
      .expect(404);

    const trades = await request(app.getHttpServer()).get('/trades').set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(trades.body).toEqual([]);
  });

  it('refuses tranche authorization before its scheduled window opens', async () => {
    const registered = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: `schedule-${Date.now()}@example.test`, password: 'ValidDemoPassword123!' })
      .expect(201);
    const token = registered.body.access_token as string;
    const plan = await request(app.getHttpServer())
      .post('/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'ETH/USDT', quoteAsset: 'USDT', availableBalance: 1000, allocationPct: 1 })
      .expect(201);
    const listed = await request(app.getHttpServer()).get('/plans').set('Authorization', `Bearer ${token}`).expect(200);
    const trancheId = listed.body.find((item: { id: string }) => item.id === plan.body.id).tranches[0].id as string;

    await request(app.getHttpServer())
      .post(`/tranches/${trancheId}/authorization-challenge`)
      .set('Authorization', `Bearer ${token}`)
      .send({ deviceId: '00000000-0000-4000-8000-000000000000' })
      .expect(409);
    await request(app.getHttpServer()).get('/trades').set('Authorization', `Bearer ${token}`).expect(200).expect([]);
  });
});
