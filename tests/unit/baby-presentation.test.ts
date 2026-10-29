import { describe, it, expect } from 'vitest';
import { babyMood, needBand, needDisplay } from '../../src/features/baby-care/presentation';
const all = (v: number) => ({ satiety: v, hygiene: v, energy: v, affection: v, fun: v });
describe('baby need bands and mood from effective, unrounded needs', () => {
  it('does not display a new critical/band boundary through rounding', () => {
    expect(needDisplay(74.99999)).toBe(75);
    expect(needDisplay(39.9999)).toBe(39.9);
    expect(needDisplay(59.9999)).toBe(59.9);
    expect(needDisplay(19.9999)).toBe(19.9);
  });
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
