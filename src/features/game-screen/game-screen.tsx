'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PortalLink } from '../portal/navigation';
import './game-screen.css';

export type GamePanel = { id: string; label: string; content: ReactNode; secondary?: boolean };
/** Presentation slots keep world and focus at stable positions across panel changes. */
export function GameScreen({
  name,
  stage,
  world,
  focus,
  panels,
  message,
  generation = 1,
  panelId,
  onPanelChange,
  mode = 'play',
}: {
  name: string;
  stage: string;
  world: ReactNode;
  focus?: ReactNode;
  panels: GamePanel[];
  message?: ReactNode;
  generation?: number;
  panelId?: string;
  onPanelChange?: (id: string) => void;
  mode?: 'play' | 'creation';
}) {
  const [panel, setPanel] = useState(panels[0]?.id);
  const selectedPanel = panelId ?? panel;
  const menu = useRef<HTMLDetailsElement>(null);
  const more = useRef<HTMLDetailsElement>(null);
  const select = (id: string) => {
    if (onPanelChange) onPanelChange(id);
    else setPanel(id);
    const wasOpen = more.current?.open;
    more.current?.removeAttribute('open');
    if (wasOpen) more.current?.querySelector('summary')?.focus();
  };
  const panelButton = (p: GamePanel) => (
    <button
      key={p.id}
      type="button"
      aria-expanded={selectedPanel === p.id}
      aria-controls={`game-panel-${p.id}`}
      onClick={() => select(p.id)}
    >
      {p.label}
    </button>
  );
  return (
    <main id="main" className={`game-screen game-screen-${mode}`} data-testid="immersive-game">
      <header className="game-screen-header">
        <div className="game-screen-back">
          <PortalLink href="/saves">Partidas</PortalLink>
        </div>
        <div>
          <h1>{name}</h1>
          <p>
            {stage} · Geração {generation}
          </p>
        </div>
        <details
          ref={menu}
          className="game-screen-menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              menu.current?.removeAttribute('open');
              menu.current?.querySelector('summary')?.focus();
            }
          }}
        >
          <summary>Menu</summary>
          <nav aria-label="Navegação do jogo">
            <PortalLink href="/menu">Menu principal</PortalLink>
            <PortalLink href="/settings">Configurações</PortalLink>
            <PortalLink href="/saves">Minhas partidas</PortalLink>
          </nav>
        </details>
      </header>
      <section className="game-screen-world" aria-label={`Mundo de ${name}`}>
        {world}
      </section>
      <div className="game-screen-deck">
        <section className="game-screen-focus" aria-label="Seu foco e saldo" hidden={!focus}>
          {focus}
        </section>
        {message && (
          <div className="game-screen-notice" role="status">
            {message}
          </div>
        )}
        <nav className="game-screen-tabs" aria-label="Controles do jogo">
          {panels.filter((p) => !p.secondary).map(panelButton)}
          {panels.some((p) => p.secondary) && (
            <details
              className="game-screen-more"
              ref={more}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  more.current?.removeAttribute('open');
                  more.current?.querySelector('summary')?.focus();
                }
              }}
            >
              <summary>Mais opções</summary>
              <div>{panels.filter((p) => p.secondary).map(panelButton)}</div>
            </details>
          )}
        </nav>
        <div className="game-screen-panels">
          {panels.map((p) => (
            <section
              key={p.id}
              id={`game-panel-${p.id}`}
              aria-label={p.label}
              hidden={selectedPanel !== p.id}
              className="game-screen-panel"
              tabIndex={0}
            >
              {p.content}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
