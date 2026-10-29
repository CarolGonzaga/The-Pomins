import type { BabyStats } from './model';
export type BabyMood = 'happy' | 'unhappy' | 'sad';
export const moodLabels: Record<BabyMood, string> = {
  happy: 'Feliz e tranquilo',
  unhappy: 'Insatisfeito',
  sad: 'Triste',
};
export function needBand(value: number) {
  return value >= 60 ? 'adequate' : value >= 40 ? 'attention' : 'critical';
}
export const needLabels = { adequate: 'Adequado', attention: 'Atenção', critical: 'Crítico' };
/** Use effective values, never the rounded labels, and persist no second mood state. */
export function babyMood(needs: BabyStats['needs']): BabyMood {
  const values = Object.values(needs),
    mean = values.reduce((sum, value) => sum + value, 0) / 5;
  if (mean < 40) return 'sad';
  if (mean < 60 || values.some((value) => value < 20)) return 'unhappy';
  return 'happy';
}
export const needDisplay = (value: number) => Math.floor(value * 10) / 10;
