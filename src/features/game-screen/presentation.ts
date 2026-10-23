import type { VisualIdentity } from '../character-visuals/model';
/** No fallback to adult sprites for ages with no validated artwork. */
export function worldPresentation(stage: VisualIdentity['lifeStage'], renderer: string) {
  if (stage === 'baby' && renderer === 'legacy') return 'baby' as const;
  if (stage === 'adult' && renderer === 'lpc') return 'room' as const;
  return null;
}
