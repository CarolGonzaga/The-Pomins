'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character } from '../character-creator/model';
import { Pomin } from '@/components/characters/pomin';
import { Button } from '@/components/ui/button';
import {
  availableMinutes,
  careInputSchema,
  careIds,
  careLabels,
  careResponses,
  growthReadiness,
  type BabyState,
  type CareInput,
  type CareId,
} from './model';
import { babyApi, CareRejected, loadLocalBaby, localCare } from './persistence';
import './baby-care.css';
import type { ReactNode } from 'react';
export type BabyCareParts = {
  world: ReactNode;
  controls: ReactNode;
  progress: ReactNode;
  balance: number;
};
import { isCurrentSnapshot, saveStorageKey } from '../game-saves/model';

export function BabyCare({
  character,
  authenticated,
  onFocus,
  saveId,
  accountId,
  render,
}: {
  character: Character;
  authenticated: boolean;
  onFocus: () => void;
  saveId?: string;
  accountId?: string;
  render?: (parts: BabyCareParts) => ReactNode;
}) {
  const [state, setState] = useState<BabyState | null>(null);
  const [selected, setSelected] = useState<CareId>('baby_feed');
  const [reaction, setReaction] = useState<CareId | 'rest'>('rest');
  const [reactionId, setReactionId] = useState(0);
  const [costAccepted, setCostAccepted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<CareInput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writing = useRef(false);
  const costKey = `pomins-care-cost-v1:${accountId ?? 'explore'}`;
  useEffect(() => {
    try {
      // External account-scoped preference, not a price or authorization source.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCostAccepted(localStorage.getItem(costKey) === 'acknowledged');
    } catch {
      /* The first-use confirmation remains available without storage. */
    }
  }, [costKey]);
  const legacyPendingKey = `pomins-baby-care-pending-${character.id}`;
  const pendingKey =
    accountId && saveId
      ? saveStorageKey(accountId, saveId, `baby:${character.id}`)
      : legacyPendingKey;
  const accept = useCallback(
    (next: BabyState) => {
      if (next.character.id !== character.id) return;
      setState((prev) => (!prev || isCurrentSnapshot(prev, next) ? next : prev));
    },
    [character.id],
  );
  const refresh = useCallback(async () => {
    accept(
      authenticated ? await babyApi(character.id, undefined, saveId) : loadLocalBaby(character),
    );
  }, [authenticated, character, accept, saveId]);
  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const next = authenticated
          ? await babyApi(character.id, undefined, saveId)
          : loadLocalBaby(character);
        if (live) {
          accept(next);
          setError('');
        }
      } catch {
        if (live)
          setError(
            'Não foi possível carregar os cuidados salvos. Você ainda pode experimentar as reações. Na conta, confira a conexão e a migração de cuidados.',
          );
      }
    };
    void load();
    const restore = () => {
      if (document.visibilityState === 'visible' && !writing.current) void load();
    };
    window.addEventListener('focus', restore);
    window.addEventListener('storage', restore);
    document.addEventListener('visibilitychange', restore);
    // Restore only the exact command; network retries keep its original request ID.
    try {
      const raw = sessionStorage.getItem(pendingKey) ?? sessionStorage.getItem(legacyPendingKey);
      if (raw) {
        const saved = careInputSchema.parse(JSON.parse(raw));
        // Browser storage is an external source, restored after mount.
        if (saved.characterId === character.id) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPending(saved);
          if (pendingKey !== legacyPendingKey) {
            sessionStorage.setItem(pendingKey, raw);
            sessionStorage.removeItem(legacyPendingKey);
          }
        }
      }
    } catch {
      /* Invalid browser data is never sent to the server. */
    }
    return () => {
      live = false;
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('focus', restore);
      window.removeEventListener('storage', restore);
      document.removeEventListener('visibilitychange', restore);
    };
  }, [authenticated, character, pendingKey, legacyPendingKey, accept, saveId]);
  function react(activity: CareId) {
    if (timer.current) clearTimeout(timer.current);
    setSelected(activity);
    setReaction(activity);
    setReactionId((n) => n + 1);
    timer.current = setTimeout(() => setReaction('rest'), 3500);
  }
  async function save(command?: CareInput) {
    if (writing.current || !state) return;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      const input = command ?? {
        requestId: crypto.randomUUID(),
        characterId: character.id,
        activity: selected,
      };
      sessionStorage.setItem(pendingKey, JSON.stringify(input));
      setPending(input);
      const next = authenticated
        ? await babyApi(character.id, input, saveId)
        : await localCare(character, input);
      accept(next);
      sessionStorage.removeItem(pendingKey);
      setPending(null);
      react(input.activity);
      setConfirming(false);
      if (!('lines' in input)) {
        setCostAccepted(true);
        try {
          localStorage.setItem(costKey, 'acknowledged');
        } catch {
          /* No effect on payment. */
        }
      }
      setMessage(
        next.receipt
          ? `${careLabels[input.activity]}: ${next.receipt.chargedMinutes} min registrados. Cuidado guardado.`
          : 'Pedido histórico conferido. Nenhum novo cuidado foi cobrado.',
      );
    } catch (e) {
      if (
        (e instanceof CareRejected && [400, 409].includes(e.status)) ||
        (!authenticated &&
          e instanceof Error &&
          /Não há minutos|pedido já foi utilizado|Pedido antigo não registrado/.test(e.message))
      ) {
        sessionStorage.removeItem(pendingKey);
        setPending(null);
        void refresh().catch(() => {});
      }
      setError(
        e instanceof Error && !(e.name === 'TimeoutError')
          ? e.message
          : 'A confirmação demorou. Confira novamente o mesmo pedido; ele não gastará minutos duas vezes.',
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const balance = state ? availableMinutes(state) : 0;
  const price = state?.care_pricing?.offers.find(
    (offer) => offer.activity === selected,
  )?.price_minutes;
  const needs = state?.stats.needs;
  const ready = state ? growthReadiness(state.stats, state.character, state.rules) : false;
  const world = (
    <div className="baby-care-stage" data-care-reaction={reaction}>
      <div className="baby-care-portrait" key={reactionId}>
        <Pomin
          appearance={character.appearance}
          sleeping={reaction === 'baby_sleep'}
          label={`${character.name}, seu Pomin bebê`}
        />
        {reaction === 'baby_feed' && (
          <svg className="care-bottle" viewBox="0 0 40 70" aria-hidden="true">
            <path d="M15 15V6q5-8 10 0v9" fill="#d6aa8a" />
            <rect
              x="8"
              y="17"
              width="24"
              height="46"
              rx="9"
              fill="#fffdf9"
              stroke="#8975aa"
              strokeWidth="2"
            />
            <path d="M10 35h20v17q0 9-10 9t-10-9Z" fill="#ead6ad" />
          </svg>
        )}
        {reaction === 'baby_bath' && (
          <div className="care-bubbles" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
        {reaction === 'baby_sleep' && (
          <span className="care-sleep" aria-hidden="true">
            z z z
          </span>
        )}
      </div>
      <p className="baby-reaction-copy" aria-live="polite">
        {reaction === 'rest'
          ? 'Uma manta macia, um mundo para descobrir.'
          : careResponses[reaction]}
      </p>
      <small>Experimentar é gratuito. A prévia não altera o progresso salvo.</small>
    </div>
  );
  const controls = (
    <div className="baby-care-controls">
      {needs && (
        <dl className="baby-needs" aria-label="Necessidades do bebê">
          {(
            [
              ['Saciedade', needs.satiety],
              ['Higiene', needs.hygiene],
              ['Energia', needs.energy],
              ['Afeto', needs.affection],
              ['Diversão', needs.fun],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                <meter aria-label={label} min={0} max={100} value={value} />
                <span>{value}/100</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      <div className="baby-care-actions" role="group" aria-label="Experimentar cuidados">
        {careIds.map((id) => (
          <button
            key={id}
            aria-label={careLabels[id]}
            aria-pressed={selected === id}
            onClick={() => {
              react(id);
              setConfirming(false);
              setMessage(
                'Prévia gratuita. Guardar este cuidado custa 2 minutos do saldo compartilhado.',
              );
            }}
          >
            {careLabels[id]}
            <small style={{ display: 'block' }}>2 min</small>
          </button>
        ))}
      </div>
      <div className="baby-care-record">
        <p>
          <strong>{state ? `${balance} min disponíveis` : 'Saldo indisponível'}</strong>
          {authenticated
            ? ' · mesmo saldo do quarto'
            : ' · exploração local, sem recompensa oficial'}
        </p>
        {!price && (
          <p>Cuidados pagos aguardam a atualização do servidor. As reações continuam gratuitas.</p>
        )}
        {price && balance < price && (
          <p>São necessários 2 minutos. Experimente a reação gratuita ou inicie seu foco.</p>
        )}
        {confirming && (
          <p id={`care-confirm-${character.id}`}>
            Este cuidado usa 2 minutos do saldo compartilhado e salva a evolução. As próximas ações
            terão o preço no botão.
          </p>
        )}
        <Button
          disabled={!state || busy || !!pending || !price || balance < price}
          aria-describedby={confirming ? `care-confirm-${character.id}` : undefined}
          onClick={() => {
            if (!costAccepted && !confirming) setConfirming(true);
            else void save();
          }}
        >
          {confirming ? 'Confirmar ' : ''}
          {careLabels[selected]} · 2 min
        </Button>
        {confirming && (
          <button className="text-button" onClick={() => setConfirming(false)} disabled={busy}>
            Agora não
          </button>
        )}
        <button className="text-button" onClick={onFocus}>
          {render ? 'Abrir painel de foco' : 'Abrir foco'}
        </button>
        {pending && (
          <div>
            <p>Um pedido aguarda confirmação. Confira antes de registrar outro.</p>
            <Button
              disabled={busy || !state}
              variant="secondary"
              onClick={() => void save(pending)}
            >
              Conferir cuidado pendente
            </Button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
        {error && (
          <div>
            <p role="alert">{error}</p>
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                void refresh()
                  .then(() => setError(''))
                  .catch(() =>
                    setError('Ainda não foi possível carregar. Seus dados não foram substituídos.'),
                  );
              }}
            >
              Recarregar cuidados
            </button>
          </div>
        )}
      </div>
    </div>
  );
  const progress = (
    <>
      {state && (
        <>
          <p className="baby-growth" role="status">
            {ready
              ? 'Pronto para crescer, quando você escolher. A passagem para criança aguarda uma base visual validada; seu bebê continua aqui.'
              : `Um começo de cada vez: ${state.stats.progress_minutes}/${state.rules.growth.minutes} min de cuidados e ${state.stats.care_types.length}/${state.rules.growth.distinctCare} tipos de cuidado.${state.rules.growth.requiresBirth && !character.birth_read ? ' Guarde também a primeira memória no nascimento.' : ''}`}
          </p>
          <details className="baby-care-history">
            <summary>Cuidados guardados · {state.stats.progress_minutes} min</summary>
            {state.stats.history.length ? (
              <ol>
                {state.stats.history.slice(0, 50).map((entry) => (
                  <li key={entry.id}>
                    <span>
                      {careLabels[entry.activity]} ·{' '}
                      {new Date(entry.created_at).toLocaleString('pt-BR')}
                    </span>
                    <strong>{entry.minutes} min</strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p>As reações são livres. Os cuidados registrados com minutos aparecerão aqui.</p>
            )}
            <small>Até 50 registros recentes na conta. O progresso total permanece guardado.</small>
          </details>
        </>
      )}
    </>
  );
  if (render) return render({ world, controls, progress, balance });
  return (
    <section className="baby-care" aria-labelledby="care-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">PEQUENOS CUIDADOS · GRANDES COMEÇOS</span>
          <h2 id="care-title">Um aconchego para {character.name}.</h2>
          <p>Um momento juntos, no seu ritmo. Nada se perde quando você sai.</p>
        </div>
      </div>
      <div className="baby-care-layout">
        {world}
        {controls}
      </div>
      {progress}
    </section>
  );
}
