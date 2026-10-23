'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FocusDurationDial } from './focus-duration-dial';
import { clampMinutes } from './dial-math';
import { Pomin } from '@/components/characters/pomin';
import type { Character } from '@/features/character-creator/model';
import { gameApi } from '@/lib/api';
import { usePreferences } from '@/features/preferences/provider';
import {
  DURATIONS,
  formatTime,
  HEARTBEAT_MS,
  eligibleInterval,
  type FocusSession,
  type FocusStatus,
} from './model';
type WakeLockHandle = {
  release: () => Promise<void>;
  addEventListener: (event: string, fn: () => void) => void;
};
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
  distributeMinutes = false,
  exitLabel = 'Voltar ao meu universo',
}: {
  character: Character;
  authenticated: boolean;
  recovered: FocusSession | null;
  onExit: (settled?: FocusSession | null) => void;
  onCompleted: (s: FocusSession) => void;
  portrait?: React.ReactNode;
  residentId?: string;
  saveId?: string;
  compact?: boolean;
  distributeMinutes?: boolean;
  exitLabel?: string;
}) {
  const { preferences } = usePreferences();
  const [minutes, setMinutes] = useState(preferences.focus_minutes);
  const [task, setTask] = useState('');
  const [step, setStep] = useState('');
  const [status, setStatus] = useState<FocusStatus>('idle');
  const [session, setSession] = useState<FocusSession | null>(null);
  const [display, setDisplay] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [wake, setWake] = useState('Ainda não solicitado');
  const current = useRef<FocusSession | null>(null);
  const active = useRef(false);
  const inFlight = useRef(false);
  const lastAck = useRef(0);
  const nextSeq = useRef(0);
  const lock = useRef<WakeLockHandle | null>(null);
  const client = useRef('');
  const interrupted = useRef(false);
  const pendingCommand = useRef<Record<string, unknown> | null>(null);
  const recoverDone = useRef(false);
  const startId = useRef('');
  const apply = useCallback((s: FocusSession) => {
    current.current = s;
    nextSeq.current = s.sequence;
    setSession(s);
    setStatus(s.status);
    active.current = s.status === 'active';
    lastAck.current = performance.now();
    setDisplay(s.validated_ms);
    document.documentElement.dataset.focusActive = String(active.current);
  }, []);
  const release = useCallback(async () => {
    const previous = lock.current;
    lock.current = null;
    if (previous)
      try {
        await previous.release();
      } catch {}
    setWake('Tela pode apagar');
  }, []);
  const pause = useRef<(reason: string) => void>(() => {});
  async function requestWake() {
    if (!('wakeLock' in navigator)) {
      setWake('Tela ativa indisponível neste navegador');
      return;
    }
    try {
      const handle = await (
        navigator as Navigator & {
          wakeLock: { request: (type: string) => Promise<WakeLockHandle> };
        }
      ).wakeLock.request('screen');
      if (!active.current) {
        await handle.release();
        return;
      }
      lock.current = handle;
      setWake('Tela ativa');
      handle.addEventListener('release', () => {
        if (lock.current === handle) {
          lock.current = null;
          setWake('Tela ativa liberada pelo sistema');
          if (active.current)
            pause.current('A tela ativa foi liberada. Retome quando estiver pronto.');
        }
      });
    } catch {
      setWake('Tela ativa indisponível. Mantenha a tela ligada.');
    }
  }
  async function send(action: string, extra: Record<string, unknown> = {}) {
    const s = current.current;
    if (!s) throw Error('Sessão indisponível.');
    if (pendingCommand.current && pendingCommand.current.action !== action)
      throw Error('Há uma operação pendente. Tente a mesma ação novamente ou recupere a sessão.');
    const payload = pendingCommand.current ?? {
      kind: 'focus',
      action,
      id: s.id,
      clientId: client.current,
      sequence: nextSeq.current + 1,
      ...extra,
    };
    pendingCommand.current = payload;
    try {
      const result = await gameApi<FocusSession>(payload);
      pendingCommand.current = null;
      return result;
    } catch (e) {
      throw e;
    }
  }
  useLayoutEffect(() => {
    pause.current = (reason: string) => {
      if (!active.current) return;
      active.current = false;
      interrupted.current = true;
      document.documentElement.dataset.focusActive = 'false';
      setStatus('interrupted');
      setMessage(reason);
      setDisplay(current.current?.validated_ms ?? 0);
      void release();
      if (authenticated && !inFlight.current && current.current) {
        inFlight.current = true;
        send('pause')
          .then((s) => {
            apply(s);
            setStatus('interrupted');
          })
          .catch(() =>
            setMessage(
              'A conexão foi interrompida. Recupere a sessão para preservar somente o tempo confirmado.',
            ),
          )
          .finally(() => {
            inFlight.current = false;
          });
      } else if (!authenticated && current.current) {
        apply({ ...current.current, status: 'interrupted' });
      }
    };
  });
  useEffect(() => {
    client.current = crypto.randomUUID();
    const stop = () =>
      pause.current('Uma pausa por aqui. Ao sair da tela, o tempo para; seu progresso fica.');
    const hide = () => {
      if (document.visibilityState !== 'visible') stop();
    };
    const offline = () => pause.current('Sem conexão. O tempo confirmado continua salvo.');
    window.addEventListener('blur', stop);
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', hide);
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('blur', stop);
      window.removeEventListener('pagehide', stop);
      window.removeEventListener('pageshow', hide);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('offline', offline);
      active.current = false;
      document.documentElement.dataset.focusActive = 'false';
      void release();
    };
  }, [release]);
  useEffect(() => {
    if (!recovered || recoverDone.current) return;
    recoverDone.current = true;
    apply({ ...recovered, status: 'interrupted' });
    setBusy(true);
    gameApi<FocusSession>({
      kind: 'focus',
      action: 'recover',
      id: recovered.id,
      clientId: client.current,
      sequence: 0,
    })
      .then((s) => {
        apply(s);
        setMessage(
          'Encontramos sua sessão. O tempo sem confirmação não foi contado. Retome quando quiser.',
        );
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setBusy(false));
  }, [recovered, apply]);
  useEffect(() => {
    const interval = setInterval(async () => {
      const s = current.current;
      if (!s || !active.current || inFlight.current) return;
      if (document.visibilityState !== 'visible' || !document.hasFocus() || !navigator.onLine) {
        pause.current('O foco fez uma pausa. Retome quando estiver pronto.');
        return;
      }
      inFlight.current = true;
      try {
        let updated: FocusSession;
        if (authenticated) updated = await send('heartbeat');
        else {
          const now = performance.now();
          const credit = eligibleInterval(lastAck.current, now);
          updated = {
            ...s,
            sequence: s.sequence + 1,
            validated_ms: Math.min(s.planned_seconds * 1000, s.validated_ms + credit),
            status: credit ? 'active' : 'interrupted',
          };
        }
        if (interrupted.current) {
          current.current = updated;
          nextSeq.current = updated.sequence;
          setSession(updated);
          if (authenticated) {
            pendingCommand.current = null;
            const paused = await send('pause');
            apply(paused);
          } else apply({ ...updated, status: 'interrupted' });
          setStatus('interrupted');
          return;
        }
        apply(updated);
        if (updated.status !== 'active') {
          void release();
          setMessage('A confirmação demorou além do permitido. Seu tempo anterior foi preservado.');
        }
        if (updated.validated_ms >= updated.planned_seconds * 1000) {
          active.current = false;
          document.documentElement.dataset.focusActive = 'false';
          setStatus('completing');
          const finished = authenticated
            ? await send('complete')
            : { ...updated, status: 'completed' as const };
          apply(finished);
          await release();
          onCompleted(finished);
        }
      } catch (e) {
        active.current = false;
        document.documentElement.dataset.focusActive = 'false';
        interrupted.current = true;
        setStatus('interrupted');
        setDisplay(current.current?.validated_ms ?? 0);
        setMessage(
          e instanceof Error ? e.message : 'Não foi possível confirmar. Recupere a sessão.',
        );
        void release();
      } finally {
        inFlight.current = false;
      }
    }, HEARTBEAT_MS);
    const visual = setInterval(() => {
      const s = current.current;
      if (active.current && s)
        setDisplay(
          Math.min(
            s.planned_seconds * 1000,
            s.validated_ms + Math.min(5000, performance.now() - lastAck.current),
          ),
        );
    }, 250);
    return () => {
      clearInterval(interval);
      clearInterval(visual);
    };
    // Start a fresh interval when start/resume is acknowledged, not at mount time.
  }, [authenticated, apply, release, onCompleted, status]);
  async function start() {
    if (!navigator.onLine || document.visibilityState !== 'visible') {
      setMessage('Conecte-se e mantenha o Pomins visível para começar.');
      return;
    }
    setBusy(true);
    setMessage('');
    setStatus('starting');
    interrupted.current = false;
    if (!startId.current) startId.current = crypto.randomUUID();
    try {
      let s: FocusSession;
      if (authenticated)
        s = await gameApi<FocusSession>({
          kind: 'focus',
          saveId,
          characterId: character.id,
          action: 'start',
          id: startId.current,
          clientId: client.current,
          sequence: 0,
          minutes,
          task,
          firstStep: step,
          residentId,
        });
      else
        s = {
          id: startId.current,
          character_id: character.id,
          status: 'active',
          planned_seconds: minutes * 60,
          validated_ms: 0,
          sequence: 0,
          client_id: client.current,
          task,
          first_step: step,
          reward_xp: 0,
          last_seen_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
      apply(s);
      await requestWake();
    } catch (e) {
      setStatus('idle');
      setMessage(e instanceof Error ? e.message : 'Não foi possível iniciar.');
    } finally {
      setBusy(false);
    }
  }
  async function resume() {
    if (inFlight.current) return;
    if (!navigator.onLine || document.visibilityState !== 'visible') {
      setMessage('Conecte-se e mantenha o Pomins visível para retomar.');
      return;
    }
    setBusy(true);
    try {
      if (authenticated) {
        pendingCommand.current = null;
        const s = current.current;
        if (!s) throw Error('Recarregue a página para recuperar.');
        const recoveredSession = await gameApi<FocusSession>({
          kind: 'focus',
          action: 'recover',
          id: s.id,
          clientId: client.current,
          sequence: 0,
        });
        apply(recoveredSession);
        const resumed = await send('resume');
        apply(resumed);
      } else if (current.current) apply({ ...current.current, status: 'active' });
      interrupted.current = false;
      setMessage('');
      await requestWake();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Não foi possível retomar.');
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!current.current) {
      onExit();
      return;
    }
    if (inFlight.current) return;
    setBusy(true);
    active.current = false;
    try {
      pendingCommand.current = null;
      if (authenticated) {
        const rec = await gameApi<FocusSession>({
          kind: 'focus',
          action: 'recover',
          id: current.current.id,
          clientId: client.current,
          sequence: 0,
        });
        apply(rec);
        const s = await send('cancel');
        apply(s);
      } else apply({ ...current.current, status: 'cancelled' });
      await release();
      setMessage(
        'O tempo já confirmado ficou no histórico. Sessões encerradas antes da meta não concedem recompensas.',
      );
    } catch (e) {
      setStatus('interrupted');
      setMessage(e instanceof Error ? e.message : 'Recupere a sessão.');
    } finally {
      setBusy(false);
    }
  }
  const running = ['active', 'paused', 'interrupted', 'completing'].includes(status);
  const target = (session?.planned_seconds ?? minutes * 60) * 1000;
  const progress = Math.min(100, (display / target) * 100);
  const selectedMinutes = compact && session ? session.planned_seconds / 60 : minutes;
  return (
    <section className={compact ? 'focus-page compact-focus' : 'focus-page'}>
      <button className="back-link" disabled={running || busy} onClick={() => onExit(session)}>
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
                ? 'Um pequeno passo. Uma conquista.'
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
              onAction={
                status === 'idle'
                  ? start
                  : status === 'active'
                    ? () => pause.current('Pausa feita. Retome quando estiver pronto.')
                    : status === 'paused' || status === 'interrupted'
                      ? resume
                      : undefined
              }
            />
          )}
          <div
            className="timer-orbit"
            style={{ '--progress': `${progress}%` } as React.CSSProperties}
          >
            {portrait ?? <Pomin appearance={character.appearance} sleeping />}
            <div className="timer-number" role="timer" aria-label="Tempo restante">
              {formatTime(target - display)}
            </div>
            <span className="timer-caption">
              {running ? session?.task || 'Um passo de cada vez' : 'DOIS MINUTINHOS TAMBÉM CONTAM'}
            </span>
          </div>
          <div className="timer-controls">
            {status === 'idle' || status === 'starting' ? (
              compact ? (
                <p className="dial-ready-hint">
                  Gire a borda para ajustar. Toque no centro para começar.
                </p>
              ) : (
                <Button disabled={busy} onClick={start}>
                  <Play size={18} />
                  {busy ? 'Preparando…' : 'Começar meu foco'}
                </Button>
              )
            ) : status === 'active' ? (
              <>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => pause.current('Pausa feita. Retome quando estiver pronto.')}
                >
                  <Pause size={18} /> Pausar
                </Button>
                {/* The handler also checks the imperative request lock; keep the existing UI snapshot. */}
                {/* eslint-disable-next-line react-hooks/refs */}
                <Button variant="ghost" disabled={busy || inFlight.current} onClick={cancel}>
                  <Square size={15} /> Encerrar
                </Button>
              </>
            ) : status === 'interrupted' || status === 'paused' ? (
              <>
                <Button disabled={busy} onClick={resume}>
                  <Play size={17} />
                  {busy ? 'Recuperando…' : 'Retomar meu foco'}
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
                <Button onClick={() => onExit(session)}>{exitLabel}</Button>
              </div>
            ) : (
              <Button onClick={() => onExit(session)}>{exitLabel}</Button>
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
