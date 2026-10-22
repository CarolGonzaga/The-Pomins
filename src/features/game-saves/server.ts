import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { gameContextSchema, type GameContext } from './model';

export class SaveContextError extends Error {
  constructor(
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
// Negotiate once per request. Only a missing RPC permits the pre-migration bridge.
// Ownership, network, malformed state and permission failures never become a guest save.
export async function resolveGameContext(
  db: Pick<SupabaseClient, 'rpc'>,
  requested?: string,
): Promise<GameContext | null> {
  if (requested && !z.uuid().safeParse(requested).success)
    throw new SaveContextError('Partida inválida.', 400);
  let response;
  try {
    response = await db.rpc('get_game_context', requested ? { p_save: requested } : {});
  } catch {
    throw new SaveContextError('Não foi possível conectar à partida.', 503);
  }
  const { data, error } = response;
  if (error) {
    if (error.code === 'PGRST202' && !requested) return null;
    if (error.code === 'PGRST202')
      throw new SaveContextError('A migração de partidas ainda não foi aplicada.', 503);
    throw new SaveContextError(
      'Não foi possível acessar esta partida. Confira a conta e a conexão.',
    );
  }
  const result = gameContextSchema.safeParse(data);
  if (!result.success) throw new SaveContextError('O contexto da partida não é compatível.', 503);
  if ((requested && result.data.save.id !== requested) || result.data.save.archived_at !== null)
    throw new SaveContextError('A resposta não corresponde à partida solicitada.');
  return result.data;
}
