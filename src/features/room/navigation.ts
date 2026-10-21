import type { Tile } from './domain';
export type NavigationGrid = { width: number; height: number; blocked: Tile[] };
const key = (tile: Tile) => `${tile.x},${tile.y}`;
export function walkable(grid: NavigationGrid, tile: Tile) {
  return (
    Number.isInteger(tile.x) &&
    Number.isInteger(tile.y) &&
    tile.x >= 0 &&
    tile.y >= 0 &&
    tile.x < grid.width &&
    tile.y < grid.height &&
    !grid.blocked.some((p) => p.x === tile.x && p.y === tile.y)
  );
}
export function findPath(grid: NavigationGrid, start: Tile, end: Tile): Tile[] {
  if (!walkable(grid, start) || !walkable(grid, end)) return [];
  const queue = [start];
  const parents = new Map<string, Tile | null>([[key(start), null]]);
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i];
    if (key(point) === key(end)) {
      const path: Tile[] = [];
      let current: Tile | null = point;
      while (current) {
        path.unshift(current);
        current = parents.get(key(current)) ?? null;
      }
      return path;
    }
    for (const tile of [
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 },
    ])
      if (walkable(grid, tile) && !parents.has(key(tile))) {
        parents.set(key(tile), point);
        queue.push(tile);
      }
  }
  return [];
}
// Retargeting finishes the current safe edge before changing the path; it never snaps position.
export class Navigator {
  position: Tile;
  path: Tile[] = [];
  constructor(
    public grid: NavigationGrid,
    start: Tile,
  ) {
    this.position = { ...start };
  }
  plan(target: Tile) {
    const anchor = this.path[0] ?? {
      x: Math.round(this.position.x),
      y: Math.round(this.position.y),
    };
    const route = findPath(this.grid, anchor, target);
    if (!route.length) return false;
    this.path = this.path.length ? [anchor, ...route.slice(1)] : route.slice(1);
    return true;
  }
  advance(seconds: number, speed = 2.3) {
    let budget = Math.max(0, Math.min(seconds, 0.1)) * speed;
    while (this.path.length && budget > 0) {
      const next = this.path[0];
      const distance = Math.hypot(next.x - this.position.x, next.y - this.position.y);
      if (distance <= budget) {
        this.position = { ...next };
        this.path.shift();
        budget -= distance;
      } else {
        this.position.x += ((next.x - this.position.x) / distance) * budget;
        this.position.y += ((next.y - this.position.y) / distance) * budget;
        budget = 0;
      }
    }
    return this.path.length === 0;
  }
}
