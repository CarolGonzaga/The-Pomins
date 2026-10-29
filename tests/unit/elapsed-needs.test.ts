import { describe, it, expect, vi } from 'vitest';
import { initialBabyStats } from '../../src/features/baby-care/model';
import { simulateNeeds, recoveryTo60 } from '../../src/features/baby-care/needs-simulation';
describe('candidate rates and common absence recovery, not a persistence authority', () => {
  it.each([2, 8, 12, 24, 48, 168])(
    '%s hours retain 0–100 and recovery stays within half an hour of focus',
    (hours) => {
      const initial = initialBabyStats().needs,
        needs = simulateNeeds(initial, hours);
      expect(needs.satiety).toBe(Math.max(0, 75 - 2.5 * hours));
      expect(recoveryTo60(needs).minutes).toBeLessThanOrEqual(30);
      expect(Object.values(needs).every((n) => n >= 0 && n <= 100)).toBe(true);
      expect(initial.satiety).toBe(75);
    },
  );
  it('changing the device date cannot affect a duration simulation', () => {
    const baseline = simulateNeeds(initialBabyStats().needs, 8);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01'));
    expect(simulateNeeds(initialBabyStats().needs, 8)).toEqual(baseline);
    vi.useRealTimers();
  });
  it('has no elapsed loss at activation and clamps long intervals', () => {
    expect(simulateNeeds(initialBabyStats().needs, 0)).toEqual(initialBabyStats().needs);
    expect(Object.values(simulateNeeds(initialBabyStats().needs, 100000))).toEqual([0, 0, 0, 0, 0]);
  });
});
