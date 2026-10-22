import Link from 'next/link';
import { serverClient } from '@/lib/supabase/server';
import { loadGameSave } from '@/features/game-saves/loading';
import { SavePlayer } from '@/features/game-saves/save-player';
import { SaveContextError } from '@/features/game-saves/server';
export const dynamic = 'force-dynamic';
export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ saveId: string }>;
  searchParams: Promise<{ character?: string }>;
}) {
  const { saveId } = await params;
  let loaded;
  try {
    loaded = await loadGameSave(await serverClient(), saveId);
  } catch (e) {
    return (
      <main className="simple-page">
        <h1>Partida indisponível</h1>
        <p role="alert">
          {e instanceof SaveContextError
            ? e.message
            : 'Não foi possível carregar. Tente novamente.'}
        </p>
        <Link href="/auth">Entrar</Link>
        <Link href="/">Meu universo</Link>
      </main>
    );
  }
  return (
    <SavePlayer
      key={`${loaded.userId}:${saveId}`}
      userId={loaded.userId}
      initial={loaded.data}
      characterId={(await searchParams).character}
    />
  );
}
