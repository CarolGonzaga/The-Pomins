'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Game } from '@/components/game';
import { Button } from '@/components/ui/button';
import { RoomApp } from '../room/room-app';
import { characterSchema, type Character } from '../character-creator/model';
import { eligibleProtagonist, focusSessions, type LoadedSave } from './loading';
import {PortalLink} from '../portal/navigation';
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
  if(s.state==='draft' && initial.characters.length===0)
    return <Game key={`${userId}:${s.id}:birth`} configured returnHref={path} roomHref={path}
      initial={{userId,saveId:s.id,nickname:initial.profile.nickname,isPublic:initial.profile.is_public,
        accountXp:initial.profile.account_xp,character:null,sessions:focusSessions(initial),loadError:false}}/>;
  if (s.state !== 'ready')
    return (
      <main className="simple-page">
        <a href="/saves">Minhas partidas</a>
        <PortalLink href="/menu">Menu principal</PortalLink>
        <h1>Quem protagoniza esta história?</h1>
        <p>Os outros moradores continuam nesta partida.</p>
        {choices.map((c) => (
          <Button key={c.id} disabled={busy} onClick={() => choose(c.id)}>
            {c.name}
          </Button>
        ))}
        {!choices.length && <p>Nenhum morador elegível está disponível.</p>}
        {error && <p role="alert">{error}</p>}
      </main>
    );
  if (!selected)
    return (
      <main className="simple-page">
        <h1>Morador indisponível</h1>
        <p role="alert">Este personagem não pode ser aberto nesta partida.</p>
        <a href={path}>Voltar à partida</a>
      </main>
    );
  const sessions = focusSessions(initial),
    pending = sessions.find((f) => ['active', 'paused', 'interrupted'].includes(f.status)) ?? null;
  const key = `${userId}:${s.id}:${selected.id}`;
  const legacy =
    selected.render_system === 'legacy'
      ? ({ ...selected, ...characterSchema.parse(selected) } as Character)
      : null;
  return (
    <>
      <nav aria-label="Moradores da partida" className={legacy?'app-content panel':'panel'}>
        {choices.map((c) => (
          <a
            key={c.id}
            href={`${path}?character=${c.id}`}
            aria-current={selected.id === c.id ? 'page' : undefined}
            onClick={(e) => {
              if (document.documentElement.dataset.focusActive === 'true') {
                e.preventDefault();
                setError('Use os controles da sessão antes de trocar de morador.');
              }
            }}
          >
            {c.name}
            {s.protagonist_id === c.id ? ' · Protagonista' : ''}{' '}
          </a>
        ))}
        {pending && pending.origin_save_id && (
          <a
            href={`/game/${pending.origin_save_id}?character=${pending.character_id}`}
            onClick={(e) => {
              if (document.documentElement.dataset.focusActive === 'true') e.preventDefault();
            }}
          >
            Sessão de foco existente
          </a>
        )}
      </nav>
      {error && <p role="alert">{error}</p>}
      {legacy ? (
        <Game
          key={key}
          configured
          returnHref={`${path}?character=${selected.id}`}
          roomHref={`${path}?character=${choices.find(c=>c.render_system==='lpc')?.id ?? selected.id}`}
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
