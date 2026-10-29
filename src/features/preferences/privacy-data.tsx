'use client';
import { useEffect, useRef, useState } from 'react';
import { gameApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {useRouter} from 'next/navigation';
import styles from '../portal/portal.module.css';
export function PrivacyData() {
  const router=useRouter();
  const [publicProfile, setPublic] = useState<boolean | null>(null),
    [confirmation, setConfirmation] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    let live = true;
    void fetch('/api/account', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (live) setPublic(data.publicProfile);
      })
      .catch(() => {
        if (live)
          setError(
            'Não foi possível carregar sua privacidade. Reabra esta categoria para tentar novamente.',
          );
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <section className={`${styles.panel} ${styles.form}`}>
      <h2>Privacidade e dados</h2>
      <p>Seu e-mail e tarefas ficam privados. Perfis públicos ainda estão em preparação.</p>
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={publicProfile ?? false}
          disabled={busy || publicProfile === null}
          onChange={async (e) => {
            const value = e.target.checked;
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError('');
            try {
              await gameApi({ kind: 'privacy', public: value });
              setPublic(value);
              setMessage('Preferência de privacidade salva.');
            } catch {
              setError('Não foi possível salvar. Tente novamente.');
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        />
        Permitir meu perfil público quando disponível
      </label>
      <details>
        <summary>Excluir minha conta</summary>
        <p>
          Apaga permanentemente todos os personagens, memórias, saves e sessões. Digite EXCLUIR para
          habilitar.
        </p>
        <label>
          Confirmação
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </label>
        <Button
          variant="secondary"
          disabled={busy || confirmation !== 'EXCLUIR'}
          onClick={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            setError('');
            try {
              await gameApi({ kind: 'delete', confirmation });
              router.replace('/auth');router.refresh();
            } catch {
              setError('Não foi possível excluir a conta.');
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          Excluir conta e dados
        </Button>
      </details>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
