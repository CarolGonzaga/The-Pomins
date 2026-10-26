import { HEARTBEAT_MS, eligibleInterval, type FocusSession, type FocusStatus } from './model';
import type { Character } from '../character-creator/model';
import { gameApi } from '@/lib/api';
export type FocusContext = {
  character: Character;
  authenticated: boolean;
  saveId?: string;
  residentId?: string;
  onCompleted: (session: FocusSession) => void;
};
export type FocusSnapshot = {
  session: FocusSession | null;
  status: FocusStatus;
  busy: boolean;
  message: string;
  wake: string;
};
const idle: FocusSnapshot = {
  session: null,
  status: 'idle',
  busy: false,
  message: '',
  wake: 'Ainda não solicitado',
};
const terminal = (s: FocusStatus) => ['completed', 'cancelled', 'expired'].includes(s);
/** Confirmed-only, monotonic presentation. The visual clock never invents earned time. */
export class ConfirmedFocusClock {
  private id = '';
  private bound = 0;
  private anchor = 0;
  private at = 0;
  private running = false;
  accept(s: FocusSession, now: number) {
    if (this.id !== s.id) {
      this.id = s.id;
      this.bound = 0;
      this.anchor = 0;
      this.at = now;
      this.running = false;
    }
    const previous = this.value(now);
    this.bound = Math.max(this.bound, s.validated_ms);
    this.anchor = s.status === 'active' && this.running ? previous : this.bound;
    this.at = now;
    this.running = s.status === 'active';
  }
  value(now: number) {
    return Math.min(this.bound, this.anchor + (this.running ? Math.max(0, now - this.at) : 0));
  }
  clear() {
    this.id = '';
    this.bound = 0;
    this.anchor = 0;
    this.at = 0;
    this.running = false;
  }
}
/** One controller per account/document, hosted above all routes. No economy or SQL rules here. */
export class FocusRuntime {
  private state: FocusSnapshot = idle;
  private listeners = new Set<() => void>();
  private clockListeners = new Set<() => void>();
  private clock = new ConfirmedFocusClock();
  private clockValue = 0;
  private context: FocusContext | null = null;
  private clientId = '';
  private lastAck = 0;
  private flight: Promise<void> | null = null;
  private pending: Record<string, unknown> | null = null;
  private startId = '';
  private interrupted = false;
  private notified = new Set<string>();
  private wakeLock: {
    release: () => Promise<void>;
    addEventListener: (name: string, cb: () => void) => void;
  } | null = null;
  constructor(
    private accountId: string,
    private transport: typeof gameApi = gameApi,
    private now = () => performance.now(),
  ) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  subscribeClock = (fn: () => void) => {
    this.clockListeners.add(fn);
    return () => {
      this.clockListeners.delete(fn);
    };
  };
  getSnapshot = () => this.state;
  getServerSnapshot = () => idle;
  getClock = () => this.clockValue;
  getServerClock = () => 0;
  private emit(patch: Partial<FocusSnapshot>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
  }
  private renderClock() {
    const value = Math.floor(this.clock.value(this.now()) / 1000) * 1000;
    if (value !== this.clockValue) {
      this.clockValue = value;
      for (const fn of this.clockListeners) fn();
    }
  }
  private cacheKey() {
    return `pomins-focus-confirmed-v2:${this.accountId}`;
  }
  private apply(s: FocusSession) {
    const previous = this.state.session;
    // Late responses cannot replace a newer acknowledgement or resurrect a terminal session.
    if (
      previous?.id === s.id &&
      (s.validated_ms < previous.validated_ms || (terminal(previous.status) && !terminal(s.status)))
    )
      return;
    this.clock.accept(
      this.interrupted && s.status === 'active' ? { ...s, status: 'interrupted' } : s,
      this.now(),
    );
    this.lastAck = this.now();
    this.emit({
      session: s,
      status: this.interrupted && s.status === 'active' ? 'interrupted' : s.status,
    });
    document.documentElement.dataset.focusActive = String(
      s.status === 'active' && !this.interrupted,
    );
    this.renderClock();
    try {
      sessionStorage.setItem(this.cacheKey(), JSON.stringify(s));
    } catch {
      /* Backend remains canonical. */
    }
  }
  mount() {
    const hide = () => {
      if (document.visibilityState !== 'visible')
        this.interrupt('Ao sair do app, o foco pausa. Retome quando estiver pronto.');
    };
    const pagehide = () => this.interrupt('Sua sessão ficou guardada. Retome para continuar.');
    const offline = () => this.interrupt('Sem conexão. O tempo confirmado continua salvo.');
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('offline', offline);
    const tick = setInterval(() => {
      this.renderClock();
      if (
        this.state.status === 'active' &&
        !this.state.busy &&
        !this.flight &&
        this.now() - this.lastAck >= HEARTBEAT_MS
      ) {
        if (!navigator.onLine) offline();
        else if (document.visibilityState !== 'visible') hide();
        else this.heartbeat();
      }
    }, 250);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', pagehide);
      window.removeEventListener('offline', offline);
      this.interrupt('Sessão guardada.');
      void this.releaseWake();
    };
  }
  attach(context: FocusContext, recovered: FocusSession | null) {
    if (!this.clientId) this.clientId = crypto.randomUUID();
    const current = this.state.session;
    if (current && !terminal(this.state.status) && current.character_id !== context.character.id)
      return;
    this.context = context;
    if (current?.character_id === context.character.id) return; // Route/panel remount is not recovery.
    if (current && terminal(this.state.status)) this.reset();
    if (recovered) {
      this.apply({
        ...recovered,
        status: terminal(recovered.status) ? recovered.status : 'interrupted',
      });
      if (!terminal(recovered.status))
        void this.action(async () => {
          this.apply(await this.recover());
          this.emit({ message: 'Sessão restaurada com o tempo confirmado. Retome quando quiser.' });
        });
    } else if (!context.authenticated) {
      try {
        const raw = sessionStorage.getItem(this.cacheKey());
        if (raw) {
          const s = JSON.parse(raw) as FocusSession;
          if (
            s.character_id === context.character.id &&
            typeof s.id === 'string' &&
            Number.isFinite(s.validated_ms) &&
            s.validated_ms >= 0 &&
            s.validated_ms <= s.planned_seconds * 1000
          )
            this.apply({ ...s, status: terminal(s.status) ? s.status : 'interrupted' });
        }
      } catch {
        /* Invalid local data cannot earn account credits. */
      }
    }
  }
  private async releaseWake() {
    const old = this.wakeLock;
    this.wakeLock = null;
    if (old)
      try {
        await old.release();
      } catch {}
    if (!this.wakeLock) this.emit({ wake: 'Tela pode apagar' });
  }
  private async requestWake() {
    if (!('wakeLock' in navigator)) {
      this.emit({ wake: 'Mantenha a tela ligada' });
      return;
    }
    try {
      const handle = await (
        navigator as Navigator & {
          wakeLock: { request: (type: string) => Promise<NonNullable<FocusRuntime['wakeLock']>> };
        }
      ).wakeLock.request('screen');
      if (this.state.status !== 'active') {
        await handle.release();
        return;
      }
      this.wakeLock = handle;
      this.emit({ wake: 'Tela ativa' });
      handle.addEventListener('release', () => {
        if (this.wakeLock === handle) {
          this.wakeLock = null;
          this.emit({ wake: 'Tela ativa liberada pelo sistema' });
          if (document.visibilityState !== 'visible')
            this.interrupt('Ao sair do app, o foco pausa.');
        }
      });
    } catch {
      this.emit({ wake: 'Tela ativa indisponível. Mantenha a tela ligada.' });
    }
  }
  private async send(action: string) {
    const s = this.state.session;
    if (!s) throw Error('Sessão indisponível.');
    if (this.pending && this.pending.action !== action)
      throw Error('Confira a operação pendente antes de continuar.');
    const payload = this.pending ?? {
      kind: 'focus',
      action,
      id: s.id,
      clientId: this.clientId,
      sequence: s.sequence + 1,
    };
    this.pending = payload;
    const result = await this.transport<FocusSession>(payload);
    this.pending = null;
    return result;
  }
  private recover() {
    const s = this.state.session!;
    return this.transport<FocusSession>({
      kind: 'focus',
      action: 'recover',
      id: s.id,
      clientId: this.clientId,
      sequence: 0,
    });
  }
  private async action(operation: () => Promise<void>) {
    if (this.state.busy) return;
    this.emit({ busy: true });
    const previous = this.flight;
    try {
      if (previous) await previous.catch(() => {});
      const flight = operation();
      this.flight = flight;
      await flight;
    } catch (e) {
      this.emit({
        message: e instanceof Error ? e.message : 'Não foi possível confirmar. Confira a sessão.',
      });
    } finally {
      this.flight = null;
      this.emit({ busy: false });
    }
  }
  start = (minutes: number, task: string, step: string) =>
    this.action(async () => {
      const c = this.context;
      if (!c || (this.state.session && !terminal(this.state.status))) return;
      if (!navigator.onLine || document.visibilityState !== 'visible')
        throw Error('Conecte-se e mantenha o Pomins visível para começar.');
      this.interrupted = false;
      this.startId ||= crypto.randomUUID();
      this.emit({ status: 'starting', message: '' });
      try {
        const s = c.authenticated
          ? await this.transport<FocusSession>({
              kind: 'focus',
              action: 'start',
              id: this.startId,
              clientId: this.clientId,
              sequence: 0,
              minutes,
              task,
              firstStep: step,
              saveId: c.saveId,
              characterId: c.character.id,
              residentId: c.residentId,
            })
          : {
              id: this.startId,
              character_id: c.character.id,
              status: 'active' as const,
              planned_seconds: minutes * 60,
              validated_ms: 0,
              sequence: 0,
              client_id: this.clientId,
              task,
              first_step: step,
              reward_xp: 0,
              last_seen_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            };
        this.apply(s);
        void this.requestWake();
      } catch (e) {
        this.emit({ status: 'idle' });
        throw e;
      }
    });
  private heartbeat() {
    const s = this.state.session,
      c = this.context;
    if (!s || !c) return;
    const operation = (async () => {
      try {
        const elapsed = eligibleInterval(this.lastAck, this.now());
        let updated = c.authenticated
          ? await this.send('heartbeat')
          : {
              ...s,
              sequence: s.sequence + 1,
              validated_ms: Math.min(s.planned_seconds * 1000, s.validated_ms + elapsed),
              status: elapsed ? ('active' as const) : ('interrupted' as const),
            };
        this.apply(updated);
        if (this.interrupted) {
          this.pending = null;
          updated = c.authenticated
            ? await this.send('pause')
            : { ...updated, status: 'interrupted' };
          this.apply(updated);
          await this.releaseWake();
          return;
        }
        if (updated.status !== 'active') {
          await this.releaseWake();
          this.emit({
            message: 'A confirmação demorou além do permitido. O tempo anterior foi preservado.',
          });
          return;
        }
        if (updated.validated_ms >= updated.planned_seconds * 1000) {
          this.emit({ status: 'completing' });
          document.documentElement.dataset.focusActive = 'false';
          const finished = c.authenticated
            ? await this.send('complete')
            : { ...updated, status: 'completed' as const };
          this.apply(finished);
          await this.releaseWake();
          if (!this.notified.has(finished.id)) {
            this.notified.add(finished.id);
            this.context?.onCompleted(finished);
          }
        }
      } catch (e) {
        this.interrupted = true;
        const current = this.state.session;
        if (current) this.clock.accept({ ...current, status: 'interrupted' }, this.now());
        this.renderClock();
        document.documentElement.dataset.focusActive = 'false';
        this.emit({
          status: 'interrupted',
          message: e instanceof Error ? e.message : 'Confira sua conexão e recupere a sessão.',
        });
        await this.releaseWake();
      }
    })();
    this.flight = operation;
    void operation.finally(() => {
      if (this.flight === operation) this.flight = null;
    });
  }
  interrupt = (reason: string) => {
    if (this.state.status !== 'active' && this.state.status !== 'completing') return;
    this.interrupted = true;
    const s = this.state.session;
    if (s) this.clock.accept({ ...s, status: 'interrupted' }, this.now());
    this.renderClock();
    document.documentElement.dataset.focusActive = 'false';
    this.emit({ status: 'interrupted', message: reason });
    void this.releaseWake();
    if (!this.flight)
      void this.action(async () => {
        if (!s || terminal(s.status)) return;
        this.apply(
          this.context?.authenticated ? await this.send('pause') : { ...s, status: 'interrupted' },
        );
      });
  };
  pause = () => this.interrupt('Pausa feita. Retome quando estiver pronto.');
  resume = () =>
    this.action(async () => {
      if (!this.state.session || terminal(this.state.status)) return;
      if (!navigator.onLine || document.visibilityState !== 'visible')
        throw Error('Conecte-se e mantenha o Pomins visível para retomar.');
      this.pending = null;
      if (this.context?.authenticated) {
        this.apply(await this.recover());
        if (terminal(this.state.status)) return;
        const resumed = await this.send('resume');
        this.interrupted = false;
        this.apply(resumed);
      } else {
        this.interrupted = false;
        this.apply({ ...this.state.session, status: 'active' });
      }
      this.emit({ status: this.state.session.status, message: '' });
      document.documentElement.dataset.focusActive = String(this.state.session.status === 'active');
      void this.requestWake();
    });
  cancel = () =>
    this.action(async () => {
      if (!this.state.session || terminal(this.state.status)) return;
      this.interrupted = true;
      this.clock.accept({ ...this.state.session, status: 'interrupted' }, this.now());
      this.renderClock();
      this.emit({ status: 'interrupted' });
      document.documentElement.dataset.focusActive = 'false';
      this.pending = null;
      if (this.context?.authenticated) {
        this.apply(await this.recover());
        if (!terminal(this.state.status)) this.apply(await this.send('cancel'));
      } else this.apply({ ...this.state.session, status: 'cancelled' });
      await this.releaseWake();
      this.emit({
        message:
          'O tempo confirmado foi preservado. Sessões encerradas antes da meta não concedem recompensas.',
      });
    });
  reset = () => {
    if (this.state.session && !terminal(this.state.status)) return;
    this.pending = null;
    this.startId = '';
    this.interrupted = false;
    this.clock.clear();
    this.clockValue = 0;
    try {
      sessionStorage.removeItem(this.cacheKey());
    } catch {}
    this.emit(idle);
    for (const fn of this.clockListeners) fn();
  };
}
