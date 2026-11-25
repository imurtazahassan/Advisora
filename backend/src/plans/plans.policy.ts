export const MAX_ALLOCATION_PCT = 5;
export const TRANCHE_COUNT = 3;
export const PLAN_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function calculatePlanAllocation(balance: number, allocationPct: number, decimalPlaces = 2) {
  if (!Number.isFinite(balance) || balance <= 0) throw new Error('Balance must be positive.');
  if (!Number.isFinite(allocationPct) || allocationPct <= 0 || allocationPct > MAX_ALLOCATION_PCT) {
    throw new Error('Allocation must be greater than zero and no more than 5%.');
  }
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 12) throw new Error('Invalid currency precision.');
  const scale = 10 ** decimalPlaces;
  const total = balance * allocationPct / 100;
  const tranche = Math.floor((total / TRANCHE_COUNT) * scale) / scale;
  if (tranche <= 0) throw new Error('Allocation is too small for three positive tranches.');
  return { totalAllocation: tranche * TRANCHE_COUNT, trancheAmount: tranche, unallocatedRemainder: total - tranche * TRANCHE_COUNT };
}

export function trancheSchedule(approvedAt: Date) {
  return [0, 1, 2].map((offset) => new Date(approvedAt.getTime() + offset * PLAN_INTERVAL_MS));
}

export function isAuthorizationCompleteInTime(expiresAt: Date, completedAt: Date) {
  return completedAt.getTime() <= expiresAt.getTime();
}

export const AUTHORIZATION_WINDOW_MS = 60_000;
export type TrancheScheduleState = 'WAITING' | 'AUTHORIZATION_ELIGIBLE' | 'MISSED';

/** Classifies a scheduled tranche without extending its window when a worker wakes late. */
export function classifyTrancheSchedule(scheduledAt: Date, now: Date): TrancheScheduleState {
  const scheduled = scheduledAt.getTime();
  const current = now.getTime();
  if (!Number.isFinite(scheduled) || !Number.isFinite(current)) throw new Error('Valid schedule timestamps are required.');
  if (current < scheduled) return 'WAITING';
  if (current <= scheduled + AUTHORIZATION_WINDOW_MS) return 'AUTHORIZATION_ELIGIBLE';
  return 'MISSED';
}
