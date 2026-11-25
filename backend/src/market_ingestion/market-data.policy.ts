export const MARKET_DATA_LIMITS = Object.freeze({
  staleAfterMs: 15_000,
  buyLockLatencyMs: 5_000,
});

export type MarketDataEligibility = 'BLOCKED_MARKET_DATA' | 'PENDING_POLICY';

export function assessMarketData(input: {
  hasTick: boolean;
  ageMs: number | null;
  latencyMs: number | null;
}): {
  stale: boolean;
  latencyLock: boolean;
  buyLocked: boolean;
  eligibility: MarketDataEligibility;
  actionableAdvisoryAllowed: false;
} {
  const stale = !input.hasTick || input.ageMs === null || input.ageMs > MARKET_DATA_LIMITS.staleAfterMs;
  const latencyLock = !input.hasTick || input.latencyMs === null || input.latencyMs > MARKET_DATA_LIMITS.buyLockLatencyMs;
  return {
    stale,
    latencyLock,
    buyLocked: stale || latencyLock,
    eligibility: stale || latencyLock ? 'BLOCKED_MARKET_DATA' : 'PENDING_POLICY',
    actionableAdvisoryAllowed: false,
  };
}
