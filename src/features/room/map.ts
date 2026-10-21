import source from '../../../public/assets/room/aurora.json' with { type:'json' };
import type { NavigationGrid } from './navigation';
import { z } from 'zod';
export const tiledMapSchema = z.object({
  type: z.literal('map'),
  orientation: z.literal('orthogonal'),
  width: z.number().int().positive().max(100),
  height: z.number().int().positive().max(100),
  tilewidth: z.number().int().positive(),
  tileheight: z.number().int().positive(),
  layers: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      objects: z
        .array(
          z.object({
            name: z.string(),
            x: z.number(),
            y: z.number(),
            width: z.number().optional(),
            height: z.number().optional(),
            type: z.string().optional(),
            point: z.boolean().optional(),
          }),
        )
        .optional(),
    }),
  ),
});
export function importTiled(input: unknown) {
  const map = tiledMapSchema.parse(input);
  const grid: NavigationGrid = { width: map.width, height: map.height, blocked: [] };
  for (const object of map.layers.find((l) => l.name === 'obstacles')?.objects ?? [])
    for (let y = 0; y < map.height; y++)
      for (let x = 0; x < map.width; x++)
        if (
          x * map.tilewidth >= object.x &&
          x * map.tilewidth < object.x + (object.width ?? 0) &&
          y * map.tileheight >= object.y &&
          y * map.tileheight < object.y + (object.height ?? 0)
        )
          grid.blocked.push({ x, y });
  return {
    map,
    grid,
    interactions: map.layers.find((l) => l.name === 'interactions')?.objects ?? [],
  };
}
export const roomMap = importTiled(source);
