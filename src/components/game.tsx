'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Check,
  Heart,
  Home,
  LogOut,
  Menu,
  Moon,
  Sun,
  Timer,
  Trees,
  TrendingUp,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Nursery } from '@/components/characters/nursery';
import { Pomin } from '@/components/characters/pomin';
import { Creator } from '@/features/character-creator/creator';
import { Birth } from '@/features/narrative-engine/birth';
import { Focus } from '@/features/focus-engine/focus';
import {
  characterSchema,
  type Character,
  type CharacterDraft,
} from '@/features/character-creator/model';
import { formatTime, type FocusSession } from '@/features/focus-engine/model';
import { gameApi } from '@/lib/api';
import { browserClient } from '@/lib/supabase/browser';
import { BabyCare } from '@/features/baby-care/baby-care';
import { localSessionCompleted } from '@/features/room/persistence';
import { GameScreen } from '@/features/game-screen/game-screen';
import { PortalLink } from '@/features/portal/navigation';
import { PixelAvatar } from '@/features/preferences/avatar';
import { usePreferences } from '@/features/preferences/provider';
type Initial = {
  userId: string;
  saveId?: string;
  nickname: string;
  isPublic: boolean;
  accountXp: number;
  character: Character | null;
  sessions: FocusSession[];
  loadError: boolean;
};
type View =
  'home' | 'creator' | 'story' | 'focus' | 'character' | 'family' | 'statistics' | 'settings';
