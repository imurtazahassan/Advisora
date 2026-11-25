import { canGenerateSignal, getSignalState, isAccuracyLossBreach, isPriceShiftInvalidating } from './advisory.policy';

describe('advisory policy boundaries', () => {
  it('keeps a signal active immediately before the one-minute expiry', () => {
    const generatedAt = new Date('2026-11-25T10:00:00.000Z');
    expect(getSignalState({ generatedAt, expiresAt: new Date(generatedAt.getTime() + 60_000), invalidatedAt: null, now: new Date(generatedAt.getTime() + 59_999) })).toBe('ACTIVE');
  });

  it('expires a signal at exactly one minute', () => {
    const generatedAt = new Date('2026-11-25T10:00:00.000Z');
    expect(getSignalState({ generatedAt, expiresAt: new Date(generatedAt.getTime() + 60_000), invalidatedAt: null, now: new Date(generatedAt.getTime() + 60_000) })).toBe('EXPIRED');
  });

  it('invalidates only an upward shift strictly greater than 2 percent', () => {
    expect(isPriceShiftInvalidating(100, 102)).toBe(false);
    expect(isPriceShiftInvalidating(100, 102.0001)).toBe(true);
    expect(isPriceShiftInvalidating(100, 99)).toBe(false);
  });

  it('uses a strict greater-than 3 percent decline for accuracy breach', () => {
    expect(isAccuracyLossBreach(100, 97)).toBe(false);
    expect(isAccuracyLossBreach(100, 96.999)).toBe(true);
  });

  it('fails closed while eligibility and approved signal rules are unresolved', () => {
    const result = canGenerateSignal({ marketDataFresh: true, tickerLatencyMs: 100, assetEligibility: 'PENDING_POLICY', targetYieldApproved: false, volatilityPolicyApproved: false });
    expect(result.allowed).toBe(false);
    expect(result.reasons.length).toBe(3);
  });
});
