'use client';
import { useEffect, useRef, useState } from 'react';
import type { AdultAppearance } from './domain';
import { composeAtlas } from './sprites';
export function SpritePreview({
  appearance,
  label = 'Prévia do Pomin adulto',
}: {
  appearance: AdultAppearance;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let live = true;
    // A changed appearance starts a fresh attempt to load external image layers.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(false);
    composeAtlas(appearance)
      .then((atlas) => {
        if (!live || !ref.current) return;
        const ctx = ref.current.getContext('2d')!;
        ctx.clearRect(0, 0, 64, 64);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(atlas, 0, 384, 64, 64, 0, 0, 64, 64);
      })
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [appearance]);
  return error ? (
    <span role="alert">Prévia indisponível. Confira a conexão.</span>
  ) : (
    <canvas
      ref={ref}
      width={64}
      height={64}
      className="lpc-preview"
      role="img"
      aria-label={label}
    />
  );
}
