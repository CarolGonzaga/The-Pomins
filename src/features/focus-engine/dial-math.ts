// UI geometry only. The existing engine/server still validate the duration.
export const DIAL_MIN = 2;
export const DIAL_MAX = 120;
export const ARC_START = -135;
export const ARC_END = 135;
export function clampMinutes(value: number) {
  return Math.min(
    DIAL_MAX,
    Math.max(DIAL_MIN, Math.round(Number.isFinite(value) ? value : DIAL_MIN)),
  );
}
export function minutesToAngle(value: number) {
  return (
    ARC_START + ((clampMinutes(value) - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)) * (ARC_END - ARC_START)
  );
}
export function angleToMinutes(angle: number) {
  return clampMinutes(
    DIAL_MIN +
      ((Math.min(ARC_END, Math.max(ARC_START, angle)) - ARC_START) / (ARC_END - ARC_START)) *
        (DIAL_MAX - DIAL_MIN),
  );
}
export function pointerAngle(x: number, y: number, centerX: number, centerY: number) {
  return (Math.atan2(x - centerX, centerY - y) * 180) / Math.PI;
}
/** Unwrap the pointer across ±180°, never mapping one endpoint to the other. */
export function angularDelta(previous: number, next: number) {
  return ((next - previous + 540) % 360) - 180;
}
export function moveAngle(current: number, previousPointer: number, nextPointer: number) {
  return Math.min(
    ARC_END,
    Math.max(ARC_START, current + angularDelta(previousPointer, nextPointer)),
  );
}
