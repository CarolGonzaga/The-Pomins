import { z } from 'zod';

function values(amount: z.ZodNumber) {
  return z.object({
    satiety: amount,
    hygiene: amount,
    energy: amount,
    affection: amount,
    fun: amount,
  });
}
// Effective state may contain fractions. Never quantize a server snapshot here.
export const needValueSchema = z.number().finite().min(0).max(100);
export const needsSchema = values(needValueSchema);
// Care effects are a different contract; the existing server catalog uses integers.
export const integerNeedEffectsSchema = values(z.number().int().min(0).max(100)).partial();
