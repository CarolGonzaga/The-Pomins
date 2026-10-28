'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useFocusRuntime } from '../focus-engine/provider';
import { continuitySchema, type Continuity } from './model';

const Context = createContext<{
  data: Continuity | null;
  stale: boolean;
  refresh: () => void;
} | null>(null);
export function ContinuityProvider({
  accountId,
  children,
}: {
  accountId: string | null;
  children: React.ReactNode;
}) {
  const runtime = useFocusRuntime();
  const [snapshot, setSnapshot] = useState<{ data: Continuity | null; stale: boolean }>({
    data: null,
    stale: false,
  });
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    let flight = false;
    async function load() {
      if (document.visibilityState === 'hidden' || flight) return;
      if (!navigator.onLine) {
        setSnapshot((old) => ({ ...old, stale: true }));
        return;
      }
      flight = true;
      try {
        const response = await fetch('/api/continuity', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw Error('Unavailable');
        const data = continuitySchema.parse(await response.json());
        if (!controller.signal.aborted) setSnapshot({ data, stale: false });
      } catch {
        if (!controller.signal.aborted) setSnapshot((old) => ({ ...old, stale: true }));
      } finally {
        flight = false;
      }
    }
    const visibility = () => {
      setSnapshot((old) => ({ ...old, stale: true }));
      if (document.visibilityState === 'visible') void load();
    };
    const offline = () => setSnapshot((old) => ({ ...old, stale: true }));
    const initial = runtime.getSnapshot().session;
    let completion = initial?.status === 'completed' ? initial.id : undefined;
    const unsubscribe = runtime.subscribe(() => {
      const session = runtime.getSnapshot().session;
      if (session?.status === 'completed' && session.id !== completion) {
        completion = session.id;
        refresh(); // Supersede any pre-completion request.
      }
    });
    void load();
    const interval = setInterval(() => void load(), 60000);
    window.addEventListener('online', visibility);
    window.addEventListener('offline', offline);
    window.addEventListener('storage', visibility);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      controller.abort();
      clearInterval(interval);
      unsubscribe();
      window.removeEventListener('online', visibility);
      window.removeEventListener('offline', offline);
      window.removeEventListener('storage', visibility);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [accountId, runtime, revision, refresh]);
  return (
    <Context.Provider value={accountId ? { ...snapshot, refresh } : null}>
      {children}
    </Context.Provider>
  );
}
export const useContinuity = () => useContext(Context);
