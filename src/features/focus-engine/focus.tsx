'use client';
import { useCallback, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowLeft, Check, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FocusDurationDial } from './focus-duration-dial';
import { clampMinutes } from './dial-math';
import { Pomin } from '@/components/characters/pomin';
import type { Character } from '@/features/character-creator/model';
import { usePreferences } from '@/features/preferences/provider';
import { PortalLink } from '@/features/portal/navigation';
import { useFocusRuntime } from './provider';
import type { FocusRuntime } from './runtime';
import { DURATIONS, formatTime, type FocusSession } from './model';
function RemainingTime({ runtime, target }: { runtime: FocusRuntime; target: number }) {
  const display = useSyncExternalStore(
    runtime.subscribeClock,
    runtime.getClock,
    runtime.getServerClock,
  );
  return (
    <span className="timer-number" role="timer" aria-label="Tempo restante">
      {formatTime(target - display)}
    </span>
  );
}
function TimerOrbit({
  runtime,
  target,
  portrait,
  caption,
}: {
  runtime: FocusRuntime;
  target: number;
  portrait: React.ReactNode;
  caption: string;
}) {
  const display = useSyncExternalStore(
    runtime.subscribeClock,
    runtime.getClock,
    runtime.getServerClock,
  );
  return (
    <div
      className="timer-orbit"
      style={{ '--progress': Math.min(100, (display / target) * 100) + '%' } as React.CSSProperties}
    >
      {portrait}
      <div className="timer-number" role="timer" aria-label="Tempo restante">
        {formatTime(target - display)}
      </div>
      <span className="timer-caption">{caption}</span>
    </div>
  );
}
export function Focus({
  character,
  authenticated,
  recovered,
  onExit,
  onCompleted,
  portrait,
  residentId,
  saveId,
  compact = false,
  nursery = false,
  distributeMinutes = false,
  exitLabel = 'Voltar ao meu universo',
}: {
  character: Character;
  authenticated: boolean;
  recovered: FocusSession | null;
  onExit: (settled?: FocusSession | null) => void;
  onCompleted: (session: FocusSession) => void;
  portrait?: React.ReactNode;
  residentId?: string;
  saveId?: string;
  compact?: boolean;
  nursery?: boolean;
  distributeMinutes?: boolean;
  exitLabel?: string;
}) {
  const runtime = useFocusRuntime();
  const { session, status, busy, message, wake } = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getServerSnapshot,
  );
  const { preferences } = usePreferences();
  const [minutes, setMinutes] = useState(preferences.focus_minutes),
    [task, setTask] = useState(''),
    [step, setStep] = useState('');
  useLayoutEffect(() => {
    runtime.attach({ character, authenticated, saveId, residentId, onCompleted }, recovered);
  }, [runtime, character, authenticated, saveId, residentId, onCompleted, recovered]);
  const start = useCallback(
    () => runtime.start(minutes, task, step),
    [runtime, minutes, task, step],
  );
  const resume = runtime.resume,
    cancel = runtime.cancel;
  const target = (session?.planned_seconds ?? minutes * 60) * 1000;
  const readout = useMemo(
    () => (nursery ? <RemainingTime runtime={runtime} target={target} /> : undefined),
    [nursery, runtime, target],
  );
  const exit = () => {
    onExit(session);
    runtime.reset();
  };
  if (
    session &&
    session.character_id !== character.id &&
    !['completed', 'cancelled', 'expired'].includes(status)
  )
    return (
      <section className="focus-page compact-focus">
        <p role="status">Há um foco em andamento no Pomin de origem.</p>
        <PortalLink href={session.origin_save_id ? '/game/' + session.origin_save_id : '/'}>
          Voltar ao foco
        </PortalLink>
      </section>
    );
  const running = ['active', 'paused', 'interrupted', 'completing'].includes(status);
  const selectedMinutes = compact && session ? session.planned_seconds / 60 : minutes;
  return (
    <section
      className={`${compact ? 'focus-page compact-focus' : 'focus-page'}${nursery ? ' nursery-focus' : ''}`}
    >
      <button className="back-link" disabled={running || busy} onClick={() => exit()}>
        <ArrowLeft size={17} /> {exitLabel}
      </button>
      <header className="focus-heading">
        <span className="eyebrow">VIVA · UM MOMENTO DE CADA VEZ</span>
        <h1>
          Seu foco abre
          <br />
          <em>novos capítulos.</em>
        </h1>
        <p>{character.name} descansa por aqui. Agora, esse tempo é seu.</p>
      </header>
      <div className="focus-grid">
        <div className="timer-card">
          <div className="focus-status">
            <span className={status === 'active' ? 'status-dot active' : 'status-dot'} />
            {status === 'active'
              ? 'Seu momento de foco'
              : status === 'completed'
                ? 'Foco concluído'
                : status === 'interrupted' || status === 'paused'
                  ? 'Pausa acolhida'
                  : status === 'cancelled'
                    ? 'Sessão encerrada'
                    : 'Sem pressa. Só começar.'}
          </div>
          {compact && (
            <FocusDurationDial
              minutes={selectedMinutes}
              status={status}
              busy={busy}
              onChange={setMinutes}
              readout={readout}
              onAction={
                status === 'idle'
                  ? start
                  : status === 'active'
                    ? runtime.pause
                    : status === 'paused' || status === 'interrupted'
                      ? resume
                      : undefined
              }
            />
          )}
          {!nursery && (
            <TimerOrbit
              runtime={runtime}
              target={target}
              portrait={portrait ?? <Pomin appearance={character.appearance} sleeping />}
              caption={
                running ? session?.task || 'Um passo de cada vez' : 'DOIS MINUTINHOS TAMBÉM CONTAM'
              }
            />
          )}
          <div
            className={`timer-controls${nursery && (status === 'idle' || status === 'starting') ? ' nursery-idle-controls' : ''}`}
          >
            {status === 'idle' || status === 'starting' ? (
              compact ? (
                <p className="dial-ready-hint">
                  Gire a borda para ajustar. Toque no centro para começar.
                </p>
              ) : (
                <Button disabled={busy} onClick={start}>
                  <Play size={18} />
                  {busy ? 'Preparando…' : 'Iniciar foco'}
                </Button>
              )
            ) : status === 'active' || status === 'completing' ? (
              <>
                <Button
                  variant="secondary"
                  disabled={busy || status === 'completing'}
                  onClick={runtime.pause}
                >
                  <Pause size={18} /> Pausar
                </Button>
                <Button variant="ghost" disabled={busy || status === 'completing'} onClick={cancel}>
                  <Square size={15} /> Encerrar
                </Button>
              </>
            ) : status === 'interrupted' || status === 'paused' ? (
              <>
                <Button disabled={busy} onClick={resume}>
                  <Play size={17} />
                  {busy ? 'Recuperando…' : 'Retomar foco'}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={cancel}>
                  Encerrar sessão
                </Button>
              </>
            ) : status === 'completed' ? (
              <div className="completion">
                <Check size={26} />
                <strong>
                  {distributeMinutes
                    ? `${Math.floor((session?.validated_ms ?? 0) / 60000)} min ${authenticated ? 'para distribuir' : 'locais para distribuir'}`
                    : authenticated
                      ? `+${session?.reward_xp ?? 0} XP de vida`
                      : 'Você reservou um tempo para começar.'}
                </strong>
                <p>
                  {distributeMinutes
                    ? authenticated
                      ? 'Seus minutos estão salvos. Escolha onde investir depois de voltar ao quarto.'
                      : 'Minutos de exploração salvos neste navegador. Eles não são validados nem enviados à sua conta.'
                    : authenticated
                      ? 'Seu progresso foi guardado. As histórias esperam por você.'
                      : 'Sessão local concluída, sem XP. Entre para validar foco e desenvolver seu Pomin.'}
                </p>
                <Button onClick={() => exit()}>{exitLabel}</Button>
              </div>
            ) : (
              <Button onClick={() => exit()}>{exitLabel}</Button>
            )}
          </div>
          {message && (
            <p className="focus-message" role="status">
              {message}
            </p>
          )}
          <div className="focus-footnotes">
            <span>{wake}</span>
            <span>
              {authenticated
                ? 'Validação no servidor'
                : distributeMinutes
                  ? 'Exploração local · sem progresso na conta'
                  : 'Exploração local · sem recompensas'}
            </span>
          </div>
          {session && (
            <p className="small-note">
              Planejado: {session.planned_seconds / 60} min · Confirmado:{' '}
              {formatTime(session.validated_ms)}
            </p>
          )}
        </div>
        <details
          className="focus-configuration"
          style={compact ? undefined : { display: 'contents' }}
          open={compact ? undefined : true}
        >
          <summary hidden={!compact}>Duração e intenção do foco</summary>
          <aside className="focus-options">
            <div className="panel">
              <span className="eyebrow">UM TEMPO PARA VOCÊ</span>
              <h2>Quanto cabe agora?</h2>
              <div className="duration-grid">
                {DURATIONS.map((n) => (
                  <button
                    disabled={status !== 'idle'}
                    key={n}
                    className={selectedMinutes === n ? 'selected' : ''}
                    aria-pressed={selectedMinutes === n}
                    onClick={() => setMinutes(n)}
                  >
                    {n}
                    <span>min</span>
                    {n === 2 && <small>Só começar</small>}
                  </button>
                ))}
              </div>
              <label>
                Ou escolha seu tempo (2 a 120 min)
                <input
                  type="number"
                  min="2"
                  max="120"
                  disabled={status !== 'idle'}
                  value={selectedMinutes}
                  onChange={(e) =>
                    setMinutes(
                      compact
                        ? clampMinutes(Number(e.target.value))
                        : Math.min(120, Math.max(2, Number(e.target.value) || 2)),
                    )
                  }
                />
              </label>
            </div>
            <div className="panel">
              <h2>Um pequeno primeiro passo.</h2>
              <label>
                O que você quer fazer?
                <input
                  disabled={status !== 'idle'}
                  maxLength={160}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Ex.: preparar a apresentação"
                />
              </label>
              <label>
                Por onde você pode começar?
                <input
                  disabled={status !== 'idle'}
                  maxLength={160}
                  value={step}
                  onChange={(e) => setStep(e.target.value)}
                  placeholder="Ex.: abrir o arquivo"
                />
              </label>
              <small className="muted">Só você vê suas atividades.</small>
            </div>
            <div className="cozy-note">
              <p>
                Mantenha o Pomins aberto e a tela ligada. Ao trocar de aplicativo ou perder a
                conexão, o foco pausa. Nenhuma história vai interromper você.
              </p>
            </div>
          </aside>
        </details>
      </div>
    </section>
  );
}
