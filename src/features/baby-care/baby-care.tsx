'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Character } from '../character-creator/model';
import { Pomin } from '@/components/characters/pomin';
import { Button } from '@/components/ui/button';
import {
  availableMinutes,
  careCommandSchema,
  careIds,
  careLabels,
  careResponses,
  growthReadiness,
  planCare,
  type BabyState,
  type CareCommand,
  type CareId,
} from './model';
import { babyApi, CareRejected, loadLocalBaby, localCare } from './persistence';
import './baby-care.css';
import { isCurrentSnapshot, saveStorageKey } from '../game-saves/model';

export function BabyCare({
  character,
  authenticated,
  onFocus,
  saveId,
  accountId,
}: {
  character: Character;
  authenticated: boolean;
  onFocus: () => void;
  saveId?: string;
  accountId?:string;
}) {
  const [state, setState] = useState<BabyState | null>(null);
  const [selected, setSelected] = useState<CareId>('baby_feed');
  const [reaction, setReaction] = useState<CareId | 'rest'>('rest');
  const [reactionId, setReactionId] = useState(0);
  const [minutes, setMinutes] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<CareCommand | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writing = useRef(false);
  const legacyPendingKey = `pomins-baby-care-pending-${character.id}`;
  const pendingKey = accountId && saveId ? saveStorageKey(accountId,saveId,`baby:${character.id}`) : legacyPendingKey;
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
        const saved = careCommandSchema.parse(JSON.parse(raw));
        // Browser storage is an external source, restored after mount.
        if (saved.characterId === character.id) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setPending(saved);
          if(pendingKey!==legacyPendingKey){sessionStorage.setItem(pendingKey,raw);sessionStorage.removeItem(legacyPendingKey);}
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
  async function save(command?: CareCommand) {
    if (writing.current || !state) return;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      const input = command ?? planCare(state, selected, minutes, crypto.randomUUID());
      sessionStorage.setItem(pendingKey, JSON.stringify(input));
      setPending(input);
      const next = authenticated
        ? await babyApi(character.id, input, saveId)
        : await localCare(character, input);
      accept(next);
      sessionStorage.removeItem(pendingKey);
      setPending(null);
      react(input.activity);
      setMessage(
        `${careLabels[input.activity]}: ${input.lines.reduce((sum, l) => sum + l.minutes, 0)} min registrados. Necessidades e progresso foram guardados.`,
      );
    } catch (e) {
      if (
        (e instanceof CareRejected && [400, 409].includes(e.status)) ||
        (!authenticated &&
          e instanceof Error &&
          /Não há minutos|pedido já foi utilizado/.test(e.message))
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
  const needs = state?.stats.needs;
  const ready = state ? growthReadiness(state.stats, state.character, state.rules) : false;
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
        <div className="baby-care-controls">
          {needs && (
            <dl className="baby-needs" aria-label="Necessidades do bebê">
              {(
                [
                  ['Fome', 100 - needs.satiety],
                  ['Higiene', needs.hygiene],
                  ['Energia', needs.energy],
                  ['Afeto', needs.affection],
                  ['Diversão', needs.fun],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt>
                    {label}
                    {label === 'Fome' && <small> · menos é melhor</small>}
                  </dt>
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
                aria-pressed={selected === id}
                onClick={() => {
                  react(id);
                  setMessage(
                    'Prévia gratuita. Para guardar a evolução, escolha os minutos e registre o cuidado.',
                  );
                }}
              >
                {careLabels[id]}
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
            <label>
              Minutos para {careLabels[selected].toLocaleLowerCase('pt-BR')}
              <input
                aria-label="Minutos para o cuidado"
                type="number"
                min={1}
                max={Math.max(1, Math.min(120, balance))}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                disabled={!state || balance < 1 || busy || !!pending}
              />
            </label>
            <Button
              disabled={
                !state ||
                busy ||
                !!pending ||
                !Number.isInteger(minutes) ||
                minutes < 1 ||
                minutes > balance ||
                minutes > 120
              }
              onClick={() => void save()}
            >
              Registrar cuidado com minutos
            </Button>
            <button className="text-button" onClick={onFocus}>
              Reservar um tempo de foco
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
                        setError(
                          'Ainda não foi possível carregar. Seus dados não foram substituídos.',
                        ),
                      );
                  }}
                >
                  Recarregar cuidados
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
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
    </section>
  );
}
