import { describe, it, expect } from 'vitest';
import {
  eligibleInterval,
  formatTime,
  rewards,
  transition,
} from '../../src/features/focus-engine/model';
import { characterSchema, defaultAppearance } from '../../src/features/character-creator/model';
describe('strict focus rules', () => {
  it('rejects invalid transitions and permits recovery', () => {
    expect(() => transition('completed', 'active')).toThrow();
    expect(transition('active', 'interrupted')).toBe('interrupted');
    expect(transition('interrupted', 'active')).toBe('active');
  });
  it('never counts background gaps or backwards clocks', () => {
    expect(eligibleInterval(1000, 11000)).toBe(0);
    expect(eligibleInterval(1000, 500)).toBe(0);
    expect(eligibleInterval(1000, 2000)).toBe(0);
  });
  it('caps confirmation to one heartbeat', () => {
    expect(eligibleInterval(1000, 6000)).toBe(5000);
    expect(eligibleInterval(1000, 8400)).toBe(5000);
    expect(eligibleInterval(1000, 8501)).toBe(0);
  });
  it('rewards whole minutes only and does not round unfinished minutes up', () => {
    expect(rewards(119999)).toEqual({ lifeXp: 10, accountXp: 10, coins: 2, energy: 1 });
    expect(rewards(120000).lifeXp).toBe(20);
  });
  it('formats remaining time without negatives', () => {
    expect(formatTime(-100)).toBe('00:00');
    expect(formatTime(120000)).toBe('02:00');
    expect(formatTime(119001)).toBe('02:00');
  });
});
describe('character data contract', () => {
  it('accepts both species and rejects unsafe styling', () => {
    expect(characterSchema.safeParse({ name: 'Lumi', appearance: defaultAppearance }).success).toBe(
      true,
    );
    expect(
      characterSchema.safeParse({
        name: 'Órion',
        appearance: { ...defaultAppearance, species: 'alien' },
      }).success,
    ).toBe(true);
    expect(
      characterSchema.safeParse({
        name: 'Lumi',
        appearance: { ...defaultAppearance, skin: 'url(javascript:alert(1))' },
      }).success,
    ).toBe(false);
  });
  it('rejects empty names and unrecognized traits', () => {
    expect(characterSchema.safeParse({ name: ' ', appearance: defaultAppearance }).success).toBe(
      false,
    );
    expect(
      characterSchema.safeParse({
        name: 'Lumi',
        appearance: { ...defaultAppearance, hair: 'arbitrary' },
      }).success,
    ).toBe(false);
  });
});
