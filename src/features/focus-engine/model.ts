export const DURATIONS = [2, 5, 10, 15, 25, 50] as const;
export const HEARTBEAT_MS = 5000;
export const MAX_GAP_MS = 7500;
export type FocusStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'paused'
  | 'interrupted'
  | 'completing'
  | 'completed'
  | 'cancelled'
  | 'expired';
const transitions: Record<FocusStatus, FocusStatus[]> = {
  idle: ['starting'],
  starting: ['active', 'interrupted', 'idle'],
  active: ['paused', 'interrupted', 'completing', 'cancelled', 'expired'],
  paused: ['active', 'cancelled', 'expired'],
  interrupted: ['active', 'cancelled', 'expired'],
  completing: ['completed', 'interrupted'],
  completed: ['idle'],
  cancelled: ['idle'],
  expired: ['idle'],
};
export function transition(from: FocusStatus, to: FocusStatus): FocusStatus {
  if (!transitions[from].includes(to)) throw new Error(`Transição inválida: ${from} → ${to}`);
  return to;
}
export function eligibleInterval(previous: number, now: number): number {
  const gap = now - previous;
  return gap >= 3000 && gap <= MAX_GAP_MS ? Math.min(gap, HEARTBEAT_MS) : 0;
}
export function rewards(validatedMs: number) {
  const minutes = Math.floor(validatedMs / 60000);
  return { lifeXp: minutes * 10, accountXp: minutes * 10, coins: minutes * 2, energy: minutes };
}
export function formatTime(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export type FocusSession = {
  id: string;
  character_id: string;
  status: FocusStatus;
  planned_seconds: number;
  validated_ms: number;
  sequence: number;
  client_id: string;
  task: string;
  first_step: string;
  reward_xp: number;
  last_seen_at: string;
  created_at: string;
};
