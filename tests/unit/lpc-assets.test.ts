import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import manifest from '../../public/assets/lpc/manifest.json' with { type: 'json' };
import { recolorPixels } from '../../src/features/room/sprites';
import originals from '../fixtures/lpc-original-assets.json';
describe('pinned and credited LPC art', () => {
  it('preserves the original 24 PNGs and extends to 42 licensed sheets', () => {
    expect(originals).toHaveLength(24);
    expect(manifest.files).toHaveLength(42);
    for (const original of originals)
      expect(manifest.files.find((file) => file.path === original.path)?.sha256).toBe(
        original.sha256,
      );
  });
  it('ships intact 64px animation sheets with attribution for each layer', async () => {
    for (const file of manifest.files) {
      const raw = readFileSync(`public/assets/lpc/${file.path}`);
      expect(createHash('sha256').update(raw).digest('hex')).toBe(file.sha256);
      const metadata = await sharp(raw).metadata();
      expect(metadata.height).toBe(256);
      expect(metadata.width! % 64).toBe(0);
    }
    for (const id of Object.keys(manifest.layers))
      expect(
        manifest.credits.some(
          (c) =>
            c.layer === id &&
            c.authors.length > 0 &&
            ['CC-BY-SA 3.0', 'OGA-BY 3.0', 'CC0'].includes(c.selectedLicense),
        ),
      ).toBe(true);
  });
  it('skin, eyes, hair and clothing recolors alter real PNG pixels', async () => {
    const cases = [
      { id: 'body', source: manifest.palettes.body.light, count: 6 },
      { id: 'head', source: manifest.palettes.eye.blue, count: 3 },
      { id: 'plain', source: manifest.palettes.hair.orange, count: 6 },
      { id: 'longsleeve', source: manifest.palettes.cloth.white, count: 6 },
    ];
    for (const item of cases) {
      const { data } = await sharp(`public/assets/lpc/${item.id}-walk.png`)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const original = new Uint8ClampedArray(data);
      const changed = new Uint8ClampedArray(data);
      recolorPixels(changed, [{ source: item.source, target: '#345678', count: item.count }]);
      expect(changed).not.toEqual(original);
      for (let i = 3; i < original.length; i += 4) expect(changed[i]).toBe(original[i]);
    }
  });
  it('every new foreground/back-hair and shirt sheet recolors in walk, idle and sit without changing alpha', async () => {
    for (const id of ['long', 'ponytail', 'ponytail-2', 'wavy', 'wavy-2', 'sleeveless'] as const)
      for (const clip of ['walk', 'idle', 'sit'] as const) {
        const raw = await sharp(`public/assets/lpc/${manifest.layers[id].animations[clip].path}`)
          .ensureAlpha()
          .raw()
          .toBuffer();
        const changed = new Uint8ClampedArray(raw);
        recolorPixels(changed, [
          {
            source:
              id === 'sleeveless' ? manifest.palettes.cloth.white : manifest.palettes.hair.orange,
            target: '#345678',
          },
        ]);
        expect(
          Buffer.from(changed).equals(raw),
          `${id}/${clip} must use the selected palette`,
        ).toBe(false);
        expect(changed.filter((_value, index) => index % 4 === 3)).toEqual(
          new Uint8ClampedArray(raw).filter((_value, index) => index % 4 === 3),
        );
      }
  });
});
