import { z } from 'zod';
import { foundationSchema, type EconomyFoundation } from '../economy-foundation/model';

const milestone = z.object({
  hours: z.number(),
  at: z.iso.datetime().nullable(),
  reached: z.boolean(),
});
export const continuitySchema = z.object({
  mode: z.literal('informational'),
  state: z.enum(['not_started', 'tracking', 'milestones_reached']),
  preparation: z.literal(true),
  penalties_active: z.literal(false),
  activation_at: z.null(),
  rules_version: z.number().int().positive(),
  server_now: z.iso.datetime({ offset: true }),
  last_valid_completed_at: z.iso.datetime({ offset: true }).nullable(),
  elapsed_seconds: z.number().nonnegative().nullable(),
  milestones: z.array(milestone),
  next_milestone: milestone.nullable(),
  remaining_seconds: z.number().nonnegative().nullable(),
});
export type Continuity = z.infer<typeof continuitySchema>;

/** Projection of an authenticated server snapshot only. Never executes consequences. */
export function projectContinuity(raw: EconomyFoundation): Continuity {
  const input = foundationSchema.parse(raw);
  if (
    input.rules_version !== input.rules.version ||
    input.rules.warning_seconds !== 72 * 3600 ||
    input.rules.regression_seconds !== 168 * 3600 ||
    input.rules.closure_seconds !== 720 * 3600
  )
    throw Error('Versão de regras incompatível.');
  const now = Date.parse(input.server_now);
  const last = input.last_valid_focus?.completed_at ?? null;
  // A future ledger timestamp is not a trustworthy historical anchor.
  if (last && Date.parse(last) > now) throw Error('Conclusão posterior ao horário do servidor.');
  const elapsed = last === null ? null : (now - Date.parse(last)) / 1000;
  const milestones = [72, 168, 720].map((hours) => ({
    hours,
    at: last === null ? null : new Date(Date.parse(last) + hours * 3600000).toISOString(),
    reached: elapsed !== null && elapsed >= hours * 3600,
  }));
  const next = last === null ? null : (milestones.find((m) => !m.reached) ?? null);
  return continuitySchema.parse({
    mode: 'informational',
    state: last === null ? 'not_started' : next ? 'tracking' : 'milestones_reached',
    preparation: true,
    penalties_active: false,
    activation_at: null,
    rules_version: input.rules_version,
    server_now: input.server_now,
    last_valid_completed_at: last,
    elapsed_seconds: elapsed,
    milestones,
    next_milestone: next,
    remaining_seconds: next ? Math.max(0, (Date.parse(next.at!) - now) / 1000) : null,
  });
}
export function durationLabel(seconds: number) {
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  return `${hours} h${rest ? ` ${rest} min` : ''}`;
}
