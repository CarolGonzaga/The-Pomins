import { expect, it } from 'vitest';
import {
  ARC_START,
  ARC_END,
  clampMinutes,
  minutesToAngle,
  angleToMinutes,
  pointerAngle,
  angularDelta,
  moveAngle,
} from '@/features/focus-engine/dial-math';
it.each([2, 5, 25, 37, 60, 120])(
  'round trips %i minutes without changing the engine range',
  (n) => {
    expect(angleToMinutes(minutesToAngle(n))).toBe(n);
  },
);
it('clamps and rounds conventional values', () => {
  expect(clampMinutes(-4)).toBe(2);
  expect(clampMinutes(121)).toBe(120);
  expect(clampMinutes(10.6)).toBe(11);
  expect(clampMinutes(NaN)).toBe(2);
});
it('uses a bounded 270 degree arc', () => {
  expect(minutesToAngle(2)).toBe(ARC_START);
  expect(minutesToAngle(120)).toBe(ARC_END);
  expect(angleToMinutes(-900)).toBe(2);
  expect(angleToMinutes(900)).toBe(120);
});
it('measures clockwise pointer angles from the top', () => {
  expect(pointerAngle(0, -10, 0, 0)).toBe(0);
  expect(pointerAngle(10, 0, 0, 0)).toBe(90);
  expect(pointerAngle(-10, 0, 0, 0)).toBe(-90);
});
it('unwraps clockwise and anticlockwise crossings without jumps', () => {
  expect(angularDelta(179, -179)).toBe(2);
  expect(angularDelta(-179, 179)).toBe(-2);
});
it('increases and decreases in predictable steps', () => {
  const begin = minutesToAngle(60);
  expect(angleToMinutes(moveAngle(begin, 0, 45))).toBe(80);
  expect(angleToMinutes(moveAngle(begin, 0, -45))).toBe(40);
});
it('holds endpoints and responds immediately when reversing', () => {
  expect(moveAngle(135, 170, -170)).toBe(135);
  expect(moveAngle(-135, -170, 170)).toBe(-135);
  expect(moveAngle(135, 0, -10)).toBe(125);
});
it('does not wrap low durations to the maximum at the pointer seam', () => {
  expect(angleToMinutes(moveAngle(-135, 170, -170))).toBe(11);
});
