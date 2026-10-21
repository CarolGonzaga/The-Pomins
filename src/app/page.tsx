import { Game } from '@/components/game';
import { serverClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    return <Game initial={null} configured={false} />;
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return <Game initial={null} configured />;
  const [profile, character, sessions] = await Promise.all([
    db.from('profiles').select('nickname,is_public,account_xp').eq('id', user.id).single(),
    db
      .from('characters')
      .select('*')
      .eq('user_id', user.id)
      .eq('render_system', 'legacy')
      .is('archived_at', null)
      .maybeSingle(),
    db
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  return (
    <Game
      configured
      initial={{
        userId: user.id,
        nickname: profile.data?.nickname ?? 'Pomin',
        isPublic: profile.data?.is_public ?? false,
        accountXp: profile.data?.account_xp ?? 0,
        character: character.data,
        sessions: sessions.data ?? [],
        loadError: !!(profile.error || character.error || sessions.error),
      }}
    />
  );
}
