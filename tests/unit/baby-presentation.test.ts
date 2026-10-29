import { describe, it, expect } from 'vitest';
import { babyMood, needBand } from '../../src/features/baby-care/presentation';
const all = (v: number) => ({ satiety: v, hygiene: v, energy: v, affection: v, fun: v });
describe('baby need bands and mood from effective, unrounded needs', () => {
  it.each([
    [0, 'critical'],
    [19, 'critical'],
    [20, 'critical'],
    [39, 'critical'],
    [40, 'attention'],
    [59, 'attention'],
    [60, 'adequate'],
    [100, 'adequate'],
  ] as const)('%s has accessible band %s', (v, band) => expect(needBand(v)).toBe(band));
  it.each([
    [85, 'happy'],
    [60, 'happy'],
    [59.99, 'unhappy'],
    [40, 'unhappy'],
    [39.99, 'sad'],
    [0, 'sad'],
  ] as const)('average %s gives %s', (v, mood) => expect(babyMood(all(v))).toBe(mood));
  it('a critical individual need overrides a high average without making a separate persistent mood', () => {
    expect(babyMood({ ...all(100), satiety: 10 })).toBe('unhappy');
    expect(babyMood({ ...all(100), satiety: 20 })).toBe('happy');
  });
});
