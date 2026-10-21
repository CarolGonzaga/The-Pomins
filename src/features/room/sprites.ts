import manifest from '../../../public/assets/lpc/manifest.json' with { type:'json' };
import type { AdultAppearance } from './domain';
type LayerId = keyof typeof manifest.layers;
type Clip = 'walk' | 'idle' | 'sit';
export const FRAME_SIZE = 64;
export const ATLAS_COLUMNS = 9;
export const clipRows: Record<Clip, number> = { walk: 0, idle: 4, sit: 8 };
export function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}
export function shades(hex: string, count = 6) {
  const base = rgb(hex);
  const factors = count === 3 ? [0.38, 0.72, 1] : [0.2, 0.38, 0.55, 0.76, 1, 1.2];
  return factors.map((f) =>
    base.map((c) => Math.round(Math.min(255, f > 1 ? c + (255 - c) * 0.35 : c * f))),
  );
}
export function recolorPixels(
  pixels: Uint8ClampedArray,
  mappings: { source: readonly string[]; target: string; count?: number }[],
) {
  const lookup = new Map<string, number[]>();
  for (const map of mappings) {
    const colors = shades(map.target, map.count);
    map.source.forEach((hex, i) => lookup.set(rgb(hex).join(','), colors[i]));
  }
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const value = lookup.get(`${pixels[i]},${pixels[i + 1]},${pixels[i + 2]}`);
    if (value) {
      pixels[i] = value[0];
      pixels[i + 1] = value[1];
      pixels[i + 2] = value[2];
    }
  }
  return pixels;
}
const images = new Map<string, Promise<HTMLImageElement>>();
function image(path: string) {
  if (!images.has(path))
    images.set(
      path,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => {
          images.delete(path);
          reject(Error('Não foi possível carregar as camadas do personagem.'));
        };
        img.src = `/assets/lpc/${path}`;
      }),
    );
  return images.get(path)!;
}
export async function composeAtlas(appearance: AdultAppearance) {
  const canvas = document.createElement('canvas');
  canvas.width = 576;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const layers: LayerId[] = [
    'body',
    'pants',
    appearance.clothing,
    'head',
    ...(appearance.hairStyle === 'none' ? [] : [appearance.hairStyle]),
  ];
  for (const id of layers) {
    const layer = manifest.layers[id];
    for (const clip of ['walk', 'idle', 'sit'] as Clip[]) {
      const animation = layer.animations[clip];
      const img = await image(animation.path);
      const work = document.createElement('canvas');
      work.width = img.width;
      work.height = img.height;
      const paint = work.getContext('2d')!;
      paint.drawImage(img, 0, 0);
      const pixels = paint.getImageData(0, 0, work.width, work.height);
      const mappings =
        id === 'body' || id === 'head'
          ? [
              { source: manifest.palettes.body.light, target: appearance.skin },
              ...(id === 'head'
                ? [{ source: manifest.palettes.eye.blue, target: appearance.eyeColor, count: 3 }]
                : []),
            ]
          : id === 'pants'
            ? [{ source: manifest.palettes.cloth.white, target: '#53616b' }]
            : id === appearance.clothing
              ? [{ source: manifest.palettes.cloth.white, target: appearance.clothingColor }]
              : [{ source: manifest.palettes.hair.orange, target: appearance.hairColor }];
      recolorPixels(pixels.data, mappings);
      paint.putImageData(pixels, 0, 0);
      for (let direction = 0; direction < 4; direction++)
        for (let frame = 0; frame < 9; frame++)
          ctx.drawImage(
            work,
            (frame % animation.frames) * 64,
            direction * 64,
            64,
            64,
            frame * 64,
            (clipRows[clip] + direction) * 64,
            64,
            64,
          );
    }
  }
  return canvas;
}
