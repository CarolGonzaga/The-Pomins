import type { BabyStats } from './model';
/** Balancing preview only. The browser never uses this to persist elapsed needs. */
export const candidateNeedRates = Object.freeze({
  satiety: 2.5,
  hygiene: 1.5,
  energy: 1.8,
  affection: 1.3,
  fun: 2,
});
export function simulateNeeds(initial: BabyStats['needs'], hours: number) {
  if (!Number.isFinite(hours) || hours < 0) throw Error('Invalid interval');
  return Object.fromEntries(
    Object.entries(initial).map(([key, value]) => [
      key,
      Math.max(
        0,
        Math.min(100, value - candidateNeedRates[key as keyof typeof candidateNeedRates] * hours),
      ),
    ]),
  ) as BabyStats['needs'];
}
export function recoveryTo60(needs: BabyStats['needs']) {
  // Cheapest matching care; diaper is +24 while bath is +20, both cost two minutes.
  const actions = Object.values(needs).reduce(
    (sum, value) => sum + Math.ceil(Math.max(0, 60 - value) / 24),
    0,
  );
  return { actions, minutes: actions * 2 };
}
