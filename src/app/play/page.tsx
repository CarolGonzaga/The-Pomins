import { serverClient } from '@/lib/supabase/server';
import { RoomApp } from '@/features/room/room-app';
import { roomStateSchema } from '@/features/room/domain';
export const dynamic = 'force-dynamic';
export default async function Play() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return <RoomApp initial={null} authenticated={false} pending={null} />;
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return <RoomApp initial={null} authenticated={false} pending={null} />;
  const [state, sessions] = await Promise.all([
    db.rpc('room_state'),
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
