'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';
import { usePreferences } from '../preferences/provider';
export function LogoutButton({
  className,
  label = 'Sair',
}: {
  className?: string;
  label?: string;
}) {
  const { userId } = usePreferences(),
    router = useRouter(),
    lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState('');
  async function leave(confirmed = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const status = await fetch('/api/account', {
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      });
      const data = await status.json();
      if (!status.ok || data.userId !== userId)
        throw Error('Não foi possível conferir a conta. Tente novamente.');
      if (data.focus === 'active')
        throw Error('Pause o foco pelos controles da partida antes de sair.');
      if (data.focus && !confirmed) {
        setConfirm(true);
        return;
      }
      const result = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Pomins-Account': userId ?? '' },
        body: JSON.stringify({ action: 'logout' }),
        signal: AbortSignal.timeout(12000),
      });
      const body = await result.json();
      if (!result.ok) throw Error(body.error ?? 'Não foi possível sair.');
      await browserClient().auth.signOut({ scope: 'local' });
      router.replace('/auth');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível sair.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="logout-control">
      <button type="button" className={className} disabled={busy} onClick={() => void leave()}>
        {busy ? 'Conferindo…' : label}
      </button>
      {confirm && (
        <div className="logout-confirm" role="group" aria-label="Confirmar saída">
          <p role="status">Seu foco pausado continuará salvo. Sair da conta?</p>
          <button disabled={busy} onClick={() => void leave(true)}>
            Confirmar saída
          </button>
          <button disabled={busy} onClick={() => setConfirm(false)}>
            Continuar aqui
          </button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
