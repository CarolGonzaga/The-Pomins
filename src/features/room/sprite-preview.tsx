'use client';
import { useEffect, useRef, useState } from 'react';
import type { AdultAppearance } from './domain';
import {
  composeAtlas,
  frameIndex,
  FRAME_SIZE,
  ATLAS_COLUMNS,
} from '../character-visuals/compositor';
import { appearanceKey } from '../character-visuals/model';
import type { VisualClip } from '../character-visuals/catalog';
export function SpritePreview({
  appearance,
  label = 'Prévia do Pomin adulto',
  clip = 'idle',
  direction = 2,
  animated = false,
}: {
  appearance: AdultAppearance;
  label?: string;
  clip?: VisualClip;
  direction?: number;
  animated?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    let animation = 0;
    // A changed appearance starts a fresh attempt to load external image layers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(false);
    composeAtlas(appearance)
      .then((atlas) => {
        if (!live || !ref.current) return;
        const canvas = ref.current;
        const ctx = canvas.getContext('2d')!;
        const draw = (frame: number) => {
          const index = frameIndex(clip, direction, frame);
          ctx.clearRect(0, 0, FRAME_SIZE, FRAME_SIZE);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(
            atlas,
            (index % ATLAS_COLUMNS) * FRAME_SIZE,
            Math.floor(index / ATLAS_COLUMNS) * FRAME_SIZE,
            FRAME_SIZE,
            FRAME_SIZE,
            0,
            0,
            FRAME_SIZE,
            FRAME_SIZE,
          );
          canvas.dataset.readyKey = appearanceKey(appearance);
          canvas.dataset.frame = String(index);
        };
        draw(0);
        if (animated && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const start = performance.now();
          const tick = (time: number) => {
            if (!live) return;
            draw(Math.floor((time - start) / 125) % ATLAS_COLUMNS);
            animation = requestAnimationFrame(tick);
          };
          animation = requestAnimationFrame(tick);
        }
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
      cancelAnimationFrame(animation);
    };
  }, [appearance, clip, direction, animated]);
  return (
    <>
      <canvas
        ref={ref}
        width={64}
        height={64}
        className="lpc-preview"
        role="img"
        aria-label={label}
        hidden={error}
        data-clip={clip}
        data-direction={direction}
      />
      {error && <span role="alert">Prévia indisponível. Confira a conexão.</span>}
    </>
  );
}
