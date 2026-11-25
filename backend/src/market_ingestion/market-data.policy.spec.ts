import { assessMarketData, MARKET_DATA_LIMITS } from './market-data.policy';

describe('market data safety policy', () => {
  it('blocks when no tick exists', () => {
    expect(assessMarketData({ hasTick: false, ageMs: null, latencyMs: null })).toMatchObject({
      stale: true, latencyLock: true, buyLocked: true, eligibility: 'BLOCKED_MARKET_DATA',
    });
  });

  it('treats exactly 15 seconds as fresh and exactly 5 seconds latency as not latency-locked', () => {
    expect(assessMarketData({ hasTick: true, ageMs: MARKET_DATA_LIMITS.staleAfterMs, latencyMs: MARKET_DATA_LIMITS.buyLockLatencyMs })).toMatchObject({
      stale: false, latencyLock: false, buyLocked: false, eligibility: 'PENDING_POLICY',
    });
  });

  it('blocks data older than 15 seconds', () => {
    expect(assessMarketData({ hasTick: true, ageMs: 15_001, latencyMs: 10 })).toMatchObject({ stale: true, buyLocked: true });
  });

  it('locks Buy when ticker latency exceeds 5 seconds', () => {
    expect(assessMarketData({ hasTick: true, ageMs: 100, latencyMs: 5_001 })).toMatchObject({ latencyLock: true, buyLocked: true });
  });

  it('never allows actionable advisory until remaining eligibility policy is approved', () => {
    expect(assessMarketData({ hasTick: true, ageMs: 100, latencyMs: 100 }).actionableAdvisoryAllowed).toBe(false);
  });
});
