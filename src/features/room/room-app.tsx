'use client';
import { careLabels, type CareId } from '../baby-care/model';
import { isCurrentSnapshot, saveStorageKey } from '../game-saves/model';
import './room.css';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Focus } from '../focus-engine/focus';
import type { FocusSession } from '../focus-engine/model';
import { defaultAppearance } from '../character-creator/model';
import { AdultEditor } from './adult-editor';
import { RoomCanvas } from './room-canvas';
import { SpritePreview } from './sprite-preview';
import {PortalLink} from '../portal/navigation';
import {
  activities,
  allocationLineSchema,
  totals,
  type RoomState,
  type Resident,
  type AllocationLine,
} from './domain';
import {
  loadLocalRoom,
  localCommand,
  localSessionCompleted,
  refreshRoom,
  roomApi,
  type RoomCommand,
  RoomRejected,
} from './persistence';
const stateLabels = {
  idle: 'Em casa',
  walking: 'A caminho',
  studying: 'Estudando',
  reading: 'Lendo',
  sleeping: 'Descansando',
};
export function RoomApp({
  initial,
  authenticated,
  pending,
  error: loadError,
  accountId,
  preferredResidentId,
  universeHref='/',
}: {
  initial: RoomState | null;
  authenticated: boolean;
  pending: FocusSession | null;
  error?: string;
  accountId?:string;
  preferredResidentId?:string;
  universeHref?:string;
}) {
  const [state, setState] = useState<RoomState | null>(initial);
  const accept = useCallback((next: RoomState) => {
    setState((previous) =>
      !previous ||
      (previous.household.id === next.household.id && isCurrentSnapshot(previous, next))
        ? next
        : previous,
    );
  }, []);
  const [selected, setSelected] = useState(preferredResidentId ?? initial?.residents[0]?.id ?? '');
  const [view, setView] = useState<'room' | 'editor' | 'focus'>('room');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [allocation, setAllocation] = useState(false);
  const [lines, setLines] = useState<AllocationLine[]>([]);
  const [pendingAllocation, setPendingAllocation] = useState<Extract<
    RoomCommand,
    { action: 'allocate' }
  > | null>(null);
  const [ready, setReady] = useState(authenticated);
  const [focusResident, setFocusResident] = useState<Resident | null>(null);
  const [recovered, setRecovered] = useState(pending);
  const resident = state?.residents.find((c) => c.id === selected) ?? state?.residents[0] ?? null;
  const balance = state ? totals(state) : { available: 0, distributed: 0, historical: 0 };
  const legacyPendingKey = `pomins-pending-allocation-${state?.household.id ?? 'local-household'}`;
  const pendingKey = accountId && state?.save_id ? saveStorageKey(accountId,state.save_id,'allocation') : legacyPendingKey;
  // localStorage/sessionStorage are browser-only external state, restored after SSR.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const theme = localStorage.getItem('pomins-theme');
      if (!authenticated && (theme === 'dark' || theme === 'light')) document.documentElement.dataset.theme = theme;
      if (!authenticated) {
        const local = loadLocalRoom();
        setState(local);
        setSelected(local.residents[0]?.id ?? '');
      }
    } catch {
      setMessage('Não foi possível ler o progresso local. Não substituímos os dados salvos.');
    }
    setReady(true);
  }, [authenticated]);
  useEffect(() => {
    try {
      setPendingAllocation(null);
      const value = sessionStorage.getItem(pendingKey) ?? sessionStorage.getItem(legacyPendingKey);
      if (value) {
        const cmd = JSON.parse(value);
        if (cmd.action === 'allocate' && cmd.payload?.requestId && (!cmd.saveId || cmd.saveId===state?.save_id)) {
          setPendingAllocation(cmd);
          if(pendingKey!==legacyPendingKey){sessionStorage.setItem(pendingKey,value);sessionStorage.removeItem(legacyPendingKey);}
        }
      }
    } catch {
      setMessage('Não foi possível recuperar o último pedido de distribuição.');
    }
  }, [pendingKey,legacyPendingKey,state?.save_id]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    const restore = () => {
      if (!authenticated) {
        try {
          setState(loadLocalRoom());
        } catch {}
      }
    };
    window.addEventListener('storage', restore);
    return () => window.removeEventListener('storage', restore);
  }, [authenticated]);
  const run = useCallback(
    async (command: RoomCommand) => {
      const next = authenticated
        ? await roomApi(command, state?.save_id)
        : await localCommand(command);
      accept(next);
      return next;
    },
    [authenticated, accept, state?.save_id],
  );
  const arrival = useCallback(
    (arrived: Resident) => {
      if (!arrived.current_activity) return;
      run({
        action: 'arrive',
        payload: {
          characterId: arrived.id,
          activity: arrived.current_activity,
          revision: arrived.activity_revision,
        },
      }).catch(() =>
        setMessage(
          'A atividade chegou ao destino, mas não foi possível salvar. Recarregue ao recuperar a conexão.',
        ),
      );
    },
    [run],
  );
  const completed = useCallback(
    (session: FocusSession) => {
      setRecovered(null);
      (authenticated ? refreshRoom(state?.save_id) : localSessionCompleted(session))
        .then((next) => {
          accept(next);
          setMessage(
            `${Math.floor(session.validated_ms / 60000)} minutos ${authenticated ? 'confirmados' : 'locais'} disponíveis para distribuir.`,
          );
        })
        .catch(() =>
          setMessage(
            'A sessão terminou, mas o resumo não carregou. Recarregue para conferir o saldo.',
          ),
        );
    },
    [authenticated, accept, state?.save_id],
  );
  async function changeActivity(activity: AllocationLine['activity']) {
    if (!resident) return;
    setBusy(true);
    setMessage('');
    try {
      await run({ action: 'activity', payload: { characterId: resident.id, activity } });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível salvar a atividade.');
    } finally {
      setBusy(false);
    }
  }
  function openAllocation() {
    if (!resident || !state) return;
    const credit = state.credits.find((c) => c.eligible_minutes > c.allocated_minutes);
    if (!credit) {
      setMessage('Conclua uma sessão para ter minutos disponíveis.');
      return;
    }
    setLines([
      {
        sessionId: credit.session_id,
        characterId: resident.id,
        activity: resident.current_activity ?? 'study',
        minutes: 1,
      },
    ]);
    setAllocation(true);
    setMessage('');
  }
  async function distribute(command?: Extract<RoomCommand, { action: 'allocate' }>) {
    setBusy(true);
    try {
      let cmd = command;
      if (!cmd) {
        const checked = lines.map((line) => allocationLineSchema.parse(line));
        const sums = new Map<string, number>();
        for (const line of checked)
          sums.set(line.sessionId, (sums.get(line.sessionId) ?? 0) + line.minutes);
        for (const [id, total] of sums) {
          const credit = state?.credits.find((c) => c.session_id === id);
          if (!credit || total > credit.eligible_minutes - credit.allocated_minutes)
            throw new Error(
              'A distribuição ultrapassa os minutos disponíveis. Ajuste os valores e tente novamente.',
            );
        }
        cmd = {
          action: 'allocate',
          saveId: authenticated ? state?.save_id : undefined,
          payload: { requestId: crypto.randomUUID(), lines: checked },
        };
        sessionStorage.setItem(pendingKey, JSON.stringify(cmd));
        setPendingAllocation(cmd);
      }
      await run(cmd);
      sessionStorage.removeItem(pendingKey);
      setPendingAllocation(null);
      setAllocation(false);
      setMessage('Minutos distribuídos. O progresso foi guardado junto com a distribuição.');
    } catch (e) {
      if (!authenticated || (e instanceof RoomRejected && [400, 409].includes(e.status))) {
        sessionStorage.removeItem(pendingKey);
        setPendingAllocation(null);
        setAllocation(false);
        if (authenticated)
          refreshRoom(state?.save_id)
            .then(accept)
            .catch(() => {});
      }
      setMessage(
        e instanceof Error
          ? e.message
          : 'Não foi possível confirmar. Tente novamente com o mesmo pedido.',
      );
    } finally {
      setBusy(false);
    }
  }
  function patchLine(index: number, patch: Partial<AllocationLine>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }
  return (
    <div className="play-shell">
      <header className="play-header">
        <Link href={universeHref} className="brand">
          pomins<span>.</span>
        </Link>
        <Link href={universeHref}>Meu universo</Link>
        {authenticated && <PortalLink href="/menu">Menu principal</PortalLink>}
        {authenticated && <Link href="/saves" onClick={e=>{if(document.documentElement.dataset.focusActive==='true'){e.preventDefault();setMessage('Use os controles da sessão antes de abrir suas partidas.');}}}>Minhas partidas</Link>}
        <span>{authenticated ? 'Progresso na sua conta' : 'Exploração local'}</span>
        {!authenticated && <Link href="/auth">Entrar</Link>}
      </header>
      <main id="main" className="play-main">
        {!ready ? (
          <p>Abrindo seu quarto…</p>
        ) : loadError ? (
          <section className="panel">
            <h1>Seu quarto continua aqui.</h1>
            <p role="alert">{loadError}</p>
            <Button onClick={() => location.reload()}>Tentar novamente</Button>
          </section>
        ) : !state ? (
          <p role="alert">Não foi possível carregar o progresso neste navegador.</p>
        ) : (
          <>
            {message && (
              <div className="notice" role="status">
                {message}
              </div>
            )}
            {!authenticated && (
              <p className="local-room-note">
                Exploração neste dispositivo: personagem, sessões concluídas e distribuições ficam
                neste navegador. Minutos locais não são validados pelo servidor nem transferidos
                para uma conta.
              </p>
            )}
            {view === 'editor' || !resident ? (
              <AdultEditor
                initial={resident?.appearance}
                name={resident?.name}
                busy={busy}
                onClose={() => (resident ? setView('room') : location.assign('/'))}
                onSave={async (name, appearance) => {
                  setBusy(true);
                  try {
                    const next = await run(
                      resident
                        ? {
                            action: 'appearance',
                            payload: { characterId: resident.id, appearance },
                          }
                        : { action: 'create', payload: { name, appearance } },
                    );
                    setSelected(next.residents[0]?.id ?? '');
                    setView('room');
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            ) : view === 'focus' && focusResident ? (
              <Focus
                character={{
                  id: focusResident.id,
                  name: focusResident.name,
                  appearance: defaultAppearance,
                  born_at: new Date().toISOString(),
                  birth_read: true,
                  life_xp: 0,
                  first_memory: null,
                }}
                authenticated={authenticated}
                saveId={state.save_id}
                residentId={focusResident.id}
                recovered={recovered}
                portrait={
                  <SpritePreview appearance={focusResident.appearance} label={focusResident.name} />
                }
                distributeMinutes
                exitLabel="Voltar ao quarto"
                onCompleted={completed}
                onExit={() => {
                  setView('room');
                  if (authenticated)
                    refreshRoom(state?.save_id)
                      .then(accept)
                      .catch(() => setMessage('Recarregue para conferir o estado salvo.'));
                }}
              />
            ) : (
              <>
                <div className="room-section-heading">
                  <div>
                    <span className="eyebrow">VILA AURORA · SEU PRIMEIRO QUARTO</span>
                    <h1>
                      Um quarto, <em>um mundo.</em>
                    </h1>
                    <p>Você escolhe o próximo passo. {resident.name} encontra o caminho.</p>
                  </div>
                  <button className="text-button" onClick={() => setView('editor')}>
                    Editar aparência
                  </button>
                </div>
                <div className="room-layout">
                  <section className="room-stage">
                    <div className="resident-strip">
                      <label>
                        Morador
                        <select value={resident.id} onChange={(e) => setSelected(e.target.value)}>
                          {state.residents.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} · {c.life_stage === 'adult' ? 'Adulto' : c.life_stage}
                            </option>
                          ))}
                        </select>
                      </label>
                      <span>{stateLabels[resident.animation_state]}</span>
                    </div>
                    <RoomCanvas key={`${state.save_id ?? 'local'}:${resident.id}`} resident={resident} onArrive={arrival} />
                    <p className="scene-note">
                      {resident.current_activity
                        ? activities[resident.current_activity].description
                        : 'As janelas estão abertas. Escolha uma atividade para começar.'}
                    </p>
                  </section>
                  <aside className="room-sidebar">
                    <section className="panel">
                      <h2>O que vem agora?</h2>
                      <div className="activity-menu">
                        {Object.values(activities).map((a) => (
                          <button
                            key={a.id}
                            disabled={busy || !a.stages.includes(resident.life_stage)}
                            aria-pressed={resident.current_activity === a.id}
                            className={resident.current_activity === a.id ? 'selected' : ''}
                            onClick={() => changeActivity(a.id)}
                          >
                            <strong>{a.label}</strong>
                            <span>
                              {a.id === 'study'
                                ? 'Conhecimento e autonomia'
                                : a.id === 'read'
                                  ? 'Conhecimento e criatividade'
                                  : 'Energia e bem-estar'}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="small-note">
                        Atividades não gastam minutos sozinhas. Você decide o que desenvolver depois
                        do foco.
                      </p>
                      <Button
                        disabled={
                          busy ||
                          !!(
                            recovered &&
                            !state.residents.some((c) => c.id === recovered.character_id)
                          )
                        }
                        onClick={() => {
                          setFocusResident(
                            state.residents.find((c) => c.id === recovered?.character_id) ??
                              resident,
                          );
                          setView('focus');
                          setMessage('');
                        }}
                      >
                        {recovered ? 'Retomar sessão anterior' : 'Começar meu foco'}
                      </Button>
                      {recovered &&
                        !state.residents.some((c) => c.id === recovered.character_id) && (
                          <p className="small-note">
                            Há uma sessão no fluxo de nascimento. Abra Meu universo para recuperá-la
                            antes de iniciar outra.
                          </p>
                        )}
                    </section>
                    <section className="panel resident-progress">
                      <h2>O tempo que floresceu.</h2>
                      <dl>
                        <div>
                          <dt>Conhecimento</dt>
                          <dd>{resident.skills.knowledge}</dd>
                        </div>
                        <div>
                          <dt>Criatividade</dt>
                          <dd>{resident.skills.creativity}</dd>
                        </div>
                        <div>
                          <dt>Autonomia</dt>
                          <dd>{resident.skills.autonomy}</dd>
                        </div>
                        <div>
                          <dt>Bem-estar</dt>
                          <dd>{resident.skills.wellbeing}</dd>
                        </div>
                        <div>
                          <dt>Energia</dt>
                          <dd>{resident.needs.energy}/100</dd>
                        </div>
                      </dl>
                      <p className="small-note">
                        Sem perdas por ausência. Envelhecer será uma escolha sua.
                      </p>
                    </section>
                  </aside>
                </div>
                <section className="time-bank">
                  <div>
                    <span>Foco histórico {authenticated ? 'confirmado' : 'local'}</span>
                    <strong>{balance.historical} min</strong>
                  </div>
                  <div>
                    <span>Disponível para distribuir</span>
                    <strong>{balance.available} min</strong>
                  </div>
                  <div>
                    <span>Minutos distribuídos</span>
                    <strong>{balance.distributed} min</strong>
                  </div>
                  <Button
                    variant="secondary"
                    disabled={busy || balance.available < 1 || !!pendingAllocation}
                    onClick={openAllocation}
                  >
                    Distribuir minutos
                  </Button>
                </section>
                {pendingAllocation && (
                  <section className="panel pending-allocation">
                    <h2>Uma distribuição aguarda confirmação.</h2>
                    <p>
                      O mesmo pedido será consultado novamente. Os minutos não serão aplicados duas
                      vezes.
                    </p>
                    <Button disabled={busy} onClick={() => distribute(pendingAllocation)}>
                      Conferir distribuição pendente
                    </Button>
                  </section>
                )}
                {allocation && !pendingAllocation && (
                  <section className="panel allocation-panel">
                    <div className="section-heading">
                      <h2>Onde seu tempo vai florescer?</h2>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setAllocation(false)}
                      >
                        Fechar
                      </button>
                    </div>
                    {lines.map((line, index) => (
                      <div className="allocation-line" key={index}>
                        <label>
                          Sessão
                          <select
                            value={line.sessionId}
                            onChange={(e) => patchLine(index, { sessionId: e.target.value })}
                          >
                            {state.credits
                              .filter((c) => c.eligible_minutes > c.allocated_minutes)
                              .map((c, i) => (
                                <option key={c.session_id} value={c.session_id}>
                                  Sessão {i + 1} · {c.eligible_minutes - c.allocated_minutes} min
                                  livres
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Personagem
                          <select
                            value={line.characterId}
                            onChange={(e) => patchLine(index, { characterId: e.target.value })}
                          >
                            {state.residents.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Atividade
                          <select
                            value={line.activity}
                            onChange={(e) =>
                              patchLine(index, {
                                activity: e.target.value as AllocationLine['activity'],
                              })
                            }
                          >
                            {Object.values(activities)
                              .filter((a) =>
                                a.stages.includes(
                                  state.residents.find((c) => c.id === line.characterId)
                                    ?.life_stage ?? 'adult',
                                ),
                              )
                              .map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.label}
                                </option>
                              ))}
                          </select>
                        </label>
                        <label>
                          Minutos
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={line.minutes}
                            onChange={(e) => patchLine(index, { minutes: Number(e.target.value) })}
                          />
                        </label>
                        {lines.length > 1 && (
                          <button
                            aria-label={`Remover distribuição ${index + 1}`}
                            className="text-button"
                            onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="allocation-actions">
                      <button
                        className="text-button"
                        disabled={lines.length >= 20 || busy}
                        onClick={() => setLines((prev) => [...prev, { ...prev[0], minutes: 1 }])}
                      >
                        Adicionar outra distribuição
                      </button>
                      <Button disabled={busy} onClick={() => distribute()}>
                        {busy ? 'Confirmando…' : 'Confirmar distribuição'}
                      </Button>
                    </div>
                  </section>
                )}
                <section className="allocation-history">
                  <h2>Pequenos passos guardados.</h2>
                  {state.allocations.length ? (
                    <ul className="session-list">
                      {state.allocations.slice(0, 10).map((a) => (
                        <li key={a.id}>
                          <div>
                            <strong>
                              {state.residents.find((c) => c.id === a.character_id)?.name ??
                                'Pomin'}{' '}
                              ·{' '}
                              {a.activity_id in careLabels
                                ? careLabels[a.activity_id as CareId]
                                : activities[a.activity_id as keyof typeof activities].label}
                            </strong>
                            <span>{new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <strong>{a.minutes} min</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      Quando você distribuir seus minutos, as primeiras conquistas vão aparecer
                      aqui.
                    </p>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>
      <footer className="play-footer">
        <span>O foco cuida do tempo. Você escolhe a história.</span>
        <Link href="/credits">Arte e atribuições LPC</Link>
      </footer>
    </div>
  );
}
