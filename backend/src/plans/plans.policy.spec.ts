import { calculatePlanAllocation, trancheSchedule, isAuthorizationCompleteInTime, PLAN_INTERVAL_MS, classifyTrancheSchedule, AUTHORIZATION_WINDOW_MS } from './plans.policy';

describe('investment plan policy', () => {
  it('accepts exactly five percent', () => {
    expect(calculatePlanAllocation(1000, 5).trancheAmount).toBe(16.66);
  });
  it('rejects allocation above five percent', () => {
    expect(() => calculatePlanAllocation(1000, 5.001)).toThrow();
  });
  it('rejects zero and negative allocation', () => {
    expect(() => calculatePlanAllocation(1000, 0)).toThrow();
    expect(() => calculatePlanAllocation(1000, -1)).toThrow();
  });
  it('schedules three tranches at fixed 24-hour intervals', () => {
    const start = new Date('2026-01-01T12:00:00.000Z');
    const schedule = trancheSchedule(start);
    expect(schedule).toHaveLength(3);
    expect(schedule[1].getTime() - schedule[0].getTime()).toBe(PLAN_INTERVAL_MS);
    expect(schedule[2].getTime() - schedule[1].getTime()).toBe(PLAN_INTERVAL_MS);
  });
  it('does not extend a missed tranche window when the scheduler wakes late', () => {
    const scheduled = new Date('2026-01-01T12:00:00.000Z');
    expect(classifyTrancheSchedule(scheduled, new Date(scheduled.getTime() - 1))).toBe('WAITING');
    expect(classifyTrancheSchedule(scheduled, scheduled)).toBe('AUTHORIZATION_ELIGIBLE');
    expect(classifyTrancheSchedule(scheduled, new Date(scheduled.getTime() + AUTHORIZATION_WINDOW_MS))).toBe('AUTHORIZATION_ELIGIBLE');
    expect(classifyTrancheSchedule(scheduled, new Date(scheduled.getTime() + AUTHORIZATION_WINDOW_MS + 1))).toBe('MISSED');
  });
  it('accepts completion at expiry and rejects completion after expiry', () => {
    const expiry = new Date('2026-01-01T12:01:00.000Z');
    expect(isAuthorizationCompleteInTime(expiry, expiry)).toBe(true);
    expect(isAuthorizationCompleteInTime(expiry, new Date(expiry.getTime() + 1))).toBe(false);
  });
});
