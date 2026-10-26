import { serverClient } from '@/lib/supabase/server';
import { foundationSchema } from './model';

/** Not wired into the game in 6D-A. Read-only and fails closed if schema/auth is absent. */
export async function getEconomyFoundation() {
  const db = await serverClient();
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError || !user) throw Error('Autenticação necessária.');
  const { data, error } = await db.rpc('get_economy_foundation');
  if (error) throw Error('Fundação da economia indisponível. Nenhuma regra foi ativada.');
  return foundationSchema.parse(data);
}
