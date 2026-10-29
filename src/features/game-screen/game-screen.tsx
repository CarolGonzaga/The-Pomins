'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { PortalLink } from '../portal/navigation';
import { ContinuityStatus } from '../continuity/continuity-status';
import { ContextHelp } from '../portal/context-help';
import './game-screen.css';
import './nursery-screen.css';

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
  scene,
  balance,
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
  scene?: 'nursery';
  balance?: number;
}) {
  const [panel, setPanel] = useState(panels[0]?.id);
  const selectedPanel = panelId ?? panel;
  const [panelOpen, setPanelOpen] = useState(mode === 'creation' || selectedPanel === 'birth' || !focus);
  const tabs = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDetailsElement>(null);
  const primaryLabels = ['Cuidados', 'Atividades', 'Progresso', 'História', 'Moradores'];
  const primary = panels
    .filter((p) => primaryLabels.includes(p.label))
    .sort((a, b) => primaryLabels.indexOf(a.label) - primaryLabels.indexOf(b.label));
  const secondary = panels.filter((p) => !primaryLabels.includes(p.label));
  const restoreControlFocus = () => {
    const control = tabs.current?.querySelector<HTMLButtonElement>(
      'button[aria-controls="game-panel-' + selectedPanel + '"]',
    ) ?? menu.current?.querySelector('summary');
    control?.focus({ preventScroll: true });
  };
  const select = (id: string) => {
    if (onPanelChange) onPanelChange(id);
    else setPanel(id);
    setPanelOpen(true);
    menu.current?.removeAttribute('open');
  };
  const panelButton = (p: GamePanel) => (
    <button
      key={p.id}
      type="button"
      aria-expanded={panelOpen && selectedPanel === p.id}
      aria-controls={`game-panel-${p.id}`}
      onClick={() => select(p.id)}
    >
      {p.label}
    </button>
  );
  return (
    <main
      id="main"
      className={`game-screen game-screen-${mode}${scene ? ' game-screen-nursery' : ''}`}
      data-testid="immersive-game"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && mode !== 'creation') {
          setPanelOpen(false);
          restoreControlFocus();
        }
      }}
    >
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
          onToggle={(e) => {
            if (e.currentTarget.open && mode !== 'creation') setPanelOpen(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              menu.current?.removeAttribute('open');
              menu.current?.querySelector('summary')?.focus({ preventScroll: true });
            }
          }}
        >
          <summary>Menu</summary>
          <nav aria-label="Navegação do jogo">
            <PortalLink href="/menu">Menu principal</PortalLink>
            <PortalLink href="/settings">Configurações</PortalLink>
            <PortalLink href="/saves">Minhas partidas</PortalLink>
            {secondary.map(panelButton)}
          </nav>
        </details>
      </header>
      <section className="game-screen-world" aria-label={`Mundo de ${name}`}>
        {world}
        {scene === 'nursery' && (
          <span
            className="nursery-balance"
            aria-label={`Saldo disponível: ${balance ?? 0} minutos`}
          >
            Seu saldo <strong>{balance ?? 0} min</strong>
          </span>
        )}
      </section>
      <div className="game-screen-deck">
        <section className="game-screen-focus" aria-label="Seu foco e saldo" hidden={!focus}>
          {focus}
          {focus && <ContinuityStatus />}
          {focus && <ContextHelp />}
        </section>
        {message && (
          <div className="game-screen-notice" role="status">
            {message}
          </div>
        )}
        <nav ref={tabs} className="game-screen-tabs" aria-label="Controles do jogo" hidden={!primary.length}>
          {primary.map(panelButton)}
        </nav>
        <div
          className={`game-screen-panels${mode === 'creation' ? '' : ' game-panel-drawer'}`}
          hidden={!panelOpen && mode !== 'creation'}
        >
          {mode !== 'creation' && (
            <button
              className="game-panel-close"
              onClick={() => {
                setPanelOpen(false);
                restoreControlFocus();
              }}
            >
              Voltar ao jogo
            </button>
          )}
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
