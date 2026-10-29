'use client';
import { useEffect, useState } from 'react';
import { usePreferences } from '../preferences/provider';
import { PortalLink } from './navigation';
export const tutorialKey = (accountId: string | null) =>
  `pomins-tutorial-complete-v1:${accountId ?? 'guest'}`;
export function completeTutorial(accountId: string | null) {
  try {
    localStorage.setItem(tutorialKey(accountId), 'done');
    window.dispatchEvent(new Event('pomins-help-updated'));
  } catch {}
}
export function ContextHelp() {
  const { userId } = usePreferences(),
    [done, setDone] = useState(false);
  useEffect(() => {
    const read = () => {
      try {
        setDone(localStorage.getItem(tutorialKey(userId)) === 'done');
      } catch {}
    };
    read();
    window.addEventListener('storage', read);
    window.addEventListener('pomins-help-updated', read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener('pomins-help-updated', read);
    };
  }, [userId]);
  if (done) return null;
  return (
    <details className="context-help">
      <summary>Como jogar</summary>
      <p>
        Gire a borda para escolher o tempo; toque no centro para iniciar. Cuidados guardados custam
        2 min. As reações gratuitas não mudam o progresso.
      </p>
      <PortalLink href="/rules">Regras e tutorial completo</PortalLink>
      <button
        onClick={() => {
          completeTutorial(userId);
          setDone(true);
        }}
      >
        Entendi
      </button>
    </details>
  );
}
