import { z } from 'zod';
import { characterSchema, type Character } from '../character-creator/model';
import { saveContextFields } from '../game-saves/model';

export const careIds = [
  'baby_feed',
  'baby_bath',
  'baby_diaper',
  'baby_play',
  'baby_cuddle',
  'baby_sleep',
] as const;
export type CareId = (typeof careIds)[number];
const amount = z.number().int().min(0).max(100);
export const babyNeedsSchema = z.object({
  satiety: amount,
  hygiene: amount,
  energy: amount,
  affection: amount,
  fun: amount,
});
const counter = z.number().int().nonnegative();
export const babySkillsSchema = z.object({
  knowledge: counter,
  creativity: counter,
  sociability: counter,
  autonomy: counter,
  wellbeing: counter,
});
export const traitsSchema = z.object({
  curiosity: counter,
  sociability: counter,
  secure_attachment: counter,
});
const effectsSchema = z.object({
  needs: babyNeedsSchema.partial(),
  skills: babySkillsSchema.partial(),
  traits: traitsSchema.partial(),
});
export const rulesSchema = z.object({
  version: z.number().int().positive(),
  growth: z.object({
    minutes: counter,
    distinctCare: z.number().int().min(0).max(6),
    requiresBirth: z.boolean(),
  }),
  effects: z.record(z.enum(careIds), effectsSchema),
});
export const defaultCareRules = rulesSchema.parse({
  version: 1,
  growth: { minutes: 30, distinctCare: 4, requiresBirth: true },
  effects: {
    baby_feed: { needs: { satiety: 12 }, skills: { wellbeing: 1 }, traits: {} },
    baby_bath: { needs: { hygiene: 10 }, skills: { wellbeing: 1 }, traits: {} },
    baby_diaper: { needs: { hygiene: 12 }, skills: { wellbeing: 1 }, traits: {} },
    baby_play: { needs: { fun: 12 }, skills: { creativity: 1 }, traits: { curiosity: 1 } },
    baby_cuddle: {
      needs: { affection: 12 },
      skills: { sociability: 1 },
      traits: { sociability: 1, secure_attachment: 1 },
    },
    baby_sleep: { needs: { energy: 12 }, skills: { wellbeing: 1 }, traits: {} },
  },
});
export const careLabels: Record<CareId, string> = {
  baby_feed: 'Alimentar',
  baby_bath: 'Dar banho',
  baby_diaper: 'Trocar fralda',
  baby_play: 'Brincar',
  baby_cuddle: 'Dar carinho',
  baby_sleep: 'Colocar para dormir',
};
export const careResponses: Record<CareId, string> = {
  baby_feed: 'Um pouquinho de alimento e um suspiro contente.',
  baby_bath: 'Água morninha, bolhinhas e uma manta limpa.',
  baby_diaper: 'Tudo limpinho. Mais conforto para descobrir o mundo.',
  baby_play: 'Uma brincadeira pequena desperta uma grande curiosidade.',
  baby_cuddle: 'Um aconchego conhecido. Você está aqui.',
  baby_sleep: 'A manta se ajeita. É hora de descansar.',
};
export const careCommandSchema = z.object({
  requestId: z.uuid(),
  characterId: z.uuid(),
  activity: z.enum(careIds),
  lines: z
    .array(z.object({ sessionId: z.uuid(), minutes: z.number().int().min(1).max(120) }))
    .min(1)
    .max(20),
});
export type CareCommand = z.infer<typeof careCommandSchema>;
export const historySchema = z.object({
  id: z.string(),
  created_at: z.string(),
  activity: z.enum(careIds),
  minutes: z.number().int().positive(),
  rules_version: z.number().int().positive(),
});
export const babyStatsSchema = z.object({
  needs: babyNeedsSchema,
  skills: babySkillsSchema,
  traits: traitsSchema,
  progress_minutes: counter,
  care_types: z.array(z.enum(careIds)),
  history: z.array(historySchema),
});
export type BabyStats = z.infer<typeof babyStatsSchema>;
export const babyStateSchema = z.object({
  ...saveContextFields,
  revision: counter,
  household_id: z.string(),
  character: characterSchema.extend({
    save_id: z.string().optional(),
    id: z.string(),
    born_at: z.string(),
    life_xp: counter,
    birth_read: z.boolean(),
    first_memory: z.string().nullable(),
  }),
  stats: babyStatsSchema,
  rules: rulesSchema,
  credits: z.array(
    z.object({
      session_id: z.string(),
      eligible_minutes: counter,
      allocated_minutes: counter,
      created_at: z.string(),
    }),
  ),
});
export type BabyState = z.infer<typeof babyStateSchema>;
export function initialBabyStats(): BabyStats {
  return {
    needs: { satiety: 75, hygiene: 75, energy: 75, affection: 75, fun: 75 },
    skills: { knowledge: 0, creativity: 0, sociability: 0, autonomy: 0, wellbeing: 0 },
    traits: { curiosity: 0, sociability: 0, secure_attachment: 0 },
    progress_minutes: 0,
    care_types: [],
    history: [],
  };
}
// No wall clock or last-seen arithmetic: absence never changes needs.
export function applyCare(
  stats: BabyStats,
  activity: CareId,
  minutes: number,
  rules = defaultCareRules,
): BabyStats {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 2400)
    throw Error('Minutos inválidos.');
  const next = structuredClone(stats);
  const effect = rulesSchema.parse(rules).effects[activity];
  for (const [key, value] of Object.entries(effect.needs))
    next.needs[key as keyof BabyStats['needs']] = Math.min(
      100,
      next.needs[key as keyof BabyStats['needs']] + value! * minutes,
    );
  for (const [key, value] of Object.entries(effect.skills))
    next.skills[key as keyof BabyStats['skills']] += value! * minutes;
  for (const [key, value] of Object.entries(effect.traits))
    next.traits[key as keyof BabyStats['traits']] += value! * minutes;
  next.progress_minutes += minutes;
  next.care_types = [...new Set([...next.care_types, activity])];
  return next;
}
export function growthReadiness(
  stats: BabyStats,
  character: Pick<Character, 'birth_read'>,
  rules = defaultCareRules,
) {
  return (
    stats.progress_minutes >= rules.growth.minutes &&
    stats.care_types.length >= rules.growth.distinctCare &&
    (!rules.growth.requiresBirth || character.birth_read)
  );
}
export function availableMinutes(state: Pick<BabyState, 'credits'>) {
  return state.credits.reduce(
    (sum, credit) => sum + credit.eligible_minutes - credit.allocated_minutes,
    0,
  );
}
export function planCare(
  state: BabyState,
  activity: CareId,
  minutes: number,
  requestId: string,
): CareCommand {
  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    minutes > 120 ||
    minutes > availableMinutes(state)
  )
    throw Error('Escolha minutos dentro do saldo disponível.');
  let left = minutes;
  const lines: CareCommand['lines'] = [];
  for (const credit of state.credits) {
    const use = Math.min(left, credit.eligible_minutes - credit.allocated_minutes);
    if (use > 0) {
      lines.push({ sessionId: credit.session_id, minutes: use });
      left -= use;
    }
    if (!left) break;
  }
  return careCommandSchema.parse({ requestId, characterId: state.character.id, activity, lines });
}
