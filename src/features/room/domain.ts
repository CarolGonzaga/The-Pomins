import { z } from 'zod';
import { careIds } from '../baby-care/model';
import { lifeStages, adultAppearanceSchema } from '../character-visuals/model';
export {
  lifeStages,
  adultAppearanceSchema,
  defaultAdultAppearance,
} from '../character-visuals/model';
export type { AdultAppearance } from '../character-visuals/model';
export const attributes = z.object({
  knowledge: z.number().int().nonnegative(),
  creativity: z.number().int().nonnegative(),
  sociability: z.number().int().nonnegative(),
  autonomy: z.number().int().nonnegative(),
  wellbeing: z.number().int().nonnegative(),
});
export const needs = z.object({
  satiety: z.number().int().min(0).max(100),
  hygiene: z.number().int().min(0).max(100),
  energy: z.number().int().min(0).max(100),
  affection: z.number().int().min(0).max(100),
  fun: z.number().int().min(0).max(100),
});
export type Tile = { x: number; y: number };
export const activityIds = ['study', 'read', 'sleep'] as const;
export type ActivityId = (typeof activityIds)[number];
export type AnimationState = 'idle' | 'walking' | 'studying' | 'reading' | 'sleeping';
export type Activity = {
  id: ActivityId;
  label: string;
  description: string;
  stages: readonly (typeof lifeStages)[number][];
  objectId: string;
  destination: Tile;
  state: AnimationState;
  facing: number;
  effects: Partial<Record<keyof z.infer<typeof attributes> | 'energy', number>>;
  requirements: Record<string, number>;
  narrativeConditions: Record<string, boolean>;
};
export const activities: Record<ActivityId, Activity> = {
  study: {
    id: 'study',
    label: 'Estudar',
    description: 'Na escrivaninha, uma ideia de cada vez.',
    stages: ['child', 'teen', 'adult', 'elder'],
    objectId: 'desk',
    destination: { x: 4, y: 5 },
    state: 'studying',
    facing: 0,
    effects: { knowledge: 2, autonomy: 1 },
    requirements: {},
    narrativeConditions: {},
  },
  read: {
    id: 'read',
    label: 'Ler',
    description: 'Uma pausa entre as páginas da estante.',
    stages: ['child', 'teen', 'adult', 'elder'],
    objectId: 'bookshelf',
    destination: { x: 11, y: 4 },
    state: 'reading',
    facing: 2,
    effects: { knowledge: 1, creativity: 1 },
    requirements: {},
    narrativeConditions: {},
  },
  sleep: {
    id: 'sleep',
    label: 'Dormir',
    description: 'Descansar também faz parte da vida.',
    stages: lifeStages,
    objectId: 'bed',
    destination: { x: 10, y: 8 },
    state: 'sleeping',
    facing: 2,
    effects: { energy: 3, wellbeing: 1 },
    requirements: {},
    narrativeConditions: {},
  },
};
export const residentSchema = z.object({
  id: z.string(),
  household_id: z.string(),
  name: z.string().min(2).max(32),
  life_stage: z.enum(lifeStages),
  appearance: adultAppearanceSchema,
  needs,
  skills: attributes,
  current_activity: z.enum(activityIds).nullable(),
  animation_state: z.enum(['idle', 'walking', 'studying', 'reading', 'sleeping']),
  position: z.object({ x: z.number().int(), y: z.number().int() }),
  activity_revision: z.number().int(),
  progress_minutes: z.number().int().nonnegative(),
  relationships: z.array(z.unknown()),
  render_system: z.literal('lpc'),
});
export type Resident = z.infer<typeof residentSchema>;
export const creditSchema = z.object({
  session_id: z.string(),
  eligible_minutes: z.number().int().nonnegative(),
  allocated_minutes: z.number().int().nonnegative(),
  created_at: z.string(),
});
export const allocationLineSchema = z.object({
  sessionId: z.uuid(),
  characterId: z.uuid(),
  activity: z.enum(activityIds),
  minutes: z.number().int().min(1).max(120),
});
export const roomStateSchema = z.object({
  revision: z.number().int().nonnegative().default(0),
  household: z.object({ id: z.string(), name: z.string() }),
  residents: z.array(residentSchema),
  credits: z.array(creditSchema),
  allocations: z.array(
    z.object({
      id: z.string(),
      session_id: z.string(),
      character_id: z.string(),
      activity_id: z.enum([...activityIds, ...careIds]),
      minutes: z.number().int(),
      created_at: z.string(),
    }),
  ),
  historical_ms: z.number().nonnegative(),
});
export type RoomState = z.infer<typeof roomStateSchema>;
export type AllocationLine = z.infer<typeof allocationLineSchema>;
export const emptySkills = () => ({
  knowledge: 0,
  creativity: 0,
  sociability: 0,
  autonomy: 0,
  wellbeing: 0,
});
export const initialNeeds = () => ({
  satiety: 75,
  hygiene: 75,
  energy: 75,
  affection: 75,
  fun: 75,
});
export function totals(state: RoomState) {
  return {
    available: state.credits.reduce((n, c) => n + c.eligible_minutes - c.allocated_minutes, 0),
    distributed: state.credits.reduce((n, c) => n + c.allocated_minutes, 0),
    historical: Math.floor(state.historical_ms / 60000),
  };
}
export function applyProgress(resident: Resident, activity: ActivityId, minutes: number): Resident {
  if (
    !Number.isInteger(minutes) ||
    minutes < 1 ||
    !activities[activity].stages.includes(resident.life_stage)
  )
    throw Error('Distribuição incompatível.');
  const next = structuredClone(resident);
  next.progress_minutes += minutes;
  for (const [key, value] of Object.entries(activities[activity].effects))
    if (key === 'energy') next.needs.energy = Math.min(100, next.needs.energy + value! * minutes);
    else next.skills[key as keyof Resident['skills']] += value! * minutes;
  return next;
}
