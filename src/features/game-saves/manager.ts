import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { gameSaveSchema } from './model';
import { SaveContextError } from './server';

const protagonistSchema = z.object({
  id: z.uuid(), name: z.string(), user_id: z.uuid(), save_id: z.uuid(),
  household_id: z.uuid(), life_stage: z.string(), render_system: z.string(), appearance: z.unknown(),
});
export const saveListSchema = z.object({saves:z.array(z.object({
  save:gameSaveSchema, protagonist:protagonistSchema.nullable(), focus_pending:z.boolean(),
}))});
export type SaveEntry = z.infer<typeof saveListSchema>['saves'][number];
export const createSaveSchema = z.object({requestId:z.uuid(),name:z.string().trim().min(2).max(80)}).strict();
export const archiveSaveSchema = z.object({saveId:z.uuid(),archived:z.boolean(),expectedRevision:z.number().int().nonnegative()}).strict();
export const newSaveStorageKey = (userId:string)=>`pomins:${userId}:new-save-request`;

export async function requireSaveUser(db:SupabaseClient) {
  const {data:{user},error}=await db.auth.getUser();
  if(error || !user) throw new SaveContextError('Entre para gerenciar suas partidas.',401);
  return user;
}
export function validateSaveList(input:unknown,userId:string,archived:boolean){
  const parsed=saveListSchema.safeParse(input);
  if(!parsed.success) throw new SaveContextError('Não foi possível validar a lista de partidas.',503);
  const ids=new Set<string>();
  for(const {save:s,protagonist:c} of parsed.data.saves){
    if(ids.has(s.id) || s.user_id!==userId || (s.archived_at!==null)!==archived ||
      (c && (c.id!==s.protagonist_id || c.user_id!==userId || c.save_id!==s.id || c.household_id!==s.primary_household_id)))
      throw new SaveContextError('A lista recebida não corresponde à conta.',503);
    ids.add(s.id);
  }
  return parsed.data.saves;
}
export async function listGameSaves(db:SupabaseClient,archived=false){
  const user=await requireSaveUser(db);
  const result=await db.rpc('list_game_saves',{p_archived:archived});
  if(result.error) throw managerError(result.error.code);
  return {userId:user.id,entries:validateSaveList(result.data,user.id,archived)};
}
export function managerError(code?:string){
  return new SaveContextError(code==='PGRST202'
    ? 'O gerenciador de partidas aguarda a atualização autorizada do banco.'
    : 'Não foi possível salvar. Confira a conexão, a revisão e se há foco pendente nesta partida.',code==='PGRST202'?503:409);
}
export function validateManagedSave(input:unknown,userId:string,saveId?:string){
  const parsed=gameSaveSchema.safeParse(input);
  if(!parsed.success || parsed.data.user_id!==userId || (saveId && parsed.data.id!==saveId))
    throw new SaveContextError('Não foi possível validar a partida salva.',503);
  return parsed.data;
}
