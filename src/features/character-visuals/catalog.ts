import manifest from '../../../public/assets/lpc/manifest.json';
import { HUMAN_SKINS, HAIR_COLORS } from '../character-creator/model';

export const hairOptions = [
  { id: 'plain', label: 'Curto', fallback: 'plain' },
  { id: 'afro', label: 'Afro', fallback: 'afro' },
  { id: 'bob', label: 'Chanel', fallback: 'bob' },
  { id: 'long', label: 'Longo', fallback: 'plain' },
  { id: 'ponytail', label: 'Rabo de cavalo', fallback: 'plain' },
  { id: 'wavy', label: 'Ondulado', fallback: 'plain' },
  { id: 'none', label: 'Sem cabelo', fallback: 'none' },
] as const;
export const clothingOptions = [
  { id: 'longsleeve', label: 'Camisa de manga longa', fallback: 'longsleeve' },
  { id: 'shortsleeve', label: 'Camisa de manga curta', fallback: 'shortsleeve' },
  { id: 'sleeveless', label: 'Camisa sem mangas', fallback: 'shortsleeve' },
] as const;
export const visualPalettes = {
  skin: [...HUMAN_SKINS, '#f1cdb0', '#c79572', '#79503c', '#36251e'],
  hairColor: [...HAIR_COLORS, '#17171c', '#9a5739', '#dedbd3', '#739b9a', '#c57b91', '#6f719a'],
  eyeColor: [
    '#628472',
    '#7897b3',
    '#544532',
    '#89709e',
    '#303139',
    '#aa794b',
    '#80a5a1',
    '#b5a46b',
  ],
  clothingColor: [
    '#8975aa',
    '#91a57f',
    '#c48d90',
    '#d0ae6e',
    '#769cb4',
    '#765c50',
    '#475b72',
    '#b96354',
    '#e6dcc5',
    '#55545d',
    '#6b8c83',
    '#b2a0bc',
  ],
  pantsColor: [
    '#53616b',
    '#3d4658',
    '#74604b',
    '#99846a',
    '#48454a',
    '#7d805f',
    '#b1a18b',
    '#746b8b',
  ],
};
export const FRAME_SIZE = 64;
export const ATLAS_COLUMNS = 9;
export const clipRows = { walk: 0, idle: 4, sit: 8 } as const;
export type VisualClip = keyof typeof clipRows;
export type LayerId = keyof typeof manifest.layers;
export function frameIndex(clip: VisualClip, direction = 2, frame = 0) {
  return (
    (clipRows[clip] + Math.max(0, Math.min(3, direction))) * ATLAS_COLUMNS + (frame % ATLAS_COLUMNS)
  );
}
export { manifest };
