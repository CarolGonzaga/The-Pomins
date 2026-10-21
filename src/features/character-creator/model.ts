import { z } from 'zod';
export const HUMAN_SKINS = [
  '#f5d8c1',
  '#edc0a0',
  '#d8a17d',
  '#bf815d',
  '#a56949',
  '#885438',
  '#68412e',
  '#482d23',
];
export const ALIEN_SKINS = [
  '#b8d6be',
  '#c5b5e1',
  '#a8cee0',
  '#edb9cd',
  '#e5d797',
  '#99bcbc',
  '#ac99cd',
  '#99b59c',
];
export const HAIR_COLORS = ['#49352e', '#785039', '#c28d50', '#ead6a1', '#292d36', '#b68fc6'];
export const appearanceSchema = z.object({
  species: z.enum(['human', 'alien']),
  skin: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  hair: z.enum(['tuft', 'curly', 'swept', 'none']),
  hairColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  eyes: z.enum(['round', 'sleepy', 'sparkle']),
  eyeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  outfit: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accessory: z.enum(['none', 'bow', 'star']),
  antennas: z.boolean(),
  marks: z.boolean(),
});
export type Appearance = z.infer<typeof appearanceSchema>;
export const characterSchema = z.object({
  name: z.string().trim().min(2, 'Escolha um nome com pelo menos 2 letras.').max(32),
  appearance: appearanceSchema,
});
export type CharacterDraft = z.infer<typeof characterSchema>;
export type Character = CharacterDraft & {
  id: string;
  born_at: string;
  life_xp: number;
  birth_read: boolean;
  first_memory: string | null;
};
export const defaultAppearance: Appearance = {
  species: 'human',
  skin: HUMAN_SKINS[2],
  hair: 'tuft',
  hairColor: HAIR_COLORS[0],
  eyes: 'round',
  eyeColor: '#544532',
  outfit: '#b7b0d4',
  accessory: 'none',
  antennas: true,
  marks: false,
};
