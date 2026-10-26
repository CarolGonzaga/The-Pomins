import { describe, expect, it } from 'vitest';
import {
  foundationRules,
  foundationSchema,
  previewElapsedSeconds,
  previewInactivity,
  previewRegression,
  purchaseIntentSchema,
} from '../../src/features/economy-foundation/model';
const uuid = '10000000-0000-4000-8000-000000000001';
describe('inert economy contracts', () => {
  it.each([
    [0, 'normal'],
    [259199.999, 'normal'],
    [259200, 'warning'],
    [604799.999, 'warning'],
    [604800, 'regression_due'],
    [2591999.999, 'regression_due'],
    [2592000, 'closure_due'],
  ])('previews exact elapsed boundary %s without applying anything', (seconds, state) => {
    expect(previewInactivity(Number(seconds))).toBe(state);
  });
  it('does not start before activation or before a journey exists', () => {
    const base = {
      serverNow: '2030-01-01T00:00:00Z',
      activationAt: null,
      lastValidCompletedAt: '2020-01-01T00:00:00Z',
      journeyStartedAt: null,
    };
    expect(previewElapsedSeconds(base)).toBeNull();
    expect(previewElapsedSeconds({ ...base, activationAt: '2026-10-26T00:00:00Z' })).toBeNull();
  });
  it('uses instants rather than local calendar or daylight-saving dates', () => {
    expect(
      previewElapsedSeconds({
        serverNow: '2026-11-01T01:00:00-05:00',
        activationAt: '2026-10-29T02:00:00-04:00',
        journeyStartedAt: '2026-10-29T06:00:00Z',
        lastValidCompletedAt: '2020-01-01T00:00:00Z',
      }),
    ).toBe(72 * 3600);
  });
  it('a new journey does not reset another save/account anchor', () => {
    const old = {
      serverNow: '2026-11-25T00:00:00Z',
      activationAt: '2026-10-26T00:00:00Z',
      lastValidCompletedAt: null,
      journeyStartedAt: '2026-10-26T00:00:00Z',
    };
    expect(previewElapsedSeconds(old)).toBe(720 * 3600);
    expect(previewElapsedSeconds({ ...old, journeyStartedAt: '2026-11-25T00:00:00Z' })).toBe(0);
    expect(previewElapsedSeconds({ ...old, lastValidCompletedAt: old.serverNow })).toBe(0);
  });
  it('caps a separate loss at five, excludes pre-activation progress and leaves inputs intact', () => {
    const before = { knowledge: 100, creativity: 9, sociability: 0, autonomy: 19, wellbeing: 400 };
    const current = { ...before, knowledge: 120, creativity: 0, autonomy: 38, wellbeing: 600 };
    expect(previewRegression(current, before)).toEqual({
      knowledge: 1,
      creativity: 0,
      sociability: 0,
      autonomy: 0,
      wellbeing: 5,
    });
    expect(current.knowledge).toBe(120);
  });
  it('rejects invalid time and dishonest purchase quantities/prices/funding', () => {
    for (const n of [-1, NaN, Infinity]) expect(() => previewInactivity(n)).toThrow();
    const input = {
      kind: 'care',
      requestId: uuid,
      saveId: uuid,
      characterId: uuid,
      offerId: 'baby_feed',
      offerVersion: 1,
    };
    expect(purchaseIntentSchema.parse(input)).toEqual(input);
    for (const patch of [{ minutes: 1 }, { price: 0 }, { lines: [] }, { userId: uuid }])
      expect(purchaseIntentSchema.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it('rejects an active server response at this foundation version', () => {
    expect(
      foundationSchema.safeParse({ active: true, activation_at: '2026-10-26T00:00:00Z' }).success,
    ).toBe(false);
    expect(foundationRules.mandatory).toBe(true);
  });
});
