import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, it, expect, vi } from 'vitest';
import { Pomin } from '../../src/components/characters/pomin';
import { defaultAppearance } from '../../src/features/character-creator/model';
afterEach(() => vi.unstubAllGlobals());
it.each(['human', 'alien'] as const)(
  'keeps %s appearance, accessories and dimensions in all three expressions',
  (species) => {
    vi.stubGlobal('React', React);
    const appearance = {
      ...defaultAppearance,
      species,
      skin: '#482d23',
      eyeColor: '#123456',
      hairColor: '#abcdef',
      accessory: 'star' as const,
      antennas: true,
    };
    const variants = (['happy', 'unhappy', 'sad'] as const).map((mood) =>
      renderToStaticMarkup(React.createElement(Pomin, { appearance, mood })),
    );
    expect(new Set(variants).size).toBe(3);
    for (const svg of variants) {
      expect(svg).toContain('viewBox="0 0 260 300"');
      for (const color of [
        appearance.skin,
        appearance.eyeColor,
        appearance.hairColor,
        appearance.outfit,
      ])
        expect(svg).toContain(color);
      expect(svg).toContain('m174 91');
      if (species === 'alien') expect(svg).toContain('cx="79" cy="29"');
    }
  },
);
