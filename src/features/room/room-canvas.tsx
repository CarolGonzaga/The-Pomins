'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Resident, AnimationState } from './domain';
import type { RoomScene } from './scene';
import { composeAtlas } from './sprites';
import { visualSupport } from '../character-visuals/model';
export function RoomCanvas({
  resident,
  onArrive,
}: {
  resident: Resident;
  onArrive: (resident: Resident) => void;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const scene = useRef<RoomScene | null>(null);
  const latest = useRef(resident);
  const arrive = useRef(onArrive);
  useLayoutEffect(() => {
    latest.current = resident;
    arrive.current = onArrive;
  }, [resident, onArrive]);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [visual, setVisual] = useState<{ state: AnimationState; x: number; y: number }>({
    state: 'idle',
    ...resident.position,
  });
  useEffect(() => {
    let live = true;
    let game: import('phaser').Game | undefined;
    const visibility = () => {
      if (document.visibilityState === 'hidden') game?.loop.sleep();
      else game?.loop.wake();
    };
    const support = visualSupport({ species: 'human', lifeStage: latest.current.life_stage });
    const atlas = support.supported
      ? composeAtlas(latest.current.appearance)
      : Promise.reject(new Error(support.reason));
    Promise.all([import('phaser'), import('./scene'), atlas])
      .then(([Phaser, { RoomScene }, atlas]) => {
        if (!live || !parent.current) return;
        const s = new RoomScene(latest.current, atlas, {
          onVisual: (state, x, y) => live && setVisual({ state, x, y }),
          onArrive: (r) => { if(live)arrive.current(r); },
          onError: (message) => live && setError(message),
        });
        scene.current = s;
        game = new Phaser.Game({
          type: Phaser.CANVAS,
          parent: parent.current,
          width: 384,
          height: 288,
          pixelArt: true,
          roundPixels: true,
          antialias: false,
          backgroundColor: '#e8dccb',
          banner: false,
          autoFocus: false,
          input: { keyboard: false, mouse: false, touch: false, gamepad: false },
          fps: { target: 30 },
          audio: { noAudio: true },
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          scene: [s],
        });
        game.events.once('ready', () => {
          if (live) {
            game!.canvas.setAttribute('aria-hidden', 'true');
            game!.canvas.setAttribute('tabindex', '-1');
            game!.canvas.style.touchAction = 'auto';
            setReady(true);
          }
        });
      })
      .catch((e) => live && setError(e.message));
    document.addEventListener('visibilitychange', visibility);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', visibility);
      game?.destroy(true);
      scene.current = null;
    };
  }, []);
  useEffect(() => {
    scene.current?.sync(resident);
  }, [resident]);
  return (
    <>
      <div
        ref={parent}
        className="room-canvas"
        role="img"
        aria-label={`Quarto de ${resident.name}. ${visual.state === 'walking' ? 'Caminhando até a atividade escolhida.' : 'Personagem junto aos objetos do quarto.'}`}
        data-testid="room-canvas"
        data-state={visual.state}
        data-x={visual.x.toFixed(2)}
        data-y={visual.y.toFixed(2)}
      >
        {!ready && !error && (
          <span className="canvas-loading">Abrindo as janelas de Vila Aurora…</span>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          O quarto não carregou: {error}. Recarregue para tentar novamente.
        </p>
      )}
    </>
  );
}
