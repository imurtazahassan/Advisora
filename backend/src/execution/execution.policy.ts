export type AuthorizationChecks = {
  authorizationExpiresAt: Date;
  completedAt: Date;
  signalExpiresAt: Date;
  signalInvalidated: boolean;
  marketAgeMs: number;
  tickerLatencyMs: number;
  upwardPriceShiftPct: number;
};

export function evaluateTrancheAuthorization(input: AuthorizationChecks) {
  const reasons: string[] = [];
  if (input.completedAt.getTime() > input.authorizationExpiresAt.getTime()) reasons.push('AUTHORIZATION_EXPIRED');
  if (input.signalInvalidated || input.completedAt.getTime() > input.signalExpiresAt.getTime()) reasons.push('SIGNAL_INVALID_OR_EXPIRED');
  if (input.marketAgeMs > 15_000 || input.tickerLatencyMs > 5_000) reasons.push('MARKET_DATA_UNAVAILABLE');
  if (input.upwardPriceShiftPct > 2) reasons.push('PRICE_SHIFT_ALERT');
  return { allowed: reasons.length === 0, reasons };
}
