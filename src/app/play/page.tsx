import { serverClient } from '@/lib/supabase/server';
import { RoomApp } from '@/features/room/room-app';
import { roomStateSchema } from '@/features/room/domain';
import { resolveGameContext } from '@/features/game-saves/server';
export const dynamic = 'force-dynamic';
export default async function Play() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return <RoomApp initial={null} authenticated={false} pending={null} />;
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return <RoomApp initial={null} authenticated={false} pending={null} />;
  let context;
  try {
    context = await resolveGameContext(db);
  } catch {
    return (
      <RoomApp
        initial={null}
        authenticated
        pending={null}
        error="Não foi possível acessar a partida desta conta."
      />
    );
  }
  const [state, sessions] = await Promise.all([
    context ? db.rpc('room_state_for_save', { p_save: context.save.id }) : db.rpc('room_state'),
    db
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'paused', 'interrupted'])
      .maybeSingle(),
  ]);
  const parsed = roomStateSchema.safeParse(state.data);
  return (
    <RoomApp
      key={`${user.id}:${context?.save.id ?? 'legacy'}`}
      accountId={user.id}
      initial={parsed.success ? parsed.data : null}
      authenticated
      pending={sessions.data}
      error={
        state.error || !parsed.success
          ? 'Não foi possível carregar o quarto. Aplique a migração 202610210001 e confira sua conexão.'
          : undefined
      }
    />
  );
}
