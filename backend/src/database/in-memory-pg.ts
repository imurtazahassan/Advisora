/**
 * DEVELOPMENT / DEMO-ONLY IN-MEMORY POSTGRESQL ADAPTER.
 * PostgreSQL remains the authoritative persistent database architecture (ADR-003).
 * All state stored in this module is volatile and lost on application restart.
 */
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient, QueryResult } from 'pg';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

interface SessionRow {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

interface DeviceRow {
  id: string;
  user_id: string;
  device_name: string;
  public_key_pem: string;
  key_fingerprint: string;
  registered_at: Date;
  revoked_at: Date | null;
}

interface DeviceRegChallengeRow {
  id: string;
  user_id: string;
  challenge: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

interface DeviceAuthChallengeRow {
  id: string;
  user_id: string;
  device_id: string;
  challenge: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

interface MarketAssetRow {
  symbol: string;
  base_asset: string;
  quote_asset: string;
  display_name: string;
  enabled: boolean;
  created_at: Date;
}

interface MarketTickRow {
  id: number;
  symbol: string;
  price: number;
  provider_event_at: Date;
  received_at: Date;
  provider_latency_ms: number;
  source: 'SIMULATED' | 'TEST_FIXTURE';
  created_at: Date;
}

interface AdvisorySignalRow {
  id: string;
  user_id: string;
  symbol: string;
  asset_name: string;
  entry_price: number;
  target_profit_yield_pct: number;
  risk_context: string;
  explanation_en: string;
  explanation_ur: string;
  generated_at: Date;
  expires_at: Date;
  invalidated_at: Date | null;
  invalidation_reason: string | null;
  outcome: 'PENDING' | 'TARGET_REACHED' | 'LOSS_LIMIT_BREACHED' | 'EXPIRED_UNEVALUATED';
  evaluated_at: Date | null;
  created_at: Date;
}

type PlanRow = {
  id: string;
  user_id: string;
  symbol: string;
  signal_id: string | null;
  quote_asset: string;
  available_balance: string;
  allocation_pct: string;
  total_allocation: string;
  tranche_amount: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
  approved_at: Date;
  created_at: Date;
  updated_at: Date;
};

interface TrancheRow {
  id: string;
  plan_id: string;
  tranche_number: number;
  amount: string;
  scheduled_at: Date;
  status: 'SCHEDULED' | 'AUTHORIZATION_OPEN' | 'PAUSED' | 'SKIPPED' | 'CANCELLED' | 'EXECUTED';
  authorization_expires_at: Date | null;
  authorization_challenge: string | null;
  authorization_challenge_id: string | null;
  authorized_at: Date | null;
  executed_at: Date | null;
  created_at: Date;
}

interface SimulatedTradeRow {
  id: string;
  user_id: string;
  plan_id: string;
  tranche_id: string;
  symbol: string;
  quantity: number;
  price: number;
  quote_amount: number;
  executed_at: Date;
  execution_mode: string;
  status: string;
}

interface TrancheAuthChallengeRow {
  id: string;
  user_id: string;
  tranche_id: string;
  device_id: string;
  challenge: string;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

type NotificationRow = {
  id: string;
  user_id: string;
  event_type: string;
  channel: 'IN_APP' | 'WHATSAPP' | 'PUSH';
  payload: unknown;
  status: 'PENDING' | 'ACCEPTED' | 'FAILED';
  provider_message_id: string | null;
  attempts: number;
  last_error: string | null;
  created_at: Date;
  accepted_at: Date | null;
};

interface WatchlistRow {
  user_id: string;
  symbol: string;
  created_at: Date;
}

type JournalRow = {
  id: string;
  user_id: string;
  signal_id: string | null;
  plan_id: string | null;
  title: string;
  body: string;
  created_at: Date;
  updated_at: Date;
};

interface StoreState {
  users: UserRow[];
  user_sessions: SessionRow[];
  user_devices: DeviceRow[];
  device_registration_challenges: DeviceRegChallengeRow[];
  device_authorization_challenges: DeviceAuthChallengeRow[];
  market_assets: MarketAssetRow[];
  market_ticks: MarketTickRow[];
  nextTickId: number;
  advisory_signals: AdvisorySignalRow[];
  investment_plans: PlanRow[];
  investment_tranches: TrancheRow[];
  simulated_trades: SimulatedTradeRow[];
  tranche_authorization_challenges: TrancheAuthChallengeRow[];
  notification_outbox: NotificationRow[];
  user_watchlist: WatchlistRow[];
  investment_journal: JournalRow[];
}

function createInitialState(): StoreState {
  const now = new Date();
  return {
    users: [],
    user_sessions: [],
    user_devices: [],
    device_registration_challenges: [],
    device_authorization_challenges: [],
    market_assets: [
      {
        symbol: 'BTC/USDT',
        base_asset: 'BTC',
        quote_asset: 'USDT',
        display_name: 'Bitcoin',
        enabled: true,
        created_at: now,
      },
      {
        symbol: 'ETH/USDT',
        base_asset: 'ETH',
        quote_asset: 'USDT',
        display_name: 'Ethereum',
        enabled: true,
        created_at: now,
      },
    ],
    market_ticks: [
      {
        id: 1,
        symbol: 'BTC/USDT',
        price: 67500,
        provider_event_at: now,
        received_at: now,
        provider_latency_ms: 0,
        source: 'SIMULATED',
        created_at: now,
      },
      {
        id: 2,
        symbol: 'ETH/USDT',
        price: 3450,
        provider_event_at: now,
        received_at: now,
        provider_latency_ms: 0,
        source: 'SIMULATED',
        created_at: now,
      },
    ],
    nextTickId: 3,
    advisory_signals: [],
    investment_plans: [],
    investment_tranches: [],
    simulated_trades: [],
    tranche_authorization_challenges: [],
    notification_outbox: [],
    user_watchlist: [],
    investment_journal: [],
  };
}

function cloneState(state: StoreState): StoreState {
  return structuredClone(state);
}

function result<T extends Record<string, unknown>>(rows: T[], rowCount?: number): QueryResult<T> {
  return {
    command: 'SELECT',
    rowCount: rowCount ?? rows.length,
    oid: 0,
    fields: [],
    rows,
  };
}

export function createInMemoryPgPool(): Pool {
  let state = createInitialState();

  function executeQuery(target: StoreState, rawSql: string, params: unknown[] = []): QueryResult {
    const sql = rawSql.replace(/\s+/g, ' ').trim();
    const now = new Date();

    if (/^SELECT 1$/i.test(sql)) {
      return result([{ '?column?': 1 }]);
    }

    // Users
    if (/^SELECT id, email, password_hash FROM users WHERE email = \$1/i.test(sql)) {
      const email = String(params[0]);
      const rows = target.users.filter((u) => u.email === email).map((u) => ({
        id: u.id,
        email: u.email,
        password_hash: u.password_hash,
      }));
      return result(rows);
    }

    if (/^INSERT INTO users \(email, password_hash\) VALUES \(\$1, \$2\) RETURNING id, email, created_at/i.test(sql)) {
      const email = String(params[0]);
      if (target.users.some((u) => u.email === email)) {
        const err = new Error('duplicate key value violates unique constraint') as Error & { code: string };
        err.code = '23505';
        throw err;
      }
      const user: UserRow = {
        id: randomUUID(),
        email,
        password_hash: String(params[1]),
        created_at: now,
        updated_at: now,
      };
      target.users.push(user);
      return result([{ id: user.id, email: user.email, created_at: user.created_at }]);
    }

    // Sessions & AuthGuard
    if (/^INSERT INTO user_sessions \(id, user_id, expires_at\) VALUES \(\$1, \$2, \$3\)/i.test(sql)) {
      target.user_sessions.push({
        id: String(params[0]),
        user_id: String(params[1]),
        created_at: now,
        expires_at: new Date(params[2] as string | Date),
        revoked_at: null,
      });
      return result([], 1);
    }

    if (/^SELECT s\.id FROM user_sessions s JOIN users u ON u\.id = s\.user_id/i.test(sql)) {
      const [sid, userId] = [String(params[0]), String(params[1])];
      const rows = target.user_sessions
        .filter(
          (s) =>
            s.id === sid &&
            s.user_id === userId &&
            s.revoked_at === null &&
            s.expires_at.getTime() > now.getTime() &&
            target.users.some((u) => u.id === s.user_id),
        )
        .map((s) => ({ id: s.id }));
      return result(rows);
    }

    if (/^UPDATE user_sessions SET revoked_at = NOW\(\) WHERE id = \$1 AND user_id = \$2 AND revoked_at IS NULL/i.test(sql)) {
      const [sid, userId] = [String(params[0]), String(params[1])];
      let count = 0;
      for (const s of target.user_sessions) {
        if (s.id === sid && s.user_id === userId && s.revoked_at === null) {
          s.revoked_at = now;
          count++;
        }
      }
      return result([], count);
    }

    // Device registration challenges
    if (/^INSERT INTO device_registration_challenges/i.test(sql)) {
      target.device_registration_challenges.push({
        id: String(params[0]),
        user_id: String(params[1]),
        challenge: String(params[2]),
        expires_at: new Date(params[3] as string | Date),
        consumed_at: null,
        created_at: now,
      });
      return result([], 1);
    }

    if (/^SELECT challenge FROM device_registration_challenges WHERE id = \$1 AND user_id = \$2/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      const rows = target.device_registration_challenges
        .filter((c) => c.id === id && c.user_id === userId && c.consumed_at === null && c.expires_at.getTime() > now.getTime())
        .map((c) => ({ challenge: c.challenge }));
      return result(rows);
    }

    if (/^UPDATE device_registration_challenges SET consumed_at = NOW\(\)/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      const rows: Array<{ id: string }> = [];
      for (const c of target.device_registration_challenges) {
        if (c.id === id && c.user_id === userId && c.consumed_at === null && c.expires_at.getTime() > now.getTime()) {
          c.consumed_at = now;
          rows.push({ id: c.id });
        }
      }
      return result(rows);
    }

    // User devices
    if (/^INSERT INTO user_devices/i.test(sql)) {
      const [userId, deviceName, publicKeyPem, fingerprint] = [
        String(params[0]),
        String(params[1]),
        String(params[2]),
        String(params[3]),
      ];
      if (target.user_devices.some((d) => d.user_id === userId && d.key_fingerprint === fingerprint)) {
        const err = new Error('duplicate key value violates unique constraint') as Error & { code: string };
        err.code = '23505';
        throw err;
      }
      const dev: DeviceRow = {
        id: randomUUID(),
        user_id: userId,
        device_name: deviceName,
        public_key_pem: publicKeyPem,
        key_fingerprint: fingerprint,
        registered_at: now,
        revoked_at: null,
      };
      target.user_devices.push(dev);
      return result([
        {
          id: dev.id,
          device_name: dev.device_name,
          key_fingerprint: dev.key_fingerprint,
          registered_at: dev.registered_at,
        },
      ]);
    }

    if (/^SELECT id FROM user_devices WHERE id = \$1 AND user_id = \$2 AND revoked_at IS NULL/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      const rows = target.user_devices
        .filter((d) => d.id === id && d.user_id === userId && d.revoked_at === null)
        .map((d) => ({ id: d.id }));
      return result(rows);
    }

    if (/^SELECT id, device_name, key_fingerprint, registered_at FROM user_devices/i.test(sql)) {
      const userId = String(params[0]);
      const rows = target.user_devices
        .filter((d) => d.user_id === userId && d.revoked_at === null)
        .sort((a, b) => b.registered_at.getTime() - a.registered_at.getTime())
        .map((d) => ({
          id: d.id,
          device_name: d.device_name,
          key_fingerprint: d.key_fingerprint,
          registered_at: d.registered_at,
        }));
      return result(rows);
    }

    if (/^UPDATE user_devices SET revoked_at = NOW\(\)/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      const rows: Array<{ id: string }> = [];
      for (const d of target.user_devices) {
        if (d.id === id && d.user_id === userId && d.revoked_at === null) {
          d.revoked_at = now;
          rows.push({ id: d.id });
        }
      }
      return result(rows);
    }

    // Device authorization challenges
    if (/^INSERT INTO device_authorization_challenges/i.test(sql)) {
      target.device_authorization_challenges.push({
        id: String(params[0]),
        user_id: String(params[1]),
        device_id: String(params[2]),
        challenge: String(params[3]),
        expires_at: new Date(params[4] as string | Date),
        consumed_at: null,
        created_at: now,
      });
      return result([], 1);
    }

    if (/^SELECT c\.challenge, d\.public_key_pem FROM device_authorization_challenges c/i.test(sql)) {
      const [challengeId, userId, deviceId] = [String(params[0]), String(params[1]), String(params[2])];
      const ch = target.device_authorization_challenges.find(
        (c) =>
          c.id === challengeId &&
          c.user_id === userId &&
          c.device_id === deviceId &&
          c.consumed_at === null &&
          c.expires_at.getTime() > now.getTime(),
      );
      if (!ch) return result([]);
      const dev = target.user_devices.find(
        (d) => d.id === ch.device_id && d.user_id === ch.user_id && d.revoked_at === null,
      );
      if (!dev) return result([]);
      return result([{ challenge: ch.challenge, public_key_pem: dev.public_key_pem }]);
    }

    if (/^UPDATE device_authorization_challenges c SET consumed_at = NOW\(\)/i.test(sql)) {
      const [challengeId, userId, deviceId] = [String(params[0]), String(params[1]), String(params[2])];
      const ch = target.device_authorization_challenges.find(
        (c) =>
          c.id === challengeId &&
          c.user_id === userId &&
          c.device_id === deviceId &&
          c.consumed_at === null &&
          c.expires_at.getTime() > now.getTime(),
      );
      const dev = ch
        ? target.user_devices.find((d) => d.id === ch.device_id && d.user_id === ch.user_id && d.revoked_at === null)
        : undefined;
      if (!ch || !dev) return result([]);
      ch.consumed_at = now;
      return result([{ id: ch.id }]);
    }

    // Market data
    if (/^INSERT INTO market_ticks/i.test(sql)) {
      const symbol = String(params[0]);
      const asset = target.market_assets.find((a) => a.symbol === symbol && a.enabled);
      if (!asset) return result([]);
      const tick: MarketTickRow = {
        id: target.nextTickId++,
        symbol: asset.symbol,
        price: Number(params[1]),
        provider_event_at: new Date(params[2] as string | Date),
        received_at: new Date(params[3] as string | Date),
        provider_latency_ms: Number(params[4]),
        source: params[5] as 'SIMULATED' | 'TEST_FIXTURE',
        created_at: now,
      };
      target.market_ticks.push(tick);
      return result([{ id: tick.id }]);
    }

    const latestTick = (symbol: string): MarketTickRow | undefined => {
      const matching = target.market_ticks.filter((t) => t.symbol === symbol);
      matching.sort((a, b) => b.received_at.getTime() - a.received_at.getTime() || b.id - a.id);
      return matching[0];
    };

    if (/^SELECT a\.symbol, a\.base_asset, a\.quote_asset, a\.display_name, a\.enabled/i.test(sql)) {
      const rows = target.market_assets
        .filter((a) => a.enabled)
        .sort((a, b) => a.symbol.localeCompare(b.symbol))
        .map((a) => {
          const t = latestTick(a.symbol);
          return {
            symbol: a.symbol,
            base_asset: a.base_asset,
            quote_asset: a.quote_asset,
            display_name: a.display_name,
            enabled: a.enabled,
            price: t ? String(t.price) : null,
            provider_event_at: t ? t.provider_event_at : null,
            received_at: t ? t.received_at : null,
            provider_latency_ms: t ? t.provider_latency_ms : null,
            source: t ? t.source : null,
          };
        });
      return result(rows);
    }

    if (/^SELECT a\.symbol, a\.display_name, t\.price::text AS price/i.test(sql)) {
      const symbol = String(params[0]);
      const asset = target.market_assets.find((a) => a.symbol === symbol && a.enabled);
      if (!asset) return result([]);
      const t = latestTick(asset.symbol);
      return result([
        {
          symbol: asset.symbol,
          display_name: asset.display_name,
          price: t ? String(t.price) : null,
          received_at: t ? t.received_at : null,
          provider_latency_ms: t ? t.provider_latency_ms : null,
          enabled: asset.enabled,
        },
      ]);
    }

    if (/^SELECT symbol, quote_asset FROM market_assets WHERE symbol=\$1 AND enabled=TRUE/i.test(sql)) {
      const symbol = String(params[0]);
      const rows = target.market_assets
        .filter((a) => a.symbol === symbol && a.enabled)
        .map((a) => ({ symbol: a.symbol, quote_asset: a.quote_asset }));
      return result(rows);
    }

    if (/^SELECT symbol FROM market_assets WHERE symbol=\$1 AND enabled=TRUE/i.test(sql)) {
      const symbol = String(params[0]);
      const rows = target.market_assets.filter((a) => a.symbol === symbol && a.enabled).map((a) => ({ symbol: a.symbol }));
      return result(rows);
    }

    // Advisory signals
    if (/^UPDATE advisory_signals SET outcome = 'EXPIRED_UNEVALUATED'/i.test(sql)) {
      const userId = String(params[0]);
      let count = 0;
      for (const s of target.advisory_signals) {
        if (s.user_id === userId && s.outcome === 'PENDING' && s.expires_at.getTime() <= now.getTime()) {
          s.outcome = 'EXPIRED_UNEVALUATED';
          s.evaluated_at = now;
          count++;
        }
      }
      return result([], count);
    }

    if (/^SELECT id, symbol, asset_name, entry_price::text/i.test(sql)) {
      const userId = String(params[0]);
      const rows = target.advisory_signals
        .filter((s) => s.user_id === userId)
        .sort((a, b) => b.generated_at.getTime() - a.generated_at.getTime())
        .slice(0, 100)
        .map((s) => ({
          ...s,
          entry_price: String(s.entry_price),
          target_profit_yield_pct: String(s.target_profit_yield_pct),
        }));
      return result(rows);
    }

    if (/^SELECT COUNT\(\*\)::int AS sample_size/i.test(sql)) {
      const userId = String(params[0]);
      const cutoff = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      const evaluated = target.advisory_signals.filter(
        (s) =>
          s.user_id === userId &&
          s.generated_at.getTime() >= cutoff &&
          ['TARGET_REACHED', 'LOSS_LIMIT_BREACHED', 'EXPIRED_UNEVALUATED'].includes(s.outcome),
      );
      const successful = evaluated.filter((s) => s.outcome === 'TARGET_REACHED').length;
      const earliest = evaluated.length
        ? new Date(Math.min(...evaluated.map((s) => s.generated_at.getTime())))
        : null;
      return result([{ sample_size: evaluated.length, successful, earliest_signal: earliest }]);
    }

    if (/^SELECT id FROM advisory_signals WHERE id=\$1 AND user_id=\$2 AND symbol=\$3/i.test(sql)) {
      const [id, userId, symbol] = [String(params[0]), String(params[1]), String(params[2])];
      const rows = target.advisory_signals
        .filter(
          (s) =>
            s.id === id &&
            s.user_id === userId &&
            s.symbol === symbol &&
            s.invalidated_at === null &&
            s.expires_at.getTime() > now.getTime(),
        )
        .map((s) => ({ id: s.id }));
      return result(rows);
    }

    if (/^SELECT id FROM advisory_signals WHERE id=\$1 AND user_id=\$2$/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      return result(target.advisory_signals.filter((s) => s.id === id && s.user_id === userId).map((s) => ({ id: s.id })));
    }

    if (/^UPDATE advisory_signals SET invalidated_at=NOW\(\)/i.test(sql)) {
      const id = String(params[0]);
      let count = 0;
      for (const s of target.advisory_signals) {
        if (s.id === id && s.invalidated_at === null) {
          s.invalidated_at = now;
          s.invalidation_reason = 'UPWARD_PRICE_SHIFT_GT_2_PERCENT';
          count++;
        }
      }
      return result([], count);
    }

    // Investment plans & tranches
    if (/^INSERT INTO investment_plans\(/i.test(sql)) {
      const availableBalance = Number(params[4]);
      const allocationPct = Number(params[5]);
      const totalAllocation = Number(params[6]);
      const trancheAmount = Number(params[7]);
      if (
        !(availableBalance > 0) ||
        !(allocationPct > 0 && allocationPct <= 5) ||
        !(totalAllocation > 0) ||
        !(trancheAmount > 0)
      ) {
        throw new Error('new row for relation "investment_plans" violates check constraint');
      }
      const plan: PlanRow = {
        id: randomUUID(),
        user_id: String(params[0]),
        symbol: String(params[1]),
        signal_id: typeof params[2] === 'string' && params[2] ? params[2] : null,
        quote_asset: String(params[3]),
        available_balance: String(params[4]),
        allocation_pct: String(params[5]),
        total_allocation: String(params[6]),
        tranche_amount: String(params[7]),
        status: 'ACTIVE',
        approved_at: now,
        created_at: now,
        updated_at: now,
      };
      target.investment_plans.push(plan);
      return result([plan]);
    }

    if (/^INSERT INTO investment_tranches\(/i.test(sql)) {
      const planId = String(params[0]);
      const trancheNumber = Number(params[1]);
      const amount = Number(params[2]);
      if (trancheNumber < 1 || trancheNumber > 3 || !(amount > 0)) {
        throw new Error('new row for relation "investment_tranches" violates check constraint');
      }
      if (target.investment_tranches.some((t) => t.plan_id === planId && t.tranche_number === trancheNumber)) {
        const err = new Error('duplicate key value violates unique constraint') as Error & { code: string };
        err.code = '23505';
        throw err;
      }
      target.investment_tranches.push({
        id: randomUUID(),
        plan_id: planId,
        tranche_number: trancheNumber,
        amount: String(params[2]),
        scheduled_at: new Date(params[3] as string | Date),
        status: 'SCHEDULED',
        authorization_expires_at: null,
        authorization_challenge: null,
        authorization_challenge_id: null,
        authorized_at: null,
        executed_at: null,
        created_at: now,
      });
      return result([], 1);
    }

    if (/^SELECT p\.\*, \(SELECT json_agg\(json_build_object/i.test(sql)) {
      const userId = String(params[0]);
      const rows = target.investment_plans
        .filter((p) => p.user_id === userId)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .map((p) => ({
          ...p,
          tranches: target.investment_tranches
            .filter((t) => t.plan_id === p.id)
            .sort((a, b) => a.tranche_number - b.tranche_number)
            .map((t) => ({
              id: t.id,
              tranche_number: t.tranche_number,
              amount: t.amount,
              scheduled_at: t.scheduled_at,
              status: t.status,
            })),
        }));
      return result(rows);
    }

    if (/^SELECT p\.\*, \(SELECT json_agg\(to_jsonb\(t\)/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      const rows = target.investment_plans
        .filter((p) => p.id === id && p.user_id === userId)
        .map((p) => ({
          ...p,
          tranches: target.investment_tranches
            .filter((t) => t.plan_id === p.id)
            .sort((a, b) => a.tranche_number - b.tranche_number),
        }));
      return result(rows);
    }

    if (/^SELECT id,status FROM investment_plans WHERE id=\$1 AND user_id=\$2 FOR UPDATE/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      return result(
        target.investment_plans.filter((p) => p.id === id && p.user_id === userId).map((p) => ({ id: p.id, status: p.status })),
      );
    }

    if (/^SELECT \* FROM investment_plans WHERE id=\$1 AND user_id=\$2 FOR UPDATE/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      return result(target.investment_plans.filter((p) => p.id === id && p.user_id === userId));
    }

    if (/^SELECT id FROM investment_plans WHERE id=\$1 AND user_id=\$2$/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      return result(target.investment_plans.filter((p) => p.id === id && p.user_id === userId).map((p) => ({ id: p.id })));
    }

    if (/^UPDATE investment_plans SET status='(CANCELLED|PAUSED|ACTIVE)',updated_at=NOW\(\) WHERE id=\$1$/i.test(sql)) {
      const match = sql.match(/status='(CANCELLED|PAUSED|ACTIVE)'/i);
      const nextStatus = match![1] as PlanRow['status'];
      const id = String(params[0]);
      let count = 0;
      for (const p of target.investment_plans) {
        if (p.id === id) {
          p.status = nextStatus;
          p.updated_at = now;
          count++;
        }
      }
      return result([], count);
    }

    if (/^UPDATE investment_tranches SET status='CANCELLED'/i.test(sql)) {
      const planId = String(params[0]);
      let count = 0;
      for (const t of target.investment_tranches) {
        if (t.plan_id === planId && !['EXECUTED', 'SKIPPED', 'CANCELLED'].includes(t.status)) {
          t.status = 'CANCELLED';
          t.authorization_expires_at = null;
          t.authorization_challenge = null;
          count++;
        }
      }
      return result([], count);
    }

    if (/^UPDATE investment_tranches SET status='PAUSED'/i.test(sql)) {
      const planId = String(params[0]);
      let count = 0;
      for (const t of target.investment_tranches) {
        if (t.plan_id === planId && ['SCHEDULED', 'AUTHORIZATION_OPEN'].includes(t.status)) {
          t.status = 'PAUSED';
          t.authorization_expires_at = null;
          t.authorization_challenge = null;
          count++;
        }
      }
      return result([], count);
    }

    if (/^WITH skipped AS \( UPDATE investment_tranches SET status='SKIPPED' WHERE plan_id=\$1 AND status='PAUSED'/i.test(sql)) {
      const [planId, userId] = [String(params[0]), String(params[1])];
      let count = 0;
      for (const t of target.investment_tranches) {
        if (t.plan_id === planId && t.status === 'PAUSED' && t.scheduled_at.getTime() <= now.getTime()) {
          t.status = 'SKIPPED';
          target.notification_outbox.push({
            id: randomUUID(),
            user_id: userId,
            event_type: 'TRANCHE_SKIPPED_MISSED',
            channel: 'IN_APP',
            payload: { plan_id: planId, tranche_id: t.id, tranche_number: t.tranche_number, reason: 'MISSED_WHILE_PLAN_PAUSED' },
            status: 'PENDING',
            provider_message_id: null,
            attempts: 0,
            last_error: null,
            created_at: now,
            accepted_at: null,
          });
          count++;
        }
      }
      return result([], count);
    }

    if (/^WITH future AS \(/i.test(sql)) {
      const planId = String(params[0]);
      const futureTranches = target.investment_tranches
        .filter((t) => t.plan_id === planId && t.status === 'PAUSED' && t.scheduled_at.getTime() > now.getTime())
        .sort((a, b) => a.tranche_number - b.tranche_number);
      futureTranches.forEach((t, idx) => {
        t.status = 'SCHEDULED';
        t.scheduled_at = new Date(now.getTime() + (idx + 1) * 24 * 60 * 60 * 1000);
      });
      return result([], futureTranches.length);
    }

    // Notification outbox inserts
    if (/^INSERT INTO notification_outbox\(user_id,event_type,channel,payload\) VALUES\(\$1,'([^']+)','IN_APP',\$2::jsonb\)/i.test(sql)) {
      const match = sql.match(/VALUES\(\$1,'([^']+)','IN_APP'/i);
      const eventType = match![1];
      target.notification_outbox.push({
        id: randomUUID(),
        user_id: String(params[0]),
        event_type: eventType,
        channel: 'IN_APP',
        payload: JSON.parse(String(params[1])),
        status: 'PENDING',
        provider_message_id: null,
        attempts: 0,
        last_error: null,
        created_at: now,
        accepted_at: null,
      });
      return result([], 1);
    }

    if (/^INSERT INTO notification_outbox\(user_id,event_type,channel,payload\) VALUES\(\$1,\$2,'IN_APP',\$3::jsonb\)/i.test(sql)) {
      target.notification_outbox.push({
        id: randomUUID(),
        user_id: String(params[0]),
        event_type: String(params[1]),
        channel: 'IN_APP',
        payload: JSON.parse(String(params[2])),
        status: 'PENDING',
        provider_message_id: null,
        attempts: 0,
        last_error: null,
        created_at: now,
        accepted_at: null,
      });
      return result([], 1);
    }

    // Scheduler queries (advanceAll + tick)
    if (/^WITH due AS \( UPDATE investment_tranches t SET status='AUTHORIZATION_OPEN'/i.test(sql)) {
      const filterUserId = params.length > 0 ? String(params[0]) : null;
      const insertedIds: Array<{ id: string }> = [];
      for (const t of target.investment_tranches) {
        const plan = target.investment_plans.find((p) => p.id === t.plan_id);
        if (!plan || plan.status !== 'ACTIVE') continue;
        if (filterUserId && plan.user_id !== filterUserId) continue;
        const winEnd = t.scheduled_at.getTime() + 60_000;
        if (t.status === 'SCHEDULED' && t.scheduled_at.getTime() <= now.getTime() && winEnd >= now.getTime()) {
          t.status = 'AUTHORIZATION_OPEN';
          t.authorization_expires_at = new Date(winEnd);
          const notifId = randomUUID();
          target.notification_outbox.push({
            id: notifId,
            user_id: plan.user_id,
            event_type: 'TRANCHE_AUTHORIZATION_OPEN',
            channel: 'IN_APP',
            payload: {
              plan_id: plan.id,
              tranche_id: t.id,
              tranche_number: t.tranche_number,
              expires_at: t.authorization_expires_at,
              expires_in_seconds: Math.max(0, Math.ceil((winEnd - now.getTime()) / 1000)),
            },
            status: 'PENDING',
            provider_message_id: null,
            attempts: 0,
            last_error: null,
            created_at: now,
            accepted_at: null,
          });
          insertedIds.push({ id: notifId });
        }
      }
      return result(insertedIds);
    }

    if (/^WITH skipped AS \( UPDATE investment_tranches t SET status='SKIPPED' FROM investment_plans p/i.test(sql)) {
      const filterUserId = params.length > 0 ? String(params[0]) : null;
      const insertedIds: Array<{ id: string }> = [];
      for (const t of target.investment_tranches) {
        const plan = target.investment_plans.find((p) => p.id === t.plan_id);
        if (!plan || plan.status !== 'ACTIVE') continue;
        if (filterUserId && plan.user_id !== filterUserId) continue;
        if (t.status === 'SCHEDULED' && t.scheduled_at.getTime() + 60_000 < now.getTime()) {
          t.status = 'SKIPPED';
          const notifId = randomUUID();
          target.notification_outbox.push({
            id: notifId,
            user_id: plan.user_id,
            event_type: 'TRANCHE_SKIPPED_MISSED',
            channel: 'IN_APP',
            payload: {
              tranche_id: t.id,
              tranche_number: t.tranche_number,
              reason: 'SCHEDULED_WINDOW_MISSED',
            },
            status: 'PENDING',
            provider_message_id: null,
            attempts: 0,
            last_error: null,
            created_at: now,
            accepted_at: null,
          });
          insertedIds.push({ id: notifId });
        }
      }
      return result(insertedIds);
    }

    if (/^WITH skipped AS \( UPDATE investment_tranches t SET status='SKIPPED',authorization_expires_at=NULL/i.test(sql)) {
      const filterUserId = params.length > 0 ? String(params[0]) : null;
      const insertedIds: Array<{ id: string }> = [];
      for (const t of target.investment_tranches) {
        const plan = target.investment_plans.find((p) => p.id === t.plan_id);
        if (!plan) continue;
        if (filterUserId && plan.user_id !== filterUserId) continue;
        if (t.status === 'AUTHORIZATION_OPEN' && t.authorization_expires_at && t.authorization_expires_at.getTime() < now.getTime()) {
          t.status = 'SKIPPED';
          t.authorization_expires_at = null;
          const notifId = randomUUID();
          target.notification_outbox.push({
            id: notifId,
            user_id: plan.user_id,
            event_type: 'TRANCHE_SKIPPED_EXPIRED',
            channel: 'IN_APP',
            payload: {
              tranche_id: t.id,
              tranche_number: t.tranche_number,
              reason: 'AUTHORIZATION_WINDOW_EXPIRED',
            },
            status: 'PENDING',
            provider_message_id: null,
            attempts: 0,
            last_error: null,
            created_at: now,
            accepted_at: null,
          });
          insertedIds.push({ id: notifId });
        }
      }
      return result(insertedIds);
    }

    // Execution challenge & authorize
    if (/^SELECT t\.id,t\.status,t\.authorization_expires_at,p\.status plan_status,p\.symbol/i.test(sql)) {
      const [trancheId, userId] = [String(params[0]), String(params[1])];
      const t = target.investment_tranches.find((x) => x.id === trancheId);
      const p = t ? target.investment_plans.find((x) => x.id === t.plan_id && x.user_id === userId) : undefined;
      if (!t || !p) return result([]);
      return result([
        {
          id: t.id,
          status: t.status,
          authorization_expires_at: t.authorization_expires_at,
          plan_status: p.status,
          symbol: p.symbol,
        },
      ]);
    }

    if (/^INSERT INTO tranche_authorization_challenges/i.test(sql)) {
      target.tranche_authorization_challenges.push({
        id: String(params[0]),
        user_id: String(params[1]),
        tranche_id: String(params[2]),
        device_id: String(params[3]),
        challenge: String(params[4]),
        expires_at: new Date(params[5] as string | Date),
        consumed_at: null,
        created_at: now,
      });
      return result([], 1);
    }

    if (/^SELECT c\.id challenge_id,c\.challenge/i.test(sql)) {
      const [challengeId, userId, trancheId, deviceId] = [
        String(params[0]),
        String(params[1]),
        String(params[2]),
        String(params[3]),
      ];
      const c = target.tranche_authorization_challenges.find(
        (x) =>
          x.id === challengeId &&
          x.user_id === userId &&
          x.tranche_id === trancheId &&
          x.device_id === deviceId &&
          x.consumed_at === null &&
          x.expires_at.getTime() >= now.getTime(),
      );
      if (!c) return result([]);
      const d = target.user_devices.find((x) => x.id === c.device_id && x.user_id === c.user_id && x.revoked_at === null);
      const t = target.investment_tranches.find((x) => x.id === c.tranche_id);
      const p = t ? target.investment_plans.find((x) => x.id === t.plan_id) : undefined;
      if (!d || !t || !p) return result([]);
      const s = p.signal_id
        ? target.advisory_signals.find((x) => x.id === p.signal_id && x.user_id === p.user_id)
        : undefined;
      const m = latestTick(p.symbol);
      if (!m) return result([]);
      return result([
        {
          challenge_id: c.id,
          challenge: c.challenge,
          challenge_expiry: c.expires_at,
          public_key_pem: d.public_key_pem,
          tranche_id: t.id,
          amount: t.amount,
          tranche_status: t.status,
          authorization_expires_at: t.authorization_expires_at,
          plan_id: p.id,
          symbol: p.symbol,
          plan_status: p.status,
          signal_id: p.signal_id,
          signal_entry_price: s ? String(s.entry_price) : null,
          signal_expires_at: s ? s.expires_at : null,
          signal_invalidated_at: s ? s.invalidated_at : null,
          price: String(m.price),
          received_at: m.received_at,
          provider_latency_ms: m.provider_latency_ms,
        },
      ]);
    }

    if (/^UPDATE tranche_authorization_challenges SET consumed_at=NOW\(\)/i.test(sql)) {
      const challengeId = String(params[0]);
      const c = target.tranche_authorization_challenges.find(
        (x) => x.id === challengeId && x.consumed_at === null && x.expires_at.getTime() >= now.getTime(),
      );
      if (!c) return result([]);
      c.consumed_at = now;
      return result([{ id: c.id }]);
    }

    if (/^(UPDATE|DELETE)\s+(FROM\s+)?simulated_trades\b/i.test(sql)) {
      throw new Error('Executed trade ledger is append-only');
    }

    if (/^INSERT INTO simulated_trades/i.test(sql)) {
      const trancheId = String(params[2]);
      const quantity = Number(params[4]);
      const price = Number(params[5]);
      const quoteAmount = Number(params[6]);
      if (!(quantity > 0) || !(price > 0) || !(quoteAmount > 0)) {
        throw new Error('new row for relation "simulated_trades" violates check constraint');
      }
      if (target.simulated_trades.some((t) => t.tranche_id === trancheId)) {
        const err = new Error('duplicate key value violates unique constraint') as Error & { code: string };
        err.code = '23505';
        throw err;
      }
      target.simulated_trades.push({
        id: randomUUID(),
        user_id: String(params[0]),
        plan_id: String(params[1]),
        tranche_id: trancheId,
        symbol: String(params[3]),
        quantity,
        price,
        quote_amount: quoteAmount,
        executed_at: now,
        execution_mode: 'SIMULATED',
        status: 'CONFIRMED',
      });
      return result([], 1);
    }

    if (/^UPDATE investment_tranches SET status='EXECUTED'/i.test(sql)) {
      const trancheId = String(params[0]);
      let count = 0;
      for (const t of target.investment_tranches) {
        if (t.id === trancheId) {
          t.status = 'EXECUTED';
          t.authorized_at = now;
          t.executed_at = now;
          count++;
        }
      }
      return result([], count);
    }

    if (/^UPDATE investment_plans SET status='COMPLETED'/i.test(sql)) {
      const planId = String(params[0]);
      const hasOpen = target.investment_tranches.some(
        (t) => t.plan_id === planId && ['SCHEDULED', 'AUTHORIZATION_OPEN', 'PAUSED'].includes(t.status),
      );
      if (hasOpen) return result([], 0);
      let count = 0;
      for (const p of target.investment_plans) {
        if (p.id === planId) {
          p.status = 'COMPLETED';
          p.updated_at = now;
          count++;
        }
      }
      return result([], count);
    }

    // Trades query
    if (/^SELECT t\.id,t\.plan_id,t\.tranche_id,t\.symbol/i.test(sql)) {
      const [userId, from, to] = [String(params[0]), params[1] as string | null, params[2] as string | null];
      const rows = target.simulated_trades
        .filter((t) => {
          if (t.user_id !== userId) return false;
          if (from && t.executed_at < new Date(`${from}T00:00:00.000Z`)) return false;
          if (to && t.executed_at >= new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000)) return false;
          return true;
        })
        .sort((a, b) => b.executed_at.getTime() - a.executed_at.getTime())
        .map((t) => {
          const asset = target.market_assets.find((a) => a.symbol === t.symbol);
          return {
            id: t.id,
            plan_id: t.plan_id,
            tranche_id: t.tranche_id,
            symbol: t.symbol,
            asset_name: asset?.display_name ?? t.symbol,
            quantity: String(t.quantity),
            price: String(t.price),
            quote_amount: String(t.quote_amount),
            executed_at: t.executed_at,
            execution_mode: t.execution_mode,
            status: t.status,
          };
        });
      return result(rows);
    }

    // Watchlist
    if (/^SELECT a\.symbol,a\.display_name,t\.price::text price/i.test(sql)) {
      const userId = String(params[0]);
      const rows = target.user_watchlist
        .filter((w) => w.user_id === userId)
        .map((w) => {
          const a = target.market_assets.find((x) => x.symbol === w.symbol)!;
          const t = latestTick(a.symbol);
          const cutoff24h = now.getTime() - 24 * 60 * 60 * 1000;
          const oldTicks = target.market_ticks
            .filter((x) => x.symbol === a.symbol && x.received_at.getTime() <= cutoff24h)
            .sort((x, y) => y.received_at.getTime() - x.received_at.getTime() || y.id - x.id);
          const old = oldTicks[0];
          const stale = !t || now.getTime() - t.received_at.getTime() > 15_000;
          const change24h =
            old && t && old.price !== 0 ? (((t.price - old.price) / old.price) * 100).toFixed(2) : null;
          return {
            symbol: a.symbol,
            display_name: a.display_name,
            price: t ? String(t.price) : null,
            received_at: t ? t.received_at : null,
            stale,
            change_24h_pct: change24h,
          };
        })
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
      return result(rows);
    }

    if (/^INSERT INTO user_watchlist\(user_id,symbol\)/i.test(sql)) {
      const [userId, symbol] = [String(params[0]), String(params[1])];
      if (!target.user_watchlist.some((w) => w.user_id === userId && w.symbol === symbol)) {
        target.user_watchlist.push({ user_id: userId, symbol, created_at: now });
      }
      return result([], 1);
    }

    if (/^DELETE FROM user_watchlist WHERE user_id=\$1 AND symbol=\$2/i.test(sql)) {
      const [userId, symbol] = [String(params[0]), String(params[1])];
      const before = target.user_watchlist.length;
      target.user_watchlist = target.user_watchlist.filter((w) => !(w.user_id === userId && w.symbol === symbol));
      return result([], before - target.user_watchlist.length);
    }

    // Journal
    if (/^SELECT \* FROM investment_journal WHERE user_id=\$1 ORDER BY updated_at DESC/i.test(sql)) {
      const userId = String(params[0]);
      const rows = target.investment_journal
        .filter((j) => j.user_id === userId)
        .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
      return result(rows);
    }

    if (/^UPDATE investment_journal SET title=\$3/i.test(sql)) {
      const [id, userId, title, body, signalId, planId] = [
        String(params[0]),
        String(params[1]),
        String(params[2]),
        String(params[3]),
        typeof params[4] === 'string' && params[4] ? params[4] : null,
        typeof params[5] === 'string' && params[5] ? params[5] : null,
      ];
      const item = target.investment_journal.find((j) => j.id === id && j.user_id === userId);
      if (!item) return result([]);
      item.title = title;
      item.body = body;
      item.signal_id = signalId;
      item.plan_id = planId;
      item.updated_at = now;
      return result([item]);
    }

    if (/^INSERT INTO investment_journal/i.test(sql)) {
      const item: JournalRow = {
        id: randomUUID(),
        user_id: String(params[0]),
        title: String(params[1]),
        body: String(params[2]),
        signal_id: typeof params[3] === 'string' && params[3] ? params[3] : null,
        plan_id: typeof params[4] === 'string' && params[4] ? params[4] : null,
        created_at: now,
        updated_at: now,
      };
      target.investment_journal.push(item);
      return result([item]);
    }

    if (/^DELETE FROM investment_journal WHERE id=\$1 AND user_id=\$2 RETURNING id/i.test(sql)) {
      const [id, userId] = [String(params[0]), String(params[1])];
      const match = target.investment_journal.find((j) => j.id === id && j.user_id === userId);
      if (!match) return result([]);
      target.investment_journal = target.investment_journal.filter((j) => !(j.id === id && j.user_id === userId));
      return result([{ id: match.id }]);
    }

    // Notifications
    if (/^SELECT id,event_type,channel,payload,status,attempts,last_error,created_at,accepted_at FROM notification_outbox/i.test(sql)) {
      const userId = String(params[0]);
      const rows = target.notification_outbox
        .filter((n) => n.user_id === userId)
        .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
        .slice(0, 100);
      return result(rows);
    }

    // CSV Export
    if (/^SELECT a\.display_name AS asset_name,symbol,executed_at,quantity,price,quote_amount,plan_id FROM simulated_trades/i.test(sql)) {
      const [userId, from, to] = [String(params[0]), params[1] as string | null, params[2] as string | null];
      const rows = target.simulated_trades
        .filter((t) => {
          if (t.user_id !== userId) return false;
          if (from && t.executed_at < new Date(`${from}T00:00:00.000Z`)) return false;
          if (to && t.executed_at >= new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000)) return false;
          return true;
        })
        .sort((a, b) => b.executed_at.getTime() - a.executed_at.getTime())
        .map((t) => {
          const asset = target.market_assets.find((a) => a.symbol === t.symbol);
          return {
            asset_name: asset?.display_name ?? t.symbol,
            symbol: t.symbol,
            executed_at: t.executed_at,
            quantity: t.quantity,
            price: t.price,
            quote_amount: t.quote_amount,
            plan_id: t.plan_id,
          };
        });
      return result(rows);
    }

    throw new Error(`[InMemoryPgPool] Unhandled SQL query: ${sql}`);
  }

  const mockPool = {
    query: async (sql: string, params?: unknown[]) => executeQuery(state, sql, params),
    connect: async (): Promise<PoolClient> => {
      let txState: StoreState | null = null;
      const client = {
        query: async (sql: string, params?: unknown[]) => {
          const trimmed = sql.trim().toUpperCase();
          if (trimmed === 'BEGIN') {
            txState = cloneState(state);
            return result([]);
          }
          if (trimmed === 'COMMIT') {
            if (txState) {
              state = txState;
              txState = null;
            }
            return result([]);
          }
          if (trimmed === 'ROLLBACK') {
            txState = null;
            return result([]);
          }
          return executeQuery(txState ?? state, sql, params);
        },
        release: () => {
          txState = null;
        },
      };
      return client as unknown as PoolClient;
    },
    end: async () => undefined,
  };

  return mockPool as unknown as Pool;
}
