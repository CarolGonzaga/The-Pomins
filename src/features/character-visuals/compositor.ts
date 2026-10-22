import { manifest, clipRows, type VisualClip } from './catalog';
import { compositionLayers, resolveAppearance, appearanceKey, type AdultAppearance } from './model';
export { FRAME_SIZE, ATLAS_COLUMNS, clipRows, frameIndex } from './catalog';
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
async function buildAtlas(appearance: AdultAppearance) {
  const selected = resolveAppearance(appearance);
  const canvas = document.createElement('canvas');
  canvas.width = 576;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const layers = compositionLayers(appearance);
  for (const id of layers) {
    const layer = manifest.layers[id];
    for (const clip of ['walk', 'idle', 'sit'] as VisualClip[]) {
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
            ? [{ source: manifest.palettes.cloth.white, target: selected.pantsColor }]
            : id === selected.top
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

// Bounded atlas cache. Independent canvases protect previews from Phaser disposal.
const atlases = new Map<string, Promise<HTMLCanvasElement>>();
export async function composeAtlas(appearance: AdultAppearance) {
  const key = appearanceKey(appearance);
  if (!atlases.has(key)) {
    atlases.set(
      key,
      buildAtlas(appearance).catch((error) => {
        atlases.delete(key);
        throw error;
      }),
    );
    while (atlases.size > 6) atlases.delete(atlases.keys().next().value!);
  }
  const atlas = await atlases.get(key)!;
  const copy = document.createElement('canvas');
  copy.width = atlas.width;
  copy.height = atlas.height;
  copy.getContext('2d')!.drawImage(atlas, 0, 0);
  return copy;
}
