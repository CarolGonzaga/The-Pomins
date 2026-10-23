import {z} from 'zod';
export const preferencesSchema=z.object({
  focus_minutes:z.number().int().min(2).max(120),
  theme:z.enum(['light','dark','system']),
  reduce_motion:z.boolean(),
  avatar:z.enum(['sprout','moon','star','flower']),
}).strict();
export type Preferences=z.infer<typeof preferencesSchema>;
export const defaultPreferences:Preferences={focus_minutes:2,theme:'system',reduce_motion:false,avatar:'sprout'};
export function readPreferences(metadata:unknown):Preferences{
  const value=z.object({pomins_preferences:preferencesSchema}).safeParse(metadata);
  return value.success?value.data.pomins_preferences:{...defaultPreferences};
}
export const loginDestination=(next:string|null)=>
  next && ['/menu','/rules','/settings','/saves','/saves/new'].includes(next)?next:'/menu';
