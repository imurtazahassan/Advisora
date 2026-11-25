import { evaluateTrancheAuthorization } from './execution.policy';
const base = { authorizationExpiresAt:new Date('2026-01-01T00:01:00Z'), completedAt:new Date('2026-01-01T00:00:59Z'), signalExpiresAt:new Date('2026-01-01T00:01:00Z'), signalInvalidated:false, marketAgeMs:1000, tickerLatencyMs:100, upwardPriceShiftPct:0 };
describe('tranche authorization policy',()=>{
 it('allows valid authorization within limits',()=>expect(evaluateTrancheAuthorization(base).allowed).toBe(true));
 it('rejects completion after the 60-second window',()=>expect(evaluateTrancheAuthorization({...base,completedAt:new Date('2026-01-01T00:01:00.001Z')}).reasons).toContain('AUTHORIZATION_EXPIRED'));
 it('allows exactly 2% upward movement',()=>expect(evaluateTrancheAuthorization({...base,upwardPriceShiftPct:2}).allowed).toBe(true));
 it('rejects movement strictly above 2%',()=>expect(evaluateTrancheAuthorization({...base,upwardPriceShiftPct:2.001}).reasons).toContain('PRICE_SHIFT_ALERT'));
 it('locks stale market data above 15 seconds',()=>expect(evaluateTrancheAuthorization({...base,marketAgeMs:15001}).allowed).toBe(false));
 it('locks ticker latency above 5 seconds',()=>expect(evaluateTrancheAuthorization({...base,tickerLatencyMs:5001}).allowed).toBe(false));
 it('rejects invalidated signals',()=>expect(evaluateTrancheAuthorization({...base,signalInvalidated:true}).allowed).toBe(false));
});
