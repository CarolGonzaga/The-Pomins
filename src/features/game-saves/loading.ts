import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { gameContextSchema } from './model';
import { SaveContextError } from './server';
import { roomStateSchema } from '../room/domain';
import type { FocusSession } from '../focus-engine/model';
export const saveCharacterSchema = z
  .object({
    id: z.uuid(),
    user_id: z.uuid(),
    save_id: z.uuid(),
    household_id: z.uuid(),
    name: z.string(),
    life_stage: z.string(),
    render_system: z.string(),
    archived_at: z.string().nullable(),
  born_at:z.string(),life_xp:z.number().int().nonnegative(),birth_read:z.boolean(),first_memory:z.string().nullable(),
  })
  .passthrough();
const owned = z
  .object({ user_id: z.uuid(), save_id: z.uuid(), character_id: z.uuid().nullable() })
  .passthrough();
export const loadedSaveSchema = z.object({
  context: gameContextSchema,
  profile: z.object({ nickname: z.string(), is_public: z.boolean(), account_xp: z.number() }),
  household: z.object({ id: z.uuid(), user_id: z.uuid(), save_id: z.uuid() }).passthrough(),
  characters: z.array(saveCharacterSchema),
  memories: z.array(owned),
  events: z.array(owned),
  room: roomStateSchema,
  sessions: z.array(
    z
      .object({ id: z.uuid(), user_id: z.uuid(), character_id: z.uuid(), status: z.string() })
      .passthrough(),
  ),
});
export type LoadedSave = z.infer<typeof loadedSaveSchema>;
export function eligibleProtagonist(c: LoadedSave['characters'][number], householdId: string) {
  return (
    c.archived_at === null &&
    c.household_id === householdId &&
    ((c.render_system === 'legacy' && c.life_stage === 'baby') ||
      (c.render_system === 'lpc' && c.life_stage === 'adult'))
  );
}
export function validateLoadedSave(input: unknown, userId: string, saveId: string): LoadedSave {
  const parsed = loadedSaveSchema.safeParse(input);
  if (!parsed.success)
    throw new SaveContextError('Não foi possível validar os dados da partida.', 503);
  const x = parsed.data,
    s = x.context.save;
  const belongs = (r: { user_id: string; save_id: string }) =>
    r.user_id === userId && r.save_id === saveId;
  if (
    s.id !== saveId ||
    s.user_id !== userId ||
    s.archived_at ||
    !belongs(x.household) ||
    x.household.id !== s.primary_household_id ||
    x.room.save_id !== saveId ||
    x.room.household.id !== x.household.id ||
    x.characters.some((c) => !belongs(c)) ||
    [...x.memories, ...x.events].some(
      (r) =>
        !belongs(r) ||
        (r.character_id !== null && !x.characters.some((c) => c.id === r.character_id)),
    ) ||
    x.sessions.some((f) => f.user_id !== userId) ||
    x.room.residents.some((c) => c.save_id !== saveId || c.household_id !== x.household.id)
  )
    throw new SaveContextError('Os dados não correspondem à partida solicitada.', 409);
  if (
    s.state === 'ready' &&
    !x.characters.some((c) => c.id === s.protagonist_id && eligibleProtagonist(c, x.household.id))
  )
    throw new SaveContextError('O protagonista não está disponível.', 409);
  return x;
}
export async function loadGameSave(db: SupabaseClient, saveId: string) {
  if (!z.uuid().safeParse(saveId).success) throw new SaveContextError('Partida inválida.', 404);
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new SaveContextError('Entre para abrir sua partida.', 401);
  const r = await db.rpc('load_game_save', { p_save: saveId });
  if (r.error)
    throw new SaveContextError(
      r.error.code === 'PGRST202'
        ? 'A atualização de carregamento de partidas ainda não foi aplicada.'
        : 'Partida indisponível ou não autorizada.',
      r.error.code === 'PGRST202' ? 503 : 404,
    );
  return { userId: user.id, data: validateLoadedSave(r.data, user.id, saveId) };
}
export function focusSessions(data: LoadedSave) {
  return data.sessions as unknown as FocusSession[];
}
export {saveStorageKey} from './model';
