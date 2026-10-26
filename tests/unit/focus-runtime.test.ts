import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import {
  ConfirmedFocusClock,
  FocusRuntime,
  type FocusContext,
} from '../../src/features/focus-engine/runtime';
import { defaultAppearance } from '../../src/features/character-creator/model';
import type { FocusSession } from '../../src/features/focus-engine/model';
import type { gameApi } from '../../src/lib/api';
const seed = (patch: Partial<FocusSession> = {}): FocusSession => ({
  id: '10000000-0000-4000-8000-000000000001',
  character_id: '20000000-0000-4000-8000-000000000001',
  status: 'active',
  planned_seconds: 600,
  validated_ms: 0,
  sequence: 0,
  client_id: 'client',
  task: '',
  first_step: '',
  reward_xp: 0,
  created_at: '2026-10-26T00:00:00Z',
  last_seen_at: '2026-10-26T00:00:00Z',
  ...patch,
});
describe('confirmed monotonic focus clock', () => {
  it('never shows more time than the persisted acknowledgement and never rewinds on a late response', () => {
    const c = new ConfirmedFocusClock();
    c.accept(seed(), 0);
    expect(c.value(4999)).toBe(0);
    c.accept(seed({ validated_ms: 5000, sequence: 1 }), 5000);
    expect(c.value(7000)).toBe(2000);
    expect(c.value(14000)).toBe(5000);
    c.accept(seed({ validated_ms: 10000, sequence: 2 }), 10000);
    expect(c.value(12000)).toBe(7000);
    c.accept(seed({ validated_ms: 5000, sequence: 1 }), 12000);
    expect(c.value(13000)).toBeGreaterThanOrEqual(7000);
  });
  it('reconstructs paused/recovered time exactly from confirmed state', () => {
    const c = new ConfirmedFocusClock();
    c.accept(seed({ status: 'paused', validated_ms: 29000 }), 0);
    expect(c.value(999999)).toBe(29000);
    c.accept(seed({ status: 'active', validated_ms: 29000 }), 999999);
    expect(c.value(1005000)).toBe(29000);
    c.accept(seed({ id: 'other', validated_ms: 0 }), 1005001);
    expect(c.value(1005001)).toBe(0);
  });
});
let runtime: FocusRuntime,
  stop: () => void,
  doc: EventTarget & {
    visibilityState: string;
    documentElement: { dataset: Record<string, string> };
  },
  win: EventTarget,
  session: FocusSession | null,
  calls: Record<string, unknown>[],
  context: FocusContext;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-26T00:00:00Z'));
  doc = Object.assign(new EventTarget(), {
    visibilityState: 'visible',
    documentElement: { dataset: {} },
  });
  win = new EventTarget();
  const storage = new Map<string, string>();
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  session = null;
  calls = [];
  const transport = async (body: unknown) => {
    const p = body as Record<string, unknown>;
    calls.push(p);
    if (p.action === 'start')
      session = seed({
        id: p.id as string,
        character_id: p.characterId as string,
        client_id: p.clientId as string,
        planned_seconds: Number(p.minutes) * 60,
      });
    else if (session) {
      session = {
        ...session,
        sequence: session.sequence + 1,
        status:
          p.action === 'heartbeat'
            ? 'active'
            : p.action === 'resume'
              ? 'active'
              : p.action === 'cancel'
                ? 'cancelled'
                : p.action === 'complete'
                  ? 'completed'
                  : p.action === 'recover'
                    ? 'interrupted'
                    : 'paused',
        validated_ms: session.validated_ms + (p.action === 'heartbeat' ? 5000 : 0),
      };
    }
    return structuredClone(session);
  };
  runtime = new FocusRuntime('fixture', transport as typeof gameApi, () => Date.now());
  stop = runtime.mount();
  context = {
    character: {
      id: seed().character_id,
      name: 'Lumi',
      appearance: defaultAppearance,
      birth_read: true,
      first_memory: 'sky',
      born_at: '2026-10-26',
      life_xp: 0,
    },
    authenticated: true,
    onCompleted: vi.fn(),
  };
  runtime.attach(context, null);
});
afterEach(async () => {
  await runtime.cancel();
  stop();
  await Promise.resolve();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('account-level runtime across UI navigation', () => {
  it('does not recover or pause a known session on repeated UI remounts', async () => {
    await runtime.start(10, '', '');
    await vi.advanceTimersByTimeAsync(11000);
    const before = runtime.getClock();
    for (let n = 0; n < 4; n++)
      runtime.attach({ ...context }, seed({ id: session!.id, status: 'active', validated_ms: 0 }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(runtime.getSnapshot().status).toBe('active');
    expect(runtime.getClock()).toBeGreaterThanOrEqual(before);
    expect(calls.filter((x) => x.action === 'start')).toHaveLength(1);
    expect(calls.filter((x) => x.action === 'recover' || x.action === 'pause')).toHaveLength(0);
    expect(calls.filter((x) => x.action === 'heartbeat')).toHaveLength(3);
  });
  it('ignores blur and resize while the document remains visible', async () => {
    await runtime.start(10, '', '');
    win.dispatchEvent(new Event('blur'));
    win.dispatchEvent(new Event('resize'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(runtime.getSnapshot().status).toBe('active');
    expect(calls.filter((x) => x.action === 'pause')).toHaveLength(0);
  });
  it('stops at confirmed time if connectivity disappears without an offline event', async () => {
    await runtime.start(10, '', '');
    vi.stubGlobal('navigator', { onLine: false });
    await vi.advanceTimersByTimeAsync(6000);
    const confirmed = runtime.getClock();
    await vi.advanceTimersByTimeAsync(60000);
    expect(runtime.getSnapshot().status).toBe('paused');
    expect(runtime.getClock()).toBe(confirmed);
    expect(calls.filter((x) => x.action === 'heartbeat')).toHaveLength(0);
    expect(calls.filter((x) => x.action === 'pause')).toHaveLength(1);
  });
  it('pauses on real hidden visibility and never resumes automatically on return', async () => {
    await runtime.start(10, '', '');
    await vi.advanceTimersByTimeAsync(6000);
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    const confirmed = runtime.getClock();
    await vi.advanceTimersByTimeAsync(60000);
    doc.visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(runtime.getSnapshot().status).toBe('paused');
    expect(runtime.getClock()).toBe(confirmed);
    expect(calls.filter((x) => x.action === 'pause')).toHaveLength(1);
    await runtime.resume();
    expect(runtime.getSnapshot().status).toBe('active');
  });
  it('serializes duplicate starts and manual ending without double credit or completion', async () => {
    await Promise.all([runtime.start(2, '', ''), runtime.start(2, '', '')]);
    expect(calls.filter((x) => x.action === 'start')).toHaveLength(1);
    await Promise.all([runtime.cancel(), runtime.cancel()]);
    expect(calls.filter((x) => x.action === 'cancel')).toHaveLength(1);
    expect(context.onCompleted).not.toHaveBeenCalled();
  });
  it('does not restart the visual clock when a heartbeat arrives after hiding', async () => {
    stop();
    let acknowledge!: (value: FocusSession) => void;
    const transport = async (body: unknown) => {
      const p = body as Record<string, unknown>;
      calls.push(p);
      if (p.action === 'heartbeat')
        return new Promise<FocusSession>((resolve) => {
          acknowledge = resolve;
        });
      return seed({
        status: p.action === 'start' ? 'active' : p.action === 'cancel' ? 'cancelled' : 'paused',
        validated_ms: p.action === 'start' ? 0 : 5000,
      });
    };
    runtime = new FocusRuntime('fixture', transport as typeof gameApi, () => Date.now());
    stop = runtime.mount();
    runtime.attach(context, null);
    await runtime.start(10, '', '');
    await vi.advanceTimersByTimeAsync(5000);
    doc.visibilityState = 'hidden';
    doc.dispatchEvent(new Event('visibilitychange'));
    acknowledge(seed({ validated_ms: 5000, sequence: 1 }));
    await vi.advanceTimersByTimeAsync(0);
    const confirmed = runtime.getClock();
    await vi.advanceTimersByTimeAsync(60000);
    expect(runtime.getClock()).toBe(confirmed);
    expect(runtime.getSnapshot().status).toBe('paused');
    expect(calls.filter((x) => x.action === 'pause')).toHaveLength(1);
  });
  it('keeps heartbeats while no focus view is mounted and notifies completion once', async () => {
    await runtime.start(2, '', '');
    await vi.advanceTimersByTimeAsync(125000);
    expect(runtime.getSnapshot().status).toBe('completed');
    expect(context.onCompleted).toHaveBeenCalledTimes(1);
    runtime.attach(context, session);
    await vi.advanceTimersByTimeAsync(60000);
    expect(context.onCompleted).toHaveBeenCalledTimes(1);
    expect(calls.filter((x) => x.action === 'complete')).toHaveLength(1);
  });
  it('does not let a different resident replace the active account session', async () => {
    await runtime.start(10, '', '');
    const original = runtime.getSnapshot().session!.id;
    runtime.attach({ ...context, character: { ...context.character, id: 'other' } }, null);
    await runtime.start(10, '', '');
    expect(runtime.getSnapshot().session!.id).toBe(original);
    expect(runtime.getSnapshot().session!.character_id).toBe(context.character.id);
    expect(calls.filter((x) => x.action === 'start')).toHaveLength(1);
  });
  it('performs exactly one safe recovery for a newly loaded server session', async () => {
    session = seed({ status: 'paused', validated_ms: 29000 });
    runtime.attach(context, session);
    await vi.advanceTimersByTimeAsync(0);
    runtime.attach(context, session);
    expect(calls.filter((x) => x.action === 'recover')).toHaveLength(1);
    expect(runtime.getSnapshot().status).toBe('interrupted');
    expect(runtime.getClock()).toBe(29000);
  });
});
