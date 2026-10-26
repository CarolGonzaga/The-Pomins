import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyCare,
  availableMinutes,
  careIds,
  defaultCareRules,
  growthReadiness,
  initialBabyStats,
  planCare,
  type BabyState,
} from '../../src/features/baby-care/model';
import { loadLocalBaby, localCare } from '../../src/features/baby-care/persistence';
import { defaultAppearance, type Character } from '../../src/features/character-creator/model';
import { defaultAdultAppearance } from '../../src/features/room/domain';
import {
  loadLocalRoom,
  localCommand,
  localSessionCompleted,
} from '../../src/features/room/persistence';
import type { FocusSession } from '../../src/features/focus-engine/model';
import { randomUUID } from 'node:crypto';

const character: Character = {
  id: randomUUID(),
  name: 'Lumi',
  appearance: defaultAppearance,
  born_at: '2026-10-21T00:00:00Z',
  birth_read: true,
  first_memory: 'sky',
  life_xp: 20,
};
const completed = (id = randomUUID()) =>
  ({ id, status: 'completed', validated_ms: 120000, planned_seconds: 120 }) as FocusSession;
function browserStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  vi.stubGlobal('navigator', {});
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe('baby care rules and the shared local ledger', () => {
  it('starts with five needs, neutral potentials and no care progress', () => {
    const stats = initialBabyStats();
    expect(Object.values(stats.needs)).toEqual([75, 75, 75, 75, 75]);
    expect(Object.values(stats.traits)).toEqual([0, 0, 0]);
    expect(stats.progress_minutes).toBe(0);
    expect(stats.history).toEqual([]);
  });
  for (const activity of careIds)
    it(`applies ${activity} without mutations or negative effects`, () => {
      const initial = initialBabyStats();
      const next = applyCare(initial, activity, 3);
      for (const [key, value] of Object.entries(defaultCareRules.effects[activity].needs))
        expect(next.needs[key as keyof typeof next.needs]).toBe(Math.min(100, 75 + value! * 3));
      expect(next.progress_minutes).toBe(3);
      expect(next.care_types).toEqual([activity]);
      expect(initial).toEqual(initialBabyStats());
      expect(Object.values(next.needs).every((value) => value >= 75 && value <= 100)).toBe(true);
    });
  it('only announces readiness under configurable requirements; never changes stage', () => {
    let stats = initialBabyStats();
    for (const id of careIds.slice(0, 4)) stats = applyCare(stats, id, 8);
    expect(growthReadiness(stats, character)).toBe(true);
    expect(growthReadiness(stats, { birth_read: false })).toBe(false);
    const rules = structuredClone(defaultCareRules);
    rules.growth.minutes = 33;
    expect(growthReadiness(stats, character, rules)).toBe(false);
    rules.growth = { minutes: 1, distinctCare: 1, requiresBirth: false };
    expect(growthReadiness(stats, { birth_read: false }, rules)).toBe(true);
  });
  it('splits a care across existing credits and rejects excess or invalid minutes', () => {
    const state = {
      character,
      credits: [
        { session_id: randomUUID(), eligible_minutes: 2, allocated_minutes: 1 },
        { session_id: randomUUID(), eligible_minutes: 2, allocated_minutes: 0 },
      ],
    } as BabyState;
    expect(planCare(state, 'baby_play', 3, randomUUID()).lines.map((l) => l.minutes)).toEqual([
      1, 2,
    ]);
    for (const minutes of [0, -1, 1.5, 4, 121])
      expect(() => planCare(state, 'baby_play', minutes, randomUUID())).toThrow();
  });
  it('persists needs/history/identity and never deteriorates across a year offline', async () => {
    browserStorage();
    await localSessionCompleted(completed());
    const input = {
      characterId: character.id,
      activity: 'baby_cuddle' as const,
      requestId: randomUUID(),
    };
    const saved = await localCare(character, input);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-10-21T00:00:00Z'));
    expect(loadLocalBaby(character)).toEqual({ ...saved, receipt: undefined });
    expect(saved.stats.history).toHaveLength(1);
    expect(saved.stats.traits.secure_attachment).toBe(2);
    expect(saved.character.appearance).toEqual(character.appearance);
  });
  it('deduplicates care retries, shares adult spending and rolls back multi-line errors', async () => {
    browserStorage();
    await localCommand({
      action: 'create',
      payload: { name: 'Aurora', appearance: defaultAdultAppearance },
    });
    const session = completed();
    await localSessionCompleted(session);
    await localSessionCompleted(session);
    const extra = completed();
    await localSessionCompleted(extra);
    const input = {
      characterId: character.id,
      activity: 'baby_feed' as const,
      requestId: randomUUID(),
    };
    await localCare(character, input);
    const replay = await localCare(character, input);
    expect(replay.stats.history).toHaveLength(1);
    expect(availableMinutes(replay)).toBe(2);
    await expect(localCare(character, { ...input, activity: 'baby_play' })).rejects.toThrow();
    const snapshot = localStorage.getItem('pomins-room-local-v1');
    await expect(
      localCare(character, {
        ...input,
        requestId: randomUUID(),
        lines: [
          { sessionId: session.id, minutes: 1 },
          { sessionId: randomUUID(), minutes: 1 },
        ],
      }),
    ).rejects.toThrow();
    expect(localStorage.getItem('pomins-room-local-v1')).toEqual(snapshot);
    const room = loadLocalRoom();
    await localCommand({
      action: 'allocate',
      payload: {
        requestId: randomUUID(),
        lines: [
          {
            sessionId: room.credits.find((c) => c.eligible_minutes > c.allocated_minutes)!
              .session_id,
            characterId: room.residents[0].id,
            activity: 'study',
            minutes: 1,
          },
        ],
      },
    });
    expect(availableMinutes(loadLocalBaby(character))).toBe(1);
    expect(loadLocalRoom().allocations).toHaveLength(2);
    await expect(localCare(character, { ...input, requestId: randomUUID() })).rejects.toThrow();
  });
});
