import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import manifest from '../../public/assets/lpc/manifest.json' with { type: 'json' };
import { recolorPixels } from '../../src/features/room/sprites';
describe('pinned and credited LPC art', () => {
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
            ['CC-BY-SA 3.0', 'CC0'].includes(c.selectedLicense),
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
});
