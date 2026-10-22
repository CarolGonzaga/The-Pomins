import { z } from 'zod';
import { hairOptions, clothingOptions, manifest, type LayerId } from './catalog';

export const lifeStages = ['baby', 'child', 'teen', 'adult', 'elder'] as const;
export const species = ['human', 'alien'] as const;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const hairId = z.enum(hairOptions.map((option) => option.id));
const clothingId = z.enum(clothingOptions.map((option) => option.id));
// Keep the original seven fields readable by the existing SQL and older clients.
// Extra cosmetic fields live in the existing JSONB; no schema migration is needed.
export const adultAppearanceSchema = z.object({
  body: z.literal('male'),
  skin: color,
  hairStyle: z.enum(['plain', 'afro', 'bob', 'none']),
  hairColor: color,
  eyeColor: color,
  clothing: z.enum(['longsleeve', 'shortsleeve']),
  clothingColor: color,
  visual: z
    .object({ version: z.literal(2), hair: hairId, top: clothingId, pantsColor: color })
    .optional(),
});
export type AdultAppearance = z.infer<typeof adultAppearanceSchema>;
export const defaultAdultAppearance: AdultAppearance = {
  body: 'male',
  skin: '#d8a17d',
  hairStyle: 'plain',
  hairColor: '#49352e',
  eyeColor: '#628472',
  clothing: 'longsleeve',
  clothingColor: '#8975aa',
};
export function resolveAppearance(input: AdultAppearance) {
  const a = adultAppearanceSchema.parse(input);
  return {
    skin: a.skin,
    hairColor: a.hairColor,
    eyeColor: a.eyeColor,
    clothingColor: a.clothingColor,
    hair: a.visual?.hair ?? a.hairStyle,
    top: a.visual?.top ?? a.clothing,
    pantsColor: a.visual?.pantsColor ?? '#53616b',
  };
}
export function customizeAppearance(
  input: AdultAppearance,
  patch: Partial<NonNullable<AdultAppearance['visual']>>,
) {
  const selected = resolveAppearance(input);
  const visual = {
    version: 2 as const,
    hair: selected.hair,
    top: selected.top,
    pantsColor: selected.pantsColor,
    ...patch,
  };
  return adultAppearanceSchema.parse({
    ...input,
    visual,
    hairStyle: hairOptions.find((option) => option.id === visual.hair)!.fallback,
    clothing: clothingOptions.find((option) => option.id === visual.top)!.fallback,
  });
}
export function appearanceKey(a: AdultAppearance) {
  return JSON.stringify(resolveAppearance(a));
}
export function compositionLayers(a: AdultAppearance): LayerId[] {
  const selected = resolveAppearance(a);
  const hair: LayerId[] = selected.hair === 'none' ? [] : [selected.hair];
  // Back hair must sit behind the body in every direction and clip.
  if (selected.hair === 'ponytail' || selected.hair === 'wavy') hair.unshift(`${selected.hair}-2`);
  return (['body', 'pants', selected.top, 'head', ...hair] as LayerId[]).sort(
    (a, b) => manifest.layers[a].z - manifest.layers[b].z,
  );
}
export const visualIdentitySchema = z.object({
  species: z.enum(species),
  lifeStage: z.enum(lifeStages),
});
export type VisualIdentity = z.infer<typeof visualIdentitySchema>;
export function visualSupport(identity: VisualIdentity) {
  return identity.species === 'human' && identity.lifeStage === 'adult'
    ? { supported: true as const, body: 'male' as const }
    : {
        supported: false as const,
        reason: 'Esta fase ou espécie ainda não tem um conjunto LPC compatível.',
      };
}
