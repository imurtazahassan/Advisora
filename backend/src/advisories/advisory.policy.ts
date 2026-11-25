export const ADVISORY_LIMITS = Object.freeze({
  validityMs: 60_000,
  priceShiftPct: 2,
  accuracyLossLimitPct: 3,
});

export type SignalState = 'ACTIVE' | 'EXPIRED' | 'INVALIDATED';

export function getSignalState(input: {
  generatedAt: Date;
  expiresAt: Date;
  invalidatedAt: Date | null;
  now: Date;
}): SignalState {
  if (input.invalidatedAt) return 'INVALIDATED';
  if (input.now.getTime() >= input.expiresAt.getTime()) return 'EXPIRED';
  return 'ACTIVE';
}

export function isPriceShiftInvalidating(entryPrice: number, currentPrice: number): boolean {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(currentPrice) || entryPrice <= 0 || currentPrice <= 0) {
    return true;
  }
  const upwardChangePct = ((currentPrice - entryPrice) / entryPrice) * 100;
  return upwardChangePct > ADVISORY_LIMITS.priceShiftPct;
}

export function isAccuracyLossBreach(entryPrice: number, observedPrice: number): boolean {
  if (!Number.isFinite(entryPrice) || !Number.isFinite(observedPrice) || entryPrice <= 0 || observedPrice <= 0) {
    return true;
  }
  const declinePct = ((entryPrice - observedPrice) / entryPrice) * 100;
  return declinePct > ADVISORY_LIMITS.accuracyLossLimitPct;
}

export function canGenerateSignal(input: {
  marketDataFresh: boolean;
  tickerLatencyMs: number | null;
  assetEligibility: string;
  targetYieldApproved: boolean;
  volatilityPolicyApproved: boolean;
}): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.marketDataFresh) reasons.push('Market data is missing or stale.');
  if (input.tickerLatencyMs === null || input.tickerLatencyMs > 5_000) reasons.push('Market data latency exceeds the approved limit.');
  if (input.assetEligibility !== 'ELIGIBLE') reasons.push('Conservative asset eligibility policy is not approved or the asset is ineligible.');
  if (!input.targetYieldApproved) reasons.push('Target profit yield has not been approved in the requirements baseline.');
  if (!input.volatilityPolicyApproved) reasons.push('Volatility reference and reset calculation require an approved implementation decision.');
  return { allowed: reasons.length === 0, reasons };
}
