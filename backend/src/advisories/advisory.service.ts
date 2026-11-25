import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import { canGenerateSignal, getSignalState } from './advisory.policy';

@Injectable()
export class AdvisoryService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async generate(userId: string, symbol: string) {
    if (!symbol?.trim()) throw new ConflictException('An asset symbol is required.');
    const result = await this.pool.query(
      `SELECT a.symbol, a.display_name, t.price::text AS price, t.received_at,
              t.provider_latency_ms, a.enabled
       FROM market_assets a
       LEFT JOIN LATERAL (
         SELECT price, received_at, provider_latency_ms FROM market_ticks
         WHERE symbol = a.symbol ORDER BY received_at DESC, id DESC LIMIT 1
       ) t ON TRUE
       WHERE a.symbol = $1 AND a.enabled = TRUE`,
      [symbol.trim().toUpperCase()],
    );
    if (!result.rowCount) throw new ConflictException('Asset is not configured or enabled.');
    const row = result.rows[0];
    const ageMs = row.received_at ? Math.max(0, Date.now() - new Date(row.received_at).getTime()) : null;
    const gate = canGenerateSignal({
      marketDataFresh: ageMs !== null && ageMs <= 15_000,
      tickerLatencyMs: row.provider_latency_ms === null ? null : Number(row.provider_latency_ms),
      assetEligibility: 'PENDING_POLICY',
      targetYieldApproved: false,
      volatilityPolicyApproved: false,
    });
    if (!gate.allowed) {
      throw new ConflictException({
        code: 'ADVISORY_POLICY_NOT_READY',
        message: 'No advisory signal was generated. The application is operating in fail-closed advisory mode.',
        reasons: gate.reasons,
      });
    }
    // Deliberately unreachable until the outstanding policy decisions are approved.
    throw new ConflictException('Advisory generation is disabled until approved signal policy is configured.');
  }

  async history(userId: string) {
    await this.pool.query(
      `UPDATE advisory_signals SET outcome = 'EXPIRED_UNEVALUATED', evaluated_at = NOW()
       WHERE user_id = $1 AND outcome = 'PENDING' AND expires_at <= NOW()`,
      [userId],
    );
    const result = await this.pool.query(
      `SELECT id, symbol, asset_name, entry_price::text, target_profit_yield_pct::text,
              risk_context, explanation_en, explanation_ur, generated_at, expires_at,
              invalidated_at, invalidation_reason, outcome, evaluated_at
       FROM advisory_signals WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 100`,
      [userId],
    );
    const now = new Date();
    return result.rows.map((signal) => ({
      ...signal,
      state: getSignalState({ generatedAt: new Date(signal.generated_at), expiresAt: new Date(signal.expires_at), invalidatedAt: signal.invalidated_at ? new Date(signal.invalidated_at) : null, now }),
    }));
  }

  async accuracy(userId: string) {
    const result = await this.pool.query(
      `SELECT COUNT(*)::int AS sample_size,
              COUNT(*) FILTER (WHERE outcome = 'TARGET_REACHED')::int AS successful,
              MIN(generated_at) AS earliest_signal
       FROM advisory_signals
       WHERE user_id = $1 AND generated_at >= NOW() - INTERVAL '30 days'
         AND outcome IN ('TARGET_REACHED', 'LOSS_LIMIT_BREACHED', 'EXPIRED_UNEVALUATED')`,
      [userId],
    );
    const row = result.rows[0];
    const sampleSize = Number(row.sample_size);
    return {
      period_days: 30,
      sample_size: sampleSize,
      successful_signals: Number(row.successful),
      accuracy_pct: sampleSize > 0 ? Number(((Number(row.successful) / sampleSize) * 100).toFixed(2)) : null,
      display_value: sampleSize > 0 ? `${((Number(row.successful) / sampleSize) * 100).toFixed(2)}%` : 'N/A',
      history_note: row.earliest_signal ? 'Available history is shown; the period may contain fewer than 30 days of records.' : 'No evaluated advisory signals exist in the rolling 30-day period.',
      disclaimer: 'Historical advisory performance only. It is not a guarantee of future returns.',
    };
  }
}
