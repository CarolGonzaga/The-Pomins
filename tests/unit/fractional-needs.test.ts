import { expect, it } from 'vitest';
import {
  needValueSchema,
  needsSchema,
  integerNeedEffectsSchema,
} from '@/features/character-needs/model';
import {
  babyNeedsSchema,
  babyStatsSchema,
  initialBabyStats,
  applyCare,
  rulesSchema,
  defaultCareRules,
} from '@/features/baby-care/model';
import { needs as roomNeeds } from '@/features/room/domain';
import { babyMood, needBand, needDisplay } from '@/features/baby-care/presentation';
it.each([0, 100, 75, Number.MIN_VALUE, 0.000000001, 99.999999999, 60.12345678901234])(
  'accepts finite state %s without rounding through every shared schema and JSON',
  (value) => {
    const values = Object.fromEntries(
      Object.keys(initialBabyStats().needs).map((key) => [key, value]),
    );
    for (const schema of [needsSchema, babyNeedsSchema, roomNeeds])
      expect(schema.parse(JSON.parse(JSON.stringify(values)))).toEqual(values);
    expect(babyStatsSchema.parse({ ...initialBabyStats(), needs: values }).needs.satiety).toBe(
      value,
    );
  },
);
it.each([-0.000001, -1, 100.000001, NaN, Infinity, -Infinity, null, '75'])(
  'rejects invalid state %s instead of coercing or clamping',
  (value) => {
    expect(needValueSchema.safeParse(value).success).toBe(false);
    expect(babyNeedsSchema.safeParse({ ...initialBabyStats().needs, energy: value }).success).toBe(
      false,
    );
  },
);
it('JSON nonfinite nulls are rejected and integer effect/credit contracts remain separate', () => {
  for (const value of [NaN, Infinity, -Infinity])
    expect(needValueSchema.safeParse(JSON.parse(JSON.stringify(value))).success).toBe(false);
  expect(integerNeedEffectsSchema.safeParse({ satiety: 1.5 }).success).toBe(false);
  expect(
    rulesSchema.safeParse({
      ...defaultCareRules,
      effects: {
        ...defaultCareRules.effects,
        baby_feed: { needs: { satiety: 1.5 }, skills: {}, traits: {} },
      },
    }).success,
  ).toBe(false);
});
it('uses unrounded values for emotional mean, critical individual needs and bands', () => {
  const all = (value: number) =>
    needsSchema.parse(
      Object.fromEntries(Object.keys(initialBabyStats().needs).map((key) => [key, value])),
    );
  expect(babyMood(all(59.999999))).toBe('unhappy');
  expect(babyMood(all(60))).toBe('happy');
  expect(babyMood(all(39.999999))).toBe('sad');
  expect(babyMood(all(40))).toBe('unhappy');
  expect(babyMood({ ...all(100), satiety: 19.999999 })).toBe('unhappy');
  expect(needBand(59.999999)).toBe('attention');
  expect(needBand(39.999999)).toBe('critical');
  expect(needDisplay(59.999999)).toBe(59.9);
});
it('care adds the unchanged integer effect to a fractional domain value', () => {
  const stats = initialBabyStats();
  stats.needs.satiety = 60.123456789;
  expect(applyCare(stats, 'baby_feed', 2).needs.satiety).toBe(84.123456789);
  expect(stats.needs.satiety).toBe(60.123456789);
});
