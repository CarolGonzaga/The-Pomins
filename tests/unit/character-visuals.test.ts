import { it, expect } from 'vitest';
import {
  hairOptions,
  clothingOptions,
  manifest,
  frameIndex,
} from '../../src/features/character-visuals/catalog';
import {
  defaultAdultAppearance,
  adultAppearanceSchema,
  appearanceKey,
  customizeAppearance,
  resolveAppearance,
  compositionLayers,
  lifeStages,
  species,
  visualSupport,
} from '../../src/features/character-visuals/model';

it('restores legacy appearance without inventing or changing its visual choices', () => {
  const old = adultAppearanceSchema.parse(defaultAdultAppearance);
  const extended = customizeAppearance(old, {});
  expect(appearanceKey(old)).toBe(appearanceKey(extended));
  expect(old).toEqual(defaultAdultAppearance);
  expect(resolveAppearance(old).pantsColor).toBe('#53616b');
});

for (const hair of hairOptions)
  for (const top of clothingOptions)
    it(`composes ${hair.id}/${top.id} using licensed layers available for all poses`, () => {
      const a = customizeAppearance(defaultAdultAppearance, { hair: hair.id, top: top.id });
      const layers = compositionLayers(a);
      const z = layers.map((id) => manifest.layers[id].z);
      expect(z).toEqual([...z].sort((x, y) => x - y));
      for (const id of layers)
        for (const clip of ['walk', 'idle', 'sit'] as const) {
          expect(manifest.layers[id].animations[clip].frames).toBeGreaterThan(0);
          expect(manifest.credits.some((credit) => credit.layer === id)).toBe(true);
        }
      if (hair.id === 'ponytail' || hair.id === 'wavy')
        expect(layers.indexOf(`${hair.id}-2`)).toBeLessThan(layers.indexOf('body'));
      if (hair.id === 'none') expect(layers).toEqual(['body', 'pants', top.id, 'head']);
      expect(a.hairStyle).toBe(hair.fallback);
      expect(a.clothing).toBe(top.fallback);
      expect(resolveAppearance(a).hair).toBe(hair.id);
    });

it('rejects unsupported layers and versions at the appearance boundary', () => {
  const a = customizeAppearance(defaultAdultAppearance, { hair: 'wavy', top: 'sleeveless' });
  expect(
    adultAppearanceSchema.safeParse({ ...a, visual: { ...a.visual, hair: '../../secret' } })
      .success,
  ).toBe(false);
  expect(
    adultAppearanceSchema.safeParse({ ...a, visual: { ...a.visual, version: 3 } }).success,
  ).toBe(false);
  expect(
    adultAppearanceSchema.safeParse({ ...a, visual: { ...a.visual, pantsColor: 'url(x)' } })
      .success,
  ).toBe(false);
});

it('addresses every pose/direction/frame inside the same atlas', () => {
  const frames = new Set<number>();
  for (const clip of ['walk', 'idle', 'sit'] as const)
    for (let direction = 0; direction < 4; direction++)
      for (let frame = 0; frame < 9; frame++) frames.add(frameIndex(clip, direction, frame));
  expect(frames.size).toBe(108);
  expect(Math.max(...frames)).toBe(107);
  expect(frameIndex('idle', 2)).toBe(54);
});

it('declares every future phase/species without rendering a scaled adult as a substitute', () => {
  for (const lifeStage of lifeStages)
    for (const kind of species)
      expect(visualSupport({ lifeStage, species: kind }).supported).toBe(
        lifeStage === 'adult' && kind === 'human',
      );
});
