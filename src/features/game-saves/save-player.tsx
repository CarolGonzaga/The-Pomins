'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Game } from '@/components/game';
import { Button } from '@/components/ui/button';
import { RoomApp } from '../room/room-app';
import { characterSchema, type Character } from '../character-creator/model';
import { eligibleProtagonist, focusSessions, type LoadedSave } from './loading';
import { GameScreen } from '../game-screen/game-screen';
import { worldPresentation } from '../game-screen/presentation';
import { Landscape } from '../portal/landscape';
export function SavePlayer({
  initial,
  userId,
  characterId,
}: {
  initial: LoadedSave;
  userId: string;
  characterId?: string;
}) {
  const router = useRouter(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const s = initial.context.save,
    path = `/game/${s.id}`;
  const choices = initial.characters.filter((c) => eligibleProtagonist(c, initial.household.id));
  const selected = choices.find((c) => c.id === (characterId ?? s.protagonist_id));
  async function choose(id: string) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/game-saves/${s.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: id, expectedRevision: s.world_revision }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  }
  if (s.state === 'draft' && initial.characters.length === 0)
    return (
      <Game
        immersive
        generation={s.current_generation}
        key={`${userId}:${s.id}:birth`}
        configured
        returnHref={path}
        roomHref={path}
        initial={{
          userId,
          saveId: s.id,
          nickname: initial.profile.nickname,
          isPublic: initial.profile.is_public,
          accountXp: initial.profile.account_xp,
          character: null,
          sessions: focusSessions(initial),
          loadError: false,
        }}
      />
    );
  if (s.state !== 'ready')
    return (
      <GameScreen
        name={s.name}
        stage="Protagonista pendente"
        generation={s.current_generation}
        world={<Landscape />}
        panels={[
          {
            id: 'protagonist',
            label: 'Protagonista',
            content: (
              <>
                <h2>Quem protagoniza esta história?</h2>
                <p>Os outros moradores continuam nesta partida.</p>
                <div className="game-protagonist-choices">
                  {choices.map((c) => (
                    <Button key={c.id} disabled={busy} onClick={() => choose(c.id)}>
                      {c.name}
                    </Button>
                  ))}
                </div>
                {!choices.length && <p>Nenhum morador elegível está disponível.</p>}
                {error && <p role="alert">{error}</p>}
              </>
            ),
          },
        ]}
      />
    );
  if (!selected)
    return (
      <main className="simple-page">
        <h1>Morador indisponível</h1>
        <p role="alert">Este personagem não pode ser aberto nesta partida.</p>
        <Link href={path}>Voltar à partida</Link>
      </main>
    );
  const sessions = focusSessions(initial),
    pending = sessions.find((f) => ['active', 'paused', 'interrupted'].includes(f.status)) ?? null;
  const key = `${userId}:${s.id}:${selected.id}`;
  const legacy =
    worldPresentation(selected.life_stage as 'baby' | 'adult', selected.render_system) === 'baby'
      ? ({ ...selected, ...characterSchema.parse(selected) } as Character)
      : null;
  const residents = (
    <nav aria-label="Moradores da partida">
      {choices.map((c) => (
        <Link
          key={c.id}
          href={`${path}?character=${c.id}`}
          aria-current={selected.id === c.id ? 'page' : undefined}
        >
          {c.name}
          {s.protagonist_id === c.id ? ' · Protagonista' : ''}{' '}
        </Link>
      ))}
      {pending && pending.origin_save_id && (
        <Link href={`/game/${pending.origin_save_id}?character=${pending.character_id}`}>
          Sessão de foco existente
        </Link>
      )}
    </nav>
  );
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {legacy ? (
        <Game
          immersive
          residents={residents}
          generation={s.current_generation}
          key={key}
          configured
          returnHref={`${path}?character=${selected.id}`}
          roomHref={`${path}?character=${choices.find((c) => c.render_system === 'lpc')?.id ?? selected.id}`}
          initial={{
            userId,
            saveId: s.id,
            nickname: initial.profile.nickname,
            isPublic: initial.profile.is_public,
            accountXp: initial.profile.account_xp,
            character: legacy,
            sessions,
            loadError: false,
          }}
        />
      ) : (
        <RoomApp
          immersive
          residents={residents}
          generation={s.current_generation}
          key={key}
          accountId={userId}
          preferredResidentId={selected.id}
          universeHref={path}
          initial={initial.room}
          authenticated
          pending={pending}
        />
      )}
    </>
  );
}