const nav = [
  { id: 'home', label: 'Meu universo', icon: Home },
  { id: 'focus', label: 'Meu foco', icon: Timer },
  { id: 'story', label: 'Histórias', icon: BookOpen },
  { id: 'character', label: 'Meu Pomin', icon: Heart },
  { id: 'family', label: 'Meu legado', icon: Trees },
  { id: 'statistics', label: 'Meu progresso', icon: TrendingUp },
] as const;
const STORAGE = 'pomins-explore-v1';
export function Game({
  initial,
  configured,
  returnHref = '/',
  roomHref = '/play',
  immersive = false,
  residents,
  generation = 1,
}: {
  immersive?: boolean;
  residents?: React.ReactNode;
  generation?: number;
  initial: Initial | null;
  configured: boolean;
  returnHref?: string;
  roomHref?: string;
}) {
  const accountPreferences = usePreferences();
  const [gamePanel, setGamePanel] = useState(
    initial?.character && !initial.character.birth_read ? 'birth' : 'care',
  );
  const [focusMounted, setFocusMounted] = useState(
    !initial?.sessions.some((s) => ['active', 'paused', 'interrupted'].includes(s.status)),
  );
  const [view, setView] = useState<View>(initial?.character ? 'character' : 'home');
  const [character, setCharacter] = useState<Character | null>(initial?.character ?? null);
  const [sessions, setSessions] = useState<FocusSession[]>(initial?.sessions ?? []);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [install, setInstall] = useState(false);
  const [isPublic, setPublic] = useState(initial?.isPublic ?? false);
  const [theme, setTheme] = useState('light');
  const [ready, setReady] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const authenticated = Boolean(initial);
  const completed = sessions.filter((s) => s.status === 'completed');
  const totalMs = sessions.reduce((sum, s) => sum + s.validated_ms, 0);
  const xp = character?.life_xp ?? 0;
  const pending =
    sessions.find((s) => ['active', 'paused', 'interrupted'].includes(s.status)) ?? null;
  // Browser storage is unavailable during SSR; hydrate the existing guest save after mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('pomins-theme') ?? 'light';
      setTheme(savedTheme);
      if (!initial) document.documentElement.dataset.theme = savedTheme;
      if (!initial) {
        const saved = JSON.parse(localStorage.getItem(STORAGE) ?? 'null');
        if (saved && characterSchema.safeParse(saved).success && typeof saved.id === 'string') {
          setCharacter({ ...saved, life_xp: 0 });
          setView('character');
        }
      }
      if (initial && new URLSearchParams(location.search).get('panel') === 'preferences')
        setView('settings');
    } catch {}
    setReady(true);
  }, [initial]);
  useEffect(() => {
    if (!authenticated && ready && character)
      try {
        localStorage.setItem(STORAGE, JSON.stringify(character));
      } catch {
        setNotice('O navegador não permitiu salvar neste dispositivo.');
      }
  }, [character, authenticated, ready]);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!install && !menu) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(install ? '.install-modal' : '.mobile-menu');
    if (!dialog) return;
    const controls = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]',
        ),
      );
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (install) setInstall(false);
        else setMenu(false);
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = originalOverflow;
      previous?.focus();
    };
  }, [install, menu]);
  const go = (next: View) => {
    if (next === 'focus' && pending && character && pending.character_id !== character.id) {
      setNotice(
        'Há uma sessão de outro morador. Continue no personagem de origem antes de iniciar outra.',
      );
      return;
    }
    setMenu(false);
    if (view === 'focus') {
      setNotice('Use os controles da sessão para pausar ou encerrar e voltar ao seu universo.');
      return;
    }
    if (next === 'settings' && authenticated) {
      location.assign('/settings');
      return;
    }
    setNotice('');
    if (['focus', 'story', 'character'].includes(next) && !character) {
      setView('creator');
      return;
    }
    setView(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  async function saveCharacter(draft: CharacterDraft) {
    setBusy(true);
    try {
      const saved = authenticated
        ? await gameApi<Character>({ kind: 'character', character: draft, saveId: initial?.saveId })
        : {
            ...draft,
            id: crypto.randomUUID(),
            born_at: new Date().toISOString(),
            life_xp: 0,
            birth_read: false,
            first_memory: null,
          };
      setCharacter(saved);
      setView('story');
      if (immersive) setGamePanel('birth');
    } finally {
      setBusy(false);
    }
  }
  async function saveBirth(memory: 'sky' | 'home') {
    if (!character) return;
    setBusy(true);
    try {
      const saved = authenticated
        ? await gameApi<Character>({
            kind: 'birth',
            memory,
            characterId: character.id,
            saveId: initial?.saveId,
          })
        : { ...character, birth_read: true, first_memory: memory };
      setCharacter(saved);
      setView('character');
      if (immersive) setGamePanel('care');
      setNotice('A primeira memória foi guardada. Que tal dois minutinhos de foco?');
    } finally {
      setBusy(false);
    }
  }
  const finish = useCallback(
    (s: FocusSession) => {
      setSessions((prev) => [s, ...prev.filter((item) => item.id !== s.id)]);
      if (initial)
        setCharacter((prev) => (prev ? { ...prev, life_xp: prev.life_xp + s.reward_xp } : prev));
      else
        void localSessionCompleted(s).catch(() =>
          setNotice('A sessão terminou, mas os minutos locais não puderam ser guardados.'),
        );
    },
    [initial],
  );
  const changeTheme = () => {
    if (authenticated) {
      go('settings');
      return;
    }
    const value = theme === 'dark' ? 'light' : 'dark';
    setTheme(value);
    document.documentElement.dataset.theme = value;
    try {
      localStorage.setItem('pomins-theme', value);
    } catch {}
  };
  async function logout() {
    if (authenticated) {
      if (document.documentElement.dataset.focusActive === 'true') {
        setNotice('Use os controles do foco antes de sair.');
        return;
      }
      setBusy(true);
      try {
        const response = await fetch('/api/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Pomins-Account': initial!.userId },
          body: JSON.stringify({ action: 'logout' }),
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error ?? 'Não foi possível sair.');
        await browserClient().auth.signOut({ scope: 'local' });
        location.assign(new URL('/auth', location.origin).href);
      } catch (e) {
        setNotice(e instanceof Error ? e.message : 'Não foi possível sair.');
      } finally {
        setBusy(false);
      }
    }
  }
  if (immersive) {
    if (!character)
      return (
        <GameScreen
          mode="creation"
          name="Uma nova história"
          stage="Nascimento"
          generation={generation}
          world={<Nursery />}
          panels={[
            {
              id: 'birth',
              label: 'Criar Pomin',
              content: (
                <Creator
                  onSave={saveCharacter}
                  onBack={() => location.assign('/saves')}
                  busy={busy}
                />
              ),
            },
          ]}
        />
      );
    const foreignFocus = !!pending && pending.character_id !== character.id;
    return (
      <BabyCare
        character={character}
        authenticated={authenticated}
        accountId={initial?.userId}
        saveId={initial?.saveId}
        onFocus={() => {
          if (pending && pending.character_id !== character.id)
            setNotice('Retome o foco no morador de origem.');
          else setFocusMounted(true);
        }}
        render={({ world, controls, progress, balance }) => (
          <GameScreen
            name={character.name}
            stage="Bebê"
            generation={generation}
            world={world}
            message={notice}
            panelId={gamePanel}
            onPanelChange={setGamePanel}
            focus={
              <>
                {focusMounted && !foreignFocus ? (
                  <Focus
                    compact
                    character={character}
                    authenticated={authenticated}
                    saveId={initial?.saveId}
                    recovered={pending}
                    onCompleted={finish}
                    exitLabel="Preparar novo foco"
                    onExit={(settled) => {
                      setFocusMounted(false);
                      if (settled && ['completed', 'cancelled'].includes(settled.status))
                        setSessions((prev) => [
                          settled,
                          ...prev.filter((s) => s.id !== settled.id),
                        ]);
                    }}
                  />
                ) : (
                  <div className="game-focus-intro">
                    <strong>{balance} min</strong>
                    <Button disabled={foreignFocus} onClick={() => setFocusMounted(true)}>
                      {pending ? 'Continuar sessão' : 'Abrir foco'}
                    </Button>
                  </div>
                )}
                {focusMounted && (
                  <span className="game-focus-balance">
                    {balance} min disponíveis · saldo da conta
                  </span>
                )}
                {foreignFocus && (
                  <p className="small-note">
                    Há uma sessão de outro morador. Abra Moradores para voltar à origem.
                  </p>
                )}
              </>
            }
            panels={[
              {
                id: 'care',
                label: 'Cuidados',
                content: (
                  <>
                    <h2>Cuidados de {character.name}</h2>
                    {controls}
                  </>
                ),
              },
              {
                id: 'growth',
                secondary: true,
                label: 'Progresso',
                content: (
                  <>
                    <h2>Pequenos começos</h2>
                    {progress}
                    <p>XP de vida: {xp}</p>
                  </>
                ),
              },
              {
                id: 'birth',
                label: 'História',
                content: character.birth_read ? (
                  <>
                    <h2>A primeira memória</h2>
                    <p>
                      {character.first_memory === 'sky'
                        ? 'A luz na janela.'
                        : 'Uma voz acolhedora.'}
                    </p>
                    <p>A memória e os cuidados seguem nesta partida.</p>
                    <details>
                      <summary>Reler capítulo inicial</summary>
                      <Birth
                        character={character}
                        readOnly
                        onComplete={saveBirth}
                        onClose={() => setGamePanel('care')}
                        busy={busy}
                      />
                    </details>
                  </>
                ) : (
                  <Birth
                    character={character}
                    onComplete={saveBirth}
                    onClose={() => setGamePanel('care')}
                    busy={busy}
                  />
                ),
              },
              {
                id: 'residents',
                label: 'Moradores',
                content: residents ?? <p>{character.name}</p>,
              },
            ]}
          />
        )}
      />
    );
  }
  const sidebar = (
    <>
      <Link className="brand" href={returnHref} aria-label="Pomins início">
        pomins<span>.</span>
      </Link>
      <p className="brand-tagline">Seu foco. As histórias deles.</p>
      <div className="sidebar-label">SEU PEQUENO GRANDE MUNDO</div>
      <nav aria-label="Navegação principal">
        {nav.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${view === item.id ? 'current' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
            onClick={() => go(item.id)}
          >
            <span>{item.label}</span>
            {item.id === 'story' && character && !character.birth_read && (
              <i className="nav-badge">1</i>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-cozy">
        <p>
          Pequenos começos.
          <br />
          Histórias extraordinárias.
        </p>
        <span>Um momento de cada vez.</span>
      </div>
      <div className="sidebar-bottom">
        {authenticated && (
          <PortalLink href="/menu" className="nav-item">
            Menu principal
          </PortalLink>
        )}
        {authenticated && (
          <Link
            className="nav-item"
            href="/saves"
            onClick={(e) => {
              if (document.documentElement.dataset.focusActive === 'true') {
                e.preventDefault();
                setNotice('Use os controles da sessão antes de abrir suas partidas.');
              }
            }}
          >
            Minhas partidas
          </Link>
        )}
        <Link className="nav-item" href={roomHref}>
          Meu quarto · Etapa 1
        </Link>
        <button className="nav-item" onClick={() => go('settings')}>
          Preferências
        </button>
        <button className="nav-item" onClick={() => setInstall(true)}>
          Levar comigo
        </button>
        <div className="sidebar-profile">
          <div className="profile-avatar">
            {authenticated ? <PixelAvatar kind={accountPreferences.preferences.avatar} /> : 'P'}
          </div>
          <div>
            <strong>{authenticated ? initial!.nickname : 'Seu espaço de calma'}</strong>
            {authenticated ? (
              <span>Uma história em construção</span>
            ) : (
              <Link href="/auth">Entre para salvar na nuvem</Link>
            )}
          </div>
          {authenticated && (
            <button title="Sair da conta" aria-label="Sair da conta" onClick={logout}>
              <LogOut size={17} />
            </button>
          )}
        </div>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">{sidebar}</aside>
      <header className="mobile-header">
        <Link className="brand" href={returnHref}>
          pomins<span>.</span>
        </Link>
        <button aria-label="Abrir menu" onClick={() => setMenu(true)}>
          <Menu size={23} />
        </button>
      </header>
      {menu && (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu do Pomins">
          <button className="menu-close" aria-label="Fechar menu" onClick={() => setMenu(false)}>
            <X />
          </button>
          {sidebar}
        </div>
      )}
      <div className="app-content">
        <header className="topbar">
          <span>
            <span>Um bom dia começa com um pequeno passo.</span>
          </span>
          <div>
            <span className="environment-tag">
              {authenticated ? 'Sua história está conectada' : 'Explore no seu ritmo'}
            </span>
            <button
              className="icon-button"
              aria-label={
                authenticated
                  ? 'Configurações de aparência'
                  : theme === 'dark'
                    ? 'Ativar tema claro'
                    : 'Ativar tema escuro'
              }
              onClick={changeTheme}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            {!authenticated && (
              <Link href="/auth" className="topbar-login">
                Entrar
              </Link>
            )}
          </div>
        </header>
        <main id="main" className="main-content" key={view}>
          {notice && (
            <div className="notice" role="status">
              <Check size={17} />
              {notice}
              <button aria-label="Fechar aviso" onClick={() => setNotice('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {initial?.loadError && (
            <p className="form-message" role="alert">
              Não foi possível carregar todos os dados. Confira a conexão e a aplicação das
              migrações do Supabase antes de iniciar uma sessão.
            </p>
          )}
          {view === 'home' && (
            <>
              <div className="home-title">
                <div>
                  <div className="eyebrow">CRIE. VIVA. CONTINUE.</div>
                  <h1>
                    Há uma história
                    <br />
                    esperando <em>por você.</em>
                  </h1>
                  <p>Seu foco transforma pequenos momentos em uma vida inteira.</p>
                </div>
                <div className="day-note">
                  <span>
                    Crescer leva tempo.
                    <br />
                    <strong>Começar leva um instante.</strong>
                  </span>
                </div>
              </div>
              <section className="welcome-card">
                <div className="welcome-copy">
                  <span className="pill">
                    <span className="status-dot" />
                    {character ? 'SUA HISTÓRIA, NO SEU RITMO' : 'TODA GRANDE VIDA COMEÇA PEQUENA'}
                  </span>
                  <h2>
                    {character ? (
                      <>
                        {character.name} tem um
                        <br />
                        mundo para descobrir.
                      </>
                    ) : (
                      <>
                        Uma nova vida.
                        <br />
                        Um universo de possibilidades.
                      </>
                    )}
                  </h2>
                  <p>
                    {character
                      ? 'Você cuida do seu momento. Cada sessão de foco confirmada abre espaço para novos capítulos.'
                      : 'Em algum lugar de Vila Aurora, uma nova história está prestes a nascer. E o primeiro capítulo começa com você.'}
                  </p>
                  <Button onClick={() => go(character ? 'focus' : 'creator')}>
                    {character ? 'Iniciar foco' : 'Criar meu primeiro Pomin'}
                  </Button>
                  <span className="welcome-footnote">
                    {character
                      ? 'Sem pressa. Sem cobranças. Um passo de cada vez.'
                      : 'Humano ou alienígena. Uma vida única, como você.'}
                  </span>
                  {character && (
                    <button className="text-button" onClick={() => go('character')}>
                      Cuidar do meu bebê
                    </button>
                  )}
                </div>
                <Nursery appearance={character?.appearance} />
              </section>
              <section className="journey-section">
                <div className="section-heading">
                  <h2>
                    Pequenos passos, grandes histórias<span>.</span>
                  </h2>
                  <span>COMO ESSE UNIVERSO FLORESCE</span>
                </div>
                <div className="journey-grid">
                  {[
                    {
                      n: '01',
                      label: 'Crie',
                      desc: 'Um pequeno ser, do seu jeito. Dê um nome a uma nova possibilidade.',
                      target: 'creator' as View,
                    },
                    {
                      n: '02',
                      label: 'Viva',
                      desc: 'Encontre seu foco. Cada momento abre espaço para novas descobertas.',
                      target: 'focus' as View,
                    },
                    {
                      n: '03',
                      label: 'Continue',
                      desc: 'Guarde memórias. Acompanhe o começo de uma história só sua.',
                      target: 'story' as View,
                    },
                  ].map((item) => (
                    <button
                      className="journey-card"
                      onClick={() =>
                        go(item.target === 'creator' && character ? 'character' : item.target)
                      }
                      key={item.n}
                    >
                      <span className="journey-number">{item.n}</span>
                      <h3>{item.label}</h3>
                      <p>{item.desc}</p>
                    </button>
                  ))}
                </div>
              </section>
              <div className="home-bottom">
                <section className="first-step-card">
                  <span className="eyebrow">MENOS PRESSÃO. MAIS POSSIBILIDADES.</span>
                  <h2>
                    Hoje, só começar
                    <br />
                    já é <em>muita coisa.</em>
                  </h2>
                  <p>
                    Dois minutinhos já podem começar uma nova história.
                    <br />
                    Você não precisa decidir o resto agora.
                  </p>
                  <button className="text-button" onClick={() => go('focus')}>
                    Experimentar um pequeno foco
                  </button>
                  <div className="sprout-art" aria-hidden="true">
                    <svg viewBox="0 0 130 150">
                      <path d="M65 139V64" stroke="#82937d" strokeWidth="5" fill="none" />
                      <path d="M65 106Q12 106 20 60q48-5 45 46" fill="#bdcbb0" />
                      <path d="M65 83Q66 24 114 32q2 45-49 51" fill="#a4b797" />
                      <path d="M39 124h53l-7 25H46Z" fill="#d8bba6" />
                      <path d="m15 31 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1" fill="#d8bb77" />
                    </svg>
                  </div>
                </section>
                <section className="chapter-card">
                  <span className="eyebrow">
                    {character ? 'SEU PRIMEIRO CAPÍTULO' : 'UMA VIDA ESPERA PARA ACONTECER'}
                  </span>
                  <h3>
                    {character
                      ? character.birth_read
                        ? 'A primeira memória'
                        : 'A primeira manhã'
                      : 'O começo de tudo'}
                  </h3>
                  <p>
                    {character
                      ? character.birth_read
                        ? 'Uma pequena lembrança já encontrou um lugar na sua história.'
                        : 'Lia, Nilo e uma manhã que nunca mais será igual. Seu prólogo está pronto.'
                      : 'Um nome. Uma manta macia. E um mundo inteiro para descobrir.'}
                  </p>
                  <button className="text-button" onClick={() => go('story')}>
                    {character ? 'Abrir minha história' : 'Dar o primeiro passo'}
                  </button>
                </section>
              </div>
              <footer className="home-footer">
                <span>O foco desbloqueia a história. A história nunca interrompe o foco.</span>
                <span>THE POMINS · UM UNIVERSO DE COMEÇOS</span>
              </footer>
            </>
          )}
          {view === 'creator' && (
            <Creator onSave={saveCharacter} onBack={() => go('home')} busy={busy} />
          )}
          {view === 'story' && character && !character.birth_read && (
            <Birth
              character={character}
              onComplete={saveBirth}
              onClose={() => go('character')}
              busy={busy}
            />
          )}
          {view === 'story' && character && character.birth_read && (
            <section className="simple-page">
              <span className="eyebrow">CONTINUE · MEMÓRIAS</span>
              <h1>
                As primeiras páginas
                <br />
                de <em>{character.name}.</em>
              </h1>
              <Nursery appearance={character.appearance} />
              <div className="memory-card">
                <BookOpen className="purple" />
                <span className="eyebrow">PRÓLOGO CONCLUÍDO · VERSÃO 1</span>
                <h2>A primeira manhã</h2>
                <p>
                  {character.first_memory === 'sky'
                    ? 'A luz dançava na janela. Um mundo imenso chamou a atenção de olhos pequeninos. E a curiosidade encontrou seu primeiro lar.'
                    : '“Estamos aqui”, disse uma voz tranquila. Antes de entender o mundo, já era possível sentir que havia um lugar seguro nele.'}
                </p>
                <span className="memory-tag">
                  Primeira memória ·{' '}
                  {character.first_memory === 'sky' ? 'Curiosidade' : 'Acolhimento'}
                </span>
              </div>
              <details>
                <summary>Reler capítulo inicial</summary>
                <Birth
                  character={character}
                  readOnly
                  onComplete={saveBirth}
                  onClose={() => go('character')}
                  busy={busy}
                />
              </details>
              <div className="next-chapter">
                <div>
                  <h3>Outras páginas virão.</h3>
                  <p>
                    Infância, escolhas e novos vínculos fazem parte da Entrega 2. Nesta versão, seu
                    foco já pode acumular XP de vida.
                  </p>
                </div>
                <Button onClick={() => go('focus')}>Meu momento de foco</Button>
              </div>
            </section>
          )}
          {view === 'focus' && character && (
            <Focus
              character={character}
              authenticated={authenticated}
              saveId={initial?.saveId}
              recovered={pending}
              onExit={() => {
                if (authenticated) location.assign(returnHref);
                else {
                  setView('home');
                  setNotice('');
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }
              }}
              onCompleted={finish}
            />
          )}
          {view === 'character' && character && (
            <section className="simple-page">
              <span className="eyebrow">CRIE · UMA VIDA ÚNICA</span>
              <h1>
                Olá, <em>{character.name}.</em>
              </h1>
              <BabyCare
                character={character}
                authenticated={authenticated}
                accountId={initial?.userId}
                saveId={initial?.saveId}
                onFocus={() => go('focus')}
              />
              <details>
                <summary>Identidade e primeira memória</summary>
                <div className="pomin-profile">
                  <div className="character-preview">
                    <Pomin appearance={character.appearance} />
                    <span className="pill">GERAÇÃO 1 · RECÉM-NASCIDO</span>
                  </div>
                  <div>
                    <h2>Tanto para descobrir.</h2>
                    <p>Uma vida em Vila Aurora, cercada por possibilidades.</p>
                    <dl>
                      <div>
                        <dt>Origem</dt>
                        <dd>
                          {character.appearance.species === 'human' ? 'Humano' : 'Alienígena'}
                        </dd>
                      </div>
                      <div>
                        <dt>XP de vida</dt>
                        <dd>{xp} XP</dd>
                      </div>
                      <div>
                        <dt>Primeira memória</dt>
                        <dd>
                          {character.first_memory === 'sky'
                            ? 'A luz na janela'
                            : character.first_memory === 'home'
                              ? 'Uma voz acolhedora'
                              : 'Um capítulo para ler'}
                        </dd>
                      </div>
                      <div>
                        <dt>Chegada</dt>
                        <dd>{new Date(character.born_at).toLocaleDateString('pt-BR')}</dd>
                      </div>
                    </dl>
                    <Button onClick={() => go('focus')}>Iniciar foco</Button>
                  </div>
                </div>
              </details>
            </section>
          )}
          {view === 'family' && (
            <section className="simple-page">
              <span className="eyebrow">CONTINUE · MEU LEGADO</span>
              <h1>
                Cada geração,
                <br />
                <em>uma nova história.</em>
              </h1>
              <div className="empty-state">
                {character ? (
                  <>
                    <Pomin className="family-avatar" appearance={character.appearance} />
                    <h2>{character.name}</h2>
                    <span className="pill">O COMEÇO DA PRIMEIRA GERAÇÃO</span>
                    <p>
                      Sua árvore começa com uma vida. Relacionamentos, filhos e sucessão chegam na
                      Entrega 2.
                    </p>
                  </>
                ) : (
                  <>
                    <h2>Uma árvore começa com uma semente.</h2>
                    <p>Crie seu primeiro Pomin e dê início à sua história.</p>
                    <Button onClick={() => go('creator')}>Criar meu Pomin</Button>
                  </>
                )}
              </div>
            </section>
          )}
          {view === 'statistics' && (
            <section className="simple-page">
              <span className="eyebrow">VIVA · MEU PROGRESSO</span>
              <h1>
                Cada momento
                <br />
                <em>tem seu valor.</em>
              </h1>
              <p className="muted">
                {authenticated
                  ? 'Tempo confirmado pelo servidor.'
                  : 'Sessões desta visita, em exploração local. Sem XP ou recompensas oficiais.'}
              </p>
              <div className="stats-grid">
                {[
                  {
                    value: `${Math.floor(totalMs / 60000)} min`,
                    label: 'Foco confirmado',
                  },
                  { value: completed.length, label: 'Sessões concluídas' },
                  { value: xp, label: 'XP desta vida' },
                ].map((item) => (
                  <div className="stat-card" key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="panel">
                <h2>Seus pequenos passos</h2>
                {sessions.length === 0 ? (
                  <p className="muted">
                    Ainda não há sessões por aqui. Dois minutinhos podem ser o primeiro passo.
                  </p>
                ) : (
                  <ul className="session-list">
                    {sessions.map((s) => (
                      <li key={s.id}>
                        <div>
                          <strong>{s.task || 'Um tempo para começar'}</strong>
                          <span>
                            {new Date(s.created_at).toLocaleDateString('pt-BR')} · Planejado:{' '}
                            {s.planned_seconds / 60} min
                          </span>
                        </div>
                        <div>
                          <strong>{formatTime(s.validated_ms)}</strong>
                          <span>
                            {s.status === 'completed'
                              ? 'Concluída'
                              : s.status === 'cancelled'
                                ? 'Encerrada'
                                : s.status === 'expired'
                                  ? 'Expirada'
                                  : 'Em pausa'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="small-note">
                  Mostrando até 100 sessões recentes. XP da vida permanece acumulado no servidor.
                </p>
              </div>
            </section>
          )}
          {view === 'settings' && (
            <section className="simple-page settings-page">
              <span className="eyebrow">SEU ESPAÇO · SUAS ESCOLHAS</span>
              <h1>
                Do seu <em>jeito.</em>
              </h1>
              <div className="panel setting-row">
                <div>
                  <h2>Um visual para cada momento</h2>
                  <p className="muted">
                    {authenticated
                      ? 'Tema, ritmo e avatar ficam nas configurações da conta.'
                      : `Tema ${theme === 'dark' ? 'escuro' : 'claro'}. Salvo neste dispositivo.`}
                  </p>
                </div>
                <Button variant="secondary" onClick={changeTheme}>
                  {authenticated ? (
                    'Abrir configurações'
                  ) : (
                    <>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />} Mudar tema</>
                  )}
                </Button>
              </div>
              <div className="panel setting-row">
                <div>
                  <h2>Seu universo no iPhone</h2>
                  <p className="muted">
                    Instale pela opção “Adicionar à Tela de Início” do Safari.
                  </p>
                </div>
                <Button variant="secondary" onClick={() => setInstall(true)}>
                  Como instalar
                </Button>
              </div>
              <div className="panel">
                <h2>Privacidade primeiro.</h2>
                <p className="muted">
                  Suas tarefas e seu e-mail ficam privados. Perfis públicos e ranking serão
                  disponibilizados na Entrega 3.
                </p>
                {authenticated ? (
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      disabled={busy}
                      onChange={async (e) => {
                        const value = e.target.checked;
                        setBusy(true);
                        try {
                          await gameApi({ kind: 'privacy', public: value });
                          setPublic(value);
                          setNotice('Preferência de privacidade salva.');
                        } catch (e) {
                          setNotice(e instanceof Error ? e.message : 'Falha ao salvar.');
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                    Permitir meu perfil público quando disponível
                  </label>
                ) : (
                  <Button asChild variant="secondary">
                    <Link href="/auth">Criar uma conta</Link>
                  </Button>
                )}
              </div>
              {!configured && (
                <div className="panel">
                  <h2>Exploração neste dispositivo</h2>
                  <p className="muted">
                    Sem conexão com o Supabase. O personagem e sua primeira memória ficam no
                    navegador. Cadastros, validação e sincronização precisam da configuração
                    descrita no README.
                  </p>
                </div>
              )}
              {authenticated && (
                <div className="panel danger-panel">
                  <h2>Excluir minha conta</h2>
                  <p>
                    Remove permanentemente personagem, memórias e sessões. Digite EXCLUIR para
                    habilitar.
                  </p>
                  <label>
                    Confirmação
                    <input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      autoComplete="off"
                    />
                  </label>
                  <Button
                    variant="secondary"
                    disabled={deleteConfirm !== 'EXCLUIR' || busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await gameApi({ kind: 'delete', confirmation: deleteConfirm });
                        location.assign('/');
                      } catch (e) {
                        setNotice(e instanceof Error ? e.message : 'Falha ao excluir.');
                        setBusy(false);
                      }
                    }}
                  >
                    Excluir conta e dados
                  </Button>
                </div>
              )}
              {!authenticated && character && (
                <div className="panel">
                  <h2>Recomeçar a exploração</h2>
                  <p className="muted">Remove o personagem salvo somente neste navegador.</p>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      localStorage.removeItem(STORAGE);
                      setCharacter(null);
                      setSessions([]);
                      go('creator');
                    }}
                  >
                    Criar outra história local
                  </Button>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação rápida">
        {[nav[0], nav[1], nav[2], nav[3]].map((item) => (
          <button
            key={item.id}
            disabled={view === 'focus'}
            className={view === item.id ? 'current' : ''}
            onClick={() => go(item.id)}
          >
            <item.icon size={21} />
            <span>
              {item.id === 'home'
                ? 'Universo'
                : item.id === 'character'
                  ? 'Pomin'
                  : item.label.replace('Meu ', '')}
            </span>
          </button>
        ))}
      </nav>
      {install && (
        <div className="modal-backdrop" onClick={() => setInstall(false)}>
          <section
            className="install-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Fechar instruções"
              onClick={() => setInstall(false)}
            >
              <X size={20} />
            </button>

            <h2 id="install-title">Leve seu universo com você.</h2>
            <p>
              No iPhone, abra o Pomins no <strong>Safari</strong>.
            </p>
            <ol>
              <li>
                Toque no botão <strong>Compartilhar</strong>.
              </li>
              <li>
                Escolha <strong>Adicionar à Tela de Início</strong>.
              </li>
              <li>
                Toque em <strong>Adicionar</strong>. Pronto, um novo começo está a um toque.
              </li>
            </ol>
            <p className="small-note">
              A instalação requer uma publicação com HTTPS. No computador, use o botão de instalação
              do seu navegador, quando disponível.
            </p>
            <Button onClick={() => setInstall(false)}>
              Entendi
              <Check size={16} />
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
