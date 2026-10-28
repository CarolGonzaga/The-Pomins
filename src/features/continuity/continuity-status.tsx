'use client';
import { useContinuity } from './provider';
import { durationLabel } from './model';
import styles from './continuity.module.css';

export function ContinuityRules() {
  return (
    <>
      <p>
        Seu foco cuida de todas as partidas. Só uma sessão concluída e validada reinicia a
        constância.
      </p>
      <p>
        Regras futuras: aviso após 3 dias; regressão temporária após 7 dias; encerramento da jornada
        após 30 dias, preservando as memórias em um memorial.
      </p>
      <p>
        <strong>Consequências em preparação.</strong> Nenhuma regressão ou encerramento está ativo.
        Criar uma partida não reinicia o relógio global.
      </p>
    </>
  );
}
export function ContinuityStatus() {
  const value = useContinuity();
  if (!value) return null;
  const { data, stale, refresh } = value;
  return (
    <details className={styles.status}>
      <summary>
        Constância ·{' '}
        {stale
          ? 'conferir conexão'
          : data?.next_milestone
            ? `${durationLabel(data.remaining_seconds!)} até o próximo marco`
            : data?.state === 'not_started'
              ? 'primeiro foco'
              : data
                ? 'marcos informativos'
                : 'consultando…'}
      </summary>
      <div className={styles.details}>
        <h2>Um momento seu, todas as histórias</h2>
        {stale && (
          <p role="status">
            Informação desatualizada. Reconecte para conferir o horário do servidor.
          </p>
        )}
        {data && (
          <>
            <p>
              {data.last_valid_completed_at ? (
                <>
                  Último foco válido:{' '}
                  <time dateTime={data.last_valid_completed_at}>
                    {new Date(data.last_valid_completed_at).toLocaleString('pt-BR', {
                      timeZone: 'UTC',
                    })}{' '}
                    UTC
                  </time>
                  . Há {durationLabel(data.elapsed_seconds!)}.
                </>
              ) : (
                'Conclua seu primeiro foco para começar.'
              )}
            </p>
            <ul>
              {data.milestones.map((m) => (
                <li key={m.hours}>
                  {m.hours / 24} dias · {m.reached ? 'marco informativo atingido' : 'marco futuro'}
                </li>
              ))}
            </ul>
            <small>
              Retrato confirmado pelo servidor, atualizado a cada minuto enquanto o app está
              visível.
            </small>
          </>
        )}
        <ContinuityRules />
        <div className={styles.actions}>
          <button type="button" onClick={refresh}>
            Atualizar constância
          </button>
          <button
            type="button"
            onClick={() => {
              const target = document.querySelector<HTMLElement>(
                '.game-screen-focus .dial-center:not(:disabled), .game-screen-focus .button-primary:not(:disabled)',
              );
              target?.scrollIntoView({ block: 'center' });
              target?.focus();
            }}
          >
            Ir ao foco
          </button>
        </div>
      </div>
    </details>
  );
}
