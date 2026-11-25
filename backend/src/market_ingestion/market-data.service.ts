import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { MARKET_DATA_PROVIDER } from './market-data.provider';
import type { MarketDataProvider } from './market-data.provider';
import { assessMarketData, MARKET_DATA_LIMITS } from './market-data.policy';

@Injectable()
export class MarketDataService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MARKET_DATA_PROVIDER) private readonly provider: MarketDataProvider,
  ) {}

  async refresh() {
    const ticks = await this.provider.getLatestTicks();
    const receivedAt = new Date();
    if (!Array.isArray(ticks) || ticks.length === 0) {
      throw new ServiceUnavailableException('Market data provider returned no ticks');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const tick of ticks) {
        if (!tick.symbol || !Number.isFinite(tick.price) || tick.price <= 0 || !(tick.eventTime instanceof Date) || Number.isNaN(tick.eventTime.getTime())) {
          throw new ServiceUnavailableException('Market data provider returned an invalid tick');
        }
        const latency = Math.max(0, receivedAt.getTime() - tick.eventTime.getTime());
        const inserted = await client.query(
          `INSERT INTO market_ticks (symbol, price, provider_event_at, received_at, provider_latency_ms, source)
           SELECT symbol, $2, $3, $4, $5, $6 FROM market_assets WHERE symbol = $1 AND enabled = TRUE
           RETURNING id`,
          [tick.symbol, tick.price, tick.eventTime, receivedAt, latency, this.provider.source],
        );
        if (inserted.rowCount !== 1) {
          throw new ServiceUnavailableException(`Provider returned an unconfigured asset: ${tick.symbol}`);
        }
      }
      await client.query('COMMIT');
      return { source: this.provider.source, received_at: receivedAt.toISOString(), tick_count: ticks.length };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listAssets() {
    const result = await this.pool.query(
      `SELECT a.symbol, a.base_asset, a.quote_asset, a.display_name, a.enabled,
              t.price::text AS price, t.provider_event_at, t.received_at,
              t.provider_latency_ms, t.source
       FROM market_assets a
       LEFT JOIN LATERAL (
         SELECT price, provider_event_at, received_at, provider_latency_ms, source
         FROM market_ticks WHERE symbol = a.symbol ORDER BY received_at DESC, id DESC LIMIT 1
       ) t ON TRUE
       WHERE a.enabled = TRUE ORDER BY a.symbol`,
    );

    const now = Date.now();
    return result.rows.map((row) => {
      const hasTick = Boolean(row.received_at);
      const ageMs = hasTick ? Math.max(0, now - new Date(row.received_at).getTime()) : null;
      const latencyMs = hasTick ? Number(row.provider_latency_ms) : null;
      const assessment = assessMarketData({ hasTick, ageMs, latencyMs });
      const { stale, latencyLock } = assessment;
      // Liquidity and volatility policy values remain unresolved in the approved decision register.
      // Fresh data alone therefore cannot make an asset eligible for actionable advice.
      const eligibility = assessment.eligibility;
      return {
        symbol: row.symbol,
        base_asset: row.base_asset,
        quote_asset: row.quote_asset,
        display_name: row.display_name,
        price: row.price,
        data_source: row.source ?? null,
        data_classification: row.source === 'SIMULATED' ? 'SIMULATED_NOT_LIVE' : row.source,
        provider_event_at: row.provider_event_at,
        received_at: row.received_at,
        age_ms: ageMs,
        ticker_latency_ms: latencyMs,
        stale,
        buy_locked: stale || latencyLock,
        eligibility,
        actionable_advisory_allowed: assessment.actionableAdvisoryAllowed,
        eligibility_note: eligibility === 'PENDING_POLICY'
          ? 'Market data is fresh, but approved liquidity and volatility eligibility thresholds are not yet specified.'
          : 'Market data is missing, stale, or exceeds the approved ticker-latency limit.',
      };
    });
  }

  async getStatus() {
    const assets = await this.listAssets();
    return {
      provider: this.provider.source,
      mode: 'SIMULATED_ONLY',
      live_exchange_connected: false,
      thresholds: { stale_after_ms: MARKET_DATA_LIMITS.staleAfterMs, buy_lock_when_latency_exceeds_ms: MARKET_DATA_LIMITS.buyLockLatencyMs },
      assets,
    };
  }
}
