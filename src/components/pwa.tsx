'use client';
import { useEffect, useState } from 'react';
export function Pwa() {
  const [worker, setWorker] = useState<ServiceWorker | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    // Read browser connectivity after SSR, before subscribing to subsequent changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          if (reg.waiting) setWorker(reg.waiting);
          reg.addEventListener('updatefound', () => {
            const next = reg.installing;
            next?.addEventListener('statechange', () => {
              if (next.state === 'installed' && navigator.serviceWorker.controller) setWorker(next);
            });
          });
        })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
    };
  }, []);
  return (
    <>
      {offline && (
        <div className="connection-banner" role="status">
          Você está offline. Apenas o tempo confirmado permanece salvo. Reconecte-se para retomar.
        </div>
      )}
      {worker && (
        <div className="update-banner" role="status">
          Uma nova versão está pronta.{' '}
          <button
            onClick={() => {
              if (document.documentElement.dataset.focusActive === 'true') {
                window.alert('Pause sua sessão antes de atualizar.');
                return;
              }
              navigator.serviceWorker.addEventListener(
                'controllerchange',
                () => location.reload(),
                { once: true },
              );
              worker.postMessage('SKIP_WAITING');
            }}
          >
            Atualizar agora
          </button>
        </div>
      )}
    </>
  );
}
