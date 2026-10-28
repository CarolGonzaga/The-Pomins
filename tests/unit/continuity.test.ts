import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  foundationRules,
  type EconomyFoundation,
} from '../../src/features/economy-foundation/model';
import { projectContinuity } from '../../src/features/continuity/model';
export const fixture: EconomyFoundation = {
  active: false,
  activation_at: null,
  server_now: '2030-01-01T00:00:00Z',
  rules_version: 1,
  rules: foundationRules,
  last_valid_focus: null,
  available_minutes: 4,
  care_offers: [],
};
const last = '2030-01-01T00:00:00Z';
function project(seconds: number) {
  return projectContinuity({
    ...fixture,
    server_now: new Date(Date.parse(last) + seconds * 1000).toISOString(),
    last_valid_focus: { session_id: '10000000-0000-4000-8000-000000000001', completed_at: last },
  });
}
afterEach(() => vi.useRealTimers());
describe('informational continuity without effects', () => {
  it.each([72, 168, 720])('exact boundaries around %s hours', (hours) => {
    for (const delta of [-0.001, 0, 0.001]) {
      const state = project(hours * 3600 + delta);
      expect(state.milestones.find((m) => m.hours === hours)?.reached).toBe(delta >= 0);
      expect(state.penalties_active).toBe(false);
      expect(state.activation_at).toBeNull();
    }
  });
  it('has no invented anchor before first valid focus', () => {
    const state = projectContinuity(fixture);
    expect(state.state).toBe('not_started');
    expect(state.elapsed_seconds).toBeNull();
    expect(state.next_milestone).toBeNull();
  });
  it('does not invent another deadline after thirty days or apply retroactivity', () => {
    const state = project(900 * 3600);
    expect(state.state).toBe('milestones_reached');
    expect(state.remaining_seconds).toBeNull();
    expect(state.preparation).toBe(true);
  });
  it('is unaffected by device clock, timezone or repeated reads', () => {
    const baseline = project(100);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01'));
    expect(project(100)).toEqual(baseline);
    const offset = { ...fixture, server_now: '2029-12-31T21:00:00-03:00' };
    expect(projectContinuity(offset).elapsed_seconds).toBeNull();
    expect(
      projectContinuity({
        ...offset,
        last_valid_focus: {
          session_id: '10000000-0000-4000-8000-000000000001',
          completed_at: '2029-12-31T23:00:00Z',
        },
      }).elapsed_seconds,
    ).toBe(3600);
  });
  it('rejects activation and future ledger dates instead of inventing active consequences', () => {
    expect(() => projectContinuity({ ...fixture, active: true } as never)).toThrow();
    expect(() => project(-1)).toThrow();
  });
  it('does not leak balances, session IDs or allow save-specific clocks', () => {
    const copy = structuredClone(fixture);
    const state = projectContinuity(copy);
    expect(copy).toEqual(fixture);
    expect(state).not.toHaveProperty('available_minutes');
    expect(state).not.toHaveProperty('session_id');
    expect(state).not.toHaveProperty('save_id');
  });
});
