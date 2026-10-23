import { expect, it } from 'vitest';
import { worldPresentation } from '@/features/game-screen/presentation';

it('keeps the baby renderer separate from adult LPC', () => {
  expect(worldPresentation('baby', 'legacy')).toBe('baby');
  expect(worldPresentation('baby', 'lpc')).toBeNull();
});
it('uses the current room only for compatible adults', () => {
  expect(worldPresentation('adult', 'lpc')).toBe('room');
  expect(worldPresentation('adult', 'legacy')).toBeNull();
});
it('leaves unsupported life stages without an invented visual fallback', () => {
  for (const stage of ['child', 'teen', 'elder'] as const) {
    expect(worldPresentation(stage, 'lpc')).toBeNull();
    expect(worldPresentation(stage, 'legacy')).toBeNull();
  }
});
