import { describe, it, expect } from 'vitest';
import { findPath, Navigator, walkable } from '../../src/features/room/navigation';
import { roomMap, importTiled } from '../../src/features/room/map';
import {
  activities,
  applyProgress,
  adultAppearanceSchema,
  defaultAdultAppearance,
  emptySkills,
  initialNeeds,
  type Resident,
} from '../../src/features/room/domain';
import { recolorPixels } from '../../src/features/room/sprites';
describe('room navigation and animation state contract', () => {
  for (const activity of Object.values(activities))
    it(`routes to ${activity.id} without crossing furniture`, () => {
      const path = findPath(roomMap.grid, { x: 7, y: 8 }, activity.destination);
      expect(path.length).toBeGreaterThan(0);
      for (let i = 0; i < path.length; i++) {
        expect(walkable(roomMap.grid, path[i])).toBe(true);
        if (i)
          expect(Math.abs(path[i].x - path[i - 1].x) + Math.abs(path[i].y - path[i - 1].y)).toBe(1);
      }
      expect(path.at(-1)).toEqual(activity.destination);
      const object = roomMap.interactions.find((o) => o.name === activity.objectId)!;
      expect(object.x).toBe(activity.destination.x * 24 + 12);
      expect(object.y).toBe(activity.destination.y * 24 + 12);
    });
  it('retargets in motion without teleporting and reaches the new destination', () => {
    const nav = new Navigator(roomMap.grid, { x: 7, y: 8 });
    nav.plan(activities.study.destination);
    nav.advance(0.1);
    const previous = { ...nav.position };
    nav.plan(activities.read.destination);
    expect(nav.position).toEqual(previous);
    for (let i = 0; i < 500 && nav.path.length; i++) {
      nav.advance(0.1);
      expect(
        walkable(roomMap.grid, { x: Math.round(nav.position.x), y: Math.round(nav.position.y) }),
      ).toBe(true);
    }
    expect(nav.position).toEqual(activities.read.destination);
  });
  it('rejects unreachable targets and non-Tiled input', () => {
    expect(findPath(roomMap.grid, { x: 7, y: 8 }, { x: 4, y: 3 })).toEqual([]);
    expect(() => importTiled({})).toThrow();
  });
});
describe('appearance and progress', () => {
  it('validates only supported LPC features', () => {
    expect(adultAppearanceSchema.safeParse(defaultAdultAppearance).success).toBe(true);
    expect(
      adultAppearanceSchema.safeParse({ ...defaultAdultAppearance, body: 'imaginary' }).success,
    ).toBe(false);
    expect(
      adultAppearanceSchema.safeParse({ ...defaultAdultAppearance, skin: 'url(invalid)' }).success,
    ).toBe(false);
  });
  it('changes actual palette pixels while preserving alpha and white eye detail', () => {
    const pixels = new Uint8ClampedArray([87, 206, 228, 255, 242, 247, 248, 255, 0, 0, 0, 0]);
    recolorPixels(pixels, [
      { source: ['#2a3c49', '#5686ae', '#57cee4'], target: '#544532', count: 3 },
    ]);
    expect([...pixels.slice(0, 4)]).toEqual([84, 69, 50, 255]);
    expect([...pixels.slice(4, 8)]).toEqual([242, 247, 248, 255]);
    expect(pixels[11]).toBe(0);
  });
  it('progress comes from allocations and does not force aging', () => {
    const resident: Resident = {
      id: 'a',
      household_id: 'h',
      name: 'Lumi',
      life_stage: 'adult',
      appearance: defaultAdultAppearance,
      needs: initialNeeds(),
      skills: emptySkills(),
      relationships: [],
      current_activity: null,
      animation_state: 'idle',
      position: { x: 7, y: 8 },
      activity_revision: 0,
      progress_minutes: 0,
      render_system: 'lpc',
    };
    const result = applyProgress(resident, 'study', 3);
    expect(result.skills.knowledge).toBe(6);
    expect(result.skills.autonomy).toBe(3);
    expect(result.progress_minutes).toBe(3);
    expect(result.life_stage).toBe('adult');
    expect(resident.progress_minutes).toBe(0);
    expect(applyProgress(result, 'sleep', 120).needs.energy).toBe(100);
    expect(() => applyProgress(resident, 'read', 1.5)).toThrow();
  });
});
