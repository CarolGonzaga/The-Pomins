import { z } from 'zod';

const revision = z.number().int().nonnegative();
export const gameSaveSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    name: z.string().min(2).max(80),
    protagonist_id: z.uuid().nullable(),
    primary_household_id: z.uuid().nullable(),
    current_generation: z.number().int().positive(),
    state: z.enum(['draft', 'pending_selection', 'ready']),
    format_version: z.literal(1),
    world_revision: revision,
    progression: z.record(z.string(), z.unknown()),
    created_at: z.string(),
    last_used_at: z.string().nullable(),
    archived_at: z.string().nullable(),
    origin_save_id: z.uuid().nullable(),
    origin_snapshot_id: z.null(),
  })
  .refine(
    (s) => s.state !== 'ready' || (s.protagonist_id !== null && s.primary_household_id !== null),
    'Uma partida pronta precisa de protagonista e residência.',
  );
export type GameSave = z.infer<typeof gameSaveSchema>;
export const gameContextSchema = z.object({ save: gameSaveSchema, focus_revision: revision });
export type GameContext = z.infer<typeof gameContextSchema>;
// Optional only while the unapplied schema and old guest saves remain supported.
export const saveContextFields = {
  save_id: z.string().optional(),
  world_revision: revision.optional(),
  focus_revision: revision.optional(),
};
export function isCurrentSnapshot(
  previous: {
    revision: number;
    save_id?: string;
    world_revision?: number;
    focus_revision?: number;
  },
  next: { revision: number; save_id?: string; world_revision?: number; focus_revision?: number },
) {
  if (previous.save_id && next.save_id && previous.save_id !== next.save_id) return false;
  return (
    (next.world_revision ?? next.revision) >= (previous.world_revision ?? previous.revision) &&
    (next.focus_revision ?? 0) >= (previous.focus_revision ?? 0)
  );
}
