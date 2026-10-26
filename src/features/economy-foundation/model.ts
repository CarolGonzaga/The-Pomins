import { z } from 'zod';

/** Approved planning constants. This module neither spends minutes nor applies effects. */
export const foundationRules = Object.freeze({
  version: 1,
  mandatory: true,
  warning_seconds: 72 * 3600,
  regression_seconds: 168 * 3600,
  closure_seconds: 720 * 3600,
  regression_basis_points: 500,
  regression_skill_cap: 5,
  recovery_on_valid_focus: true,
});

export const foundationSchema = z.object({
  active: z.literal(false),
  activation_at: z.null(),
  server_now: z.iso.datetime({ offset: true }),
  rules_version: z.number().int().positive(),
  rules: z.object({
    version: z.number().int().positive(),
    mandatory: z.literal(true),
    warning_seconds: z.number().int().positive(),
    regression_seconds: z.number().int().positive(),
    closure_seconds: z.number().int().positive(),
    regression_basis_points: z.number().int().min(0).max(10000),
    regression_skill_cap: z.number().int().nonnegative(),
    recovery_on_valid_focus: z.literal(true),
  }),
  last_valid_focus: z
    .object({ session_id: z.uuid(), completed_at: z.iso.datetime({ offset: true }) })
    .nullable(),
  available_minutes: z.number().int().nonnegative(),
  care_offers: z.array(
    z.object({
      activity_id: z.string().startsWith('baby_'),
      version: z.number().int().positive(),
      price_minutes: z.number().int().nonnegative(),
      enabled: z.literal(false),
    }),
  ),
});
export type EconomyFoundation = z.infer<typeof foundationSchema>;

/** Pure preview for future server policy/tests; never an authorization or mutation. */
export function previewInactivity(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) throw Error('Intervalo inválido.');
  if (seconds >= foundationRules.closure_seconds) return 'closure_due' as const;
  if (seconds >= foundationRules.regression_seconds) return 'regression_due' as const;
  if (seconds >= foundationRules.warning_seconds) return 'warning' as const;
  return 'normal' as const;
}

/** The account clock is never reset by a new save. Only that save receives its own floor. */
export function previewElapsedSeconds(input: {
  serverNow: string;
  activationAt: string | null;
  lastValidCompletedAt: string | null;
  journeyStartedAt: string | null;
}): number | null {
  if (input.activationAt === null || input.journeyStartedAt === null) return null;
  const parse = (value: string) => Date.parse(z.iso.datetime({ offset: true }).parse(value));
  const anchor = Math.max(
    parse(input.activationAt),
    parse(input.journeyStartedAt),
    input.lastValidCompletedAt === null ? -Infinity : parse(input.lastValidCompletedAt),
  );
  return Math.max(0, (parse(input.serverNow) - anchor) / 1000);
}

const skillNames = ['knowledge', 'creativity', 'sociability', 'autonomy', 'wellbeing'] as const;
type Skills = Record<(typeof skillNames)[number], number>;
/** Loss is a separate prospective adjustment, not a rewrite of historical skills. */
export function previewRegression(current: Skills, baseline: Skills): Skills {
  return Object.fromEntries(
    skillNames.map((key) => {
      if (![current[key], baseline[key]].every((n) => Number.isSafeInteger(n) && n >= 0))
        throw Error('Atributos inválidos.');
      const gained = Math.max(0, current[key] - baseline[key]);
      return [
        key,
        Math.min(
          foundationRules.regression_skill_cap,
          Math.floor((gained * foundationRules.regression_basis_points) / 10000),
        ),
      ];
    }),
  ) as Skills;
}

// Future clients send intent, never trusted prices, quantities or funding session IDs.
export const purchaseIntentSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.enum(['care', 'development']),
      requestId: z.uuid(),
      saveId: z.uuid(),
      characterId: z.uuid(),
      offerId: z.string().min(1).max(100),
      offerVersion: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('cosmetic'),
      requestId: z.uuid(),
      offerId: z.string().min(1).max(100),
      offerVersion: z.number().int().positive(),
    })
    .strict(),
]);
