import {beforeAll,afterAll,it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createSaveFixture} from '../support/save-fixture.mjs';
import {defaultAppearance} from '../../src/features/character-creator/model';
import {validateLoadedSave} from '../../src/features/game-saves/loading';
import {validateSaveList,newSaveStorageKey} from '../../src/features/game-saves/manager';
let f:Awaited<ReturnType<typeof createSaveFixture>>;
beforeAll(async()=>{f=await createSaveFixture();});
afterAll(async()=>{await f.db.close();});
const create=(requestId=randomUUID(),name='Nova história')=>f.rpc(f.ids.a,'create_game_save',{p_request:requestId,p_name:name});
const list=(archived=false,user?:string)=>f.rpc(user??f.ids.a,'list_game_saves',{p_archived:archived});
const archive=(id:string,revision:number,archived=true,user?:string)=>f.rpc(user??f.ids.a,'set_game_save_archived',{p_save:id,p_archived:archived,p_expected_revision:revision});

it('lists only owned saves with correct protagonist and pending selection, without touching usage',async()=>{
  const before=(await f.db.query('select id,last_used_at from public.game_saves order by id')).rows;
  const entries=validateSaveList(await list(),f.ids.a,false);
  expect(entries).toHaveLength(2);
  expect(entries.find(e=>e.save.id===f.ids.one)?.protagonist?.name).toBe('Aurora');
  expect(entries.find(e=>e.save.id===f.ids.two)?.protagonist).toBeNull();
  expect(entries.find(e=>e.save.id===f.ids.one)?.focus_pending).toBe(true);
  expect((await f.db.query('select id,last_used_at from public.game_saves order by id')).rows).toEqual(before);
});
it('shows an empty active list when all saves are archived and restores the same data',async()=>{
  const before=await f.rpc(f.ids.b,'load_game_save',{p_save:f.ids.foreign});
  await archive(f.ids.foreign,before.context.save.world_revision,true,f.ids.b);
  expect((await list(false,f.ids.b)).saves).toEqual([]);
  const archived=(await list(true,f.ids.b)).saves[0];
  expect(archived.save.id).toBe(f.ids.foreign);
  await archive(f.ids.foreign,archived.save.world_revision,false,f.ids.b);
  expect((await list(false,f.ids.b)).saves).toHaveLength(1);
});
it('creates an empty independent home with no character, credit or focus side effect',async()=>{
  const before=(await f.db.query('select to_jsonb(p) data from public.profiles p where id=$1',[f.ids.a])).rows;
  const s=await create();
  expect(s.state).toBe('draft');expect(s.protagonist_id).toBeNull();
  expect(s.primary_household_id).not.toBeNull();
  const data=validateLoadedSave(await f.rpc(f.ids.a,'load_game_save',{p_save:s.id}),f.ids.a,s.id);
  expect(data.characters).toEqual([]);expect(data.room.residents).toEqual([]);
  expect(data.room.credits).toHaveLength(1);
  expect((await f.db.query('select to_jsonb(p) data from public.profiles p where id=$1',[f.ids.a])).rows).toEqual(before);
});
it('creates two distinct saves even with the same name and separate requests',async()=>{
  const x=await create(),y=await create();expect(x.id).not.toBe(y.id);expect(x.primary_household_id).not.toBe(y.primary_household_id);
});
it('retries the exact request without duplicating saves, homes or events',async()=>{
  const id=randomUUID(),x=await create(id,'Pedido repetido'),y=await create(id,'Pedido repetido');
  expect(x).toEqual(y);
  expect((await f.db.query<{n:number}>('select count(*)::integer n from public.households where save_id=$1',[x.id])).rows[0].n).toBe(1);
  expect((await f.db.query<{n:number}>("select count(*)::integer n from public.game_events where save_id=$1 and kind='SaveCreated'",[x.id])).rows[0].n).toBe(1);
  await expect(create(id,'Outro nome')).rejects.toThrow('Request payload conflict');
});
it('rejects invalid creation payloads and unauthenticated access',async()=>{
  await expect(create(randomUUID(),' ')).rejects.toThrow();await expect(create(randomUUID(),'x'.repeat(81))).rejects.toThrow();
  await expect(f.rpc('', 'create_game_save',{p_request:randomUUID(),p_name:'Sem conta'})).rejects.toThrow();
  await expect(f.rpc('', 'list_game_saves')).rejects.toThrow();
});
it('keeps request identifiers isolated by account',async()=>{
  const id=randomUUID(),a=await create(id);
  const b=await f.rpc(f.ids.b,'create_game_save',{p_request:id,p_name:'Nova história'});expect(a.id).not.toBe(b.id);
});
it('resumes birth creation and first memory with existing RPCs without leaking to another world',async()=>{
  const x=await create(),y=await create();
  const c=await f.rpc(f.ids.a,'create_character_for_save',{p_save:x.id,p_name:'Lua',p_appearance:defaultAppearance});
  await f.rpc(f.ids.a,'read_birth_for_save',{p_save:x.id,p_character:c.id,p_memory:'sky'});
  const data=validateLoadedSave(await f.rpc(f.ids.a,'load_game_save',{p_save:x.id}),f.ids.a,x.id);
  expect(data.context.save.protagonist_id).toBe(c.id);expect(data.characters[0].appearance).toEqual(defaultAppearance);
  expect(data.characters[0].birth_read).toBe(true);expect(data.memories[0].character_id).toBe(c.id);
  const other=await f.rpc(f.ids.a,'load_game_save',{p_save:y.id});expect(other.characters).toEqual([]);expect(other.memories).toEqual([]);
  expect(validateLoadedSave(other,f.ids.a,y.id).room.credits).toEqual(data.room.credits);
  const again=await f.rpc(f.ids.a,'create_character_for_save',{p_save:x.id,p_name:'Lua',p_appearance:defaultAppearance});expect(again.id).toBe(c.id);
});
it('cannot move a character into a different save even within the same account',async()=>{
  await expect(f.db.query('update public.characters set save_id=$1 where id=$2',[f.ids.two,f.ids.adultOne])).rejects.toThrow();
  await expect(f.rpc(f.ids.a,'read_birth_for_save',{p_save:f.ids.one,p_character:f.ids.baby,p_memory:'home'})).rejects.toThrow();
});
it('archives/restores reversibly and idempotently while retaining characters, needs and memories',async()=>{
  const before=await f.rpc(f.ids.a,'load_game_save',{p_save:f.ids.two}),s=before.context.save;
  const archived=await archive(s.id,s.world_revision);expect(archived.archived_at).not.toBeNull();
  expect(await archive(s.id,s.world_revision)).toEqual(archived);
  await expect(f.rpc(f.ids.a,'load_game_save',{p_save:s.id})).rejects.toThrow();
  const restored=await archive(s.id,archived.world_revision,false);
  expect(await archive(s.id,archived.world_revision,false)).toEqual(restored);
  const after=await f.rpc(f.ids.a,'load_game_save',{p_save:s.id});
  expect(after.characters).toEqual(before.characters);expect(after.memories).toEqual(before.memories);
  expect(after.context.save.state).toBe(s.state);expect(after.context.save.protagonist_id).toBeNull();
  expect(after.room.credits).toEqual(before.room.credits);expect(after.sessions).toEqual(before.sessions);
});
it('denies archival/restoration by other owners and stale revisions',async()=>{
  const s=await create();await expect(archive(s.id,s.world_revision,true,f.ids.b)).rejects.toThrow();
  await expect(archive(s.id,s.world_revision+1)).rejects.toThrow('Save revision conflict');
  await archive(s.id,s.world_revision);
  await expect(archive(s.id,s.world_revision,false,f.ids.b)).rejects.toThrow();
  await expect(archive(s.id,s.world_revision,false)).rejects.toThrow('Save revision conflict');
});
it('does not archive the origin of a pending focus or change that focus',async()=>{
  const before=await f.rpc(f.ids.a,'load_game_save',{p_save:f.ids.one});
  await expect(archive(f.ids.one,before.context.save.world_revision)).rejects.toThrow('existing focus');
  const after=await f.rpc(f.ids.a,'load_game_save',{p_save:f.ids.one});
  expect(after.sessions).toEqual(before.sessions);expect(after.context).toEqual(before.context);
});
it('retains the creation receipt even after archival so old retries cannot create another world',async()=>{
  const id=randomUUID(),s=await create(id);const a=await archive(s.id,s.world_revision);
  expect((await create(id)).id).toBe(s.id);expect((await create(id)).archived_at).toBe(a.archived_at);
});
it('denies direct mutation of saves and private request receipts and exposes no anonymous RPC',async()=>{
  await f.db.exec('begin;set local role authenticated');
  try{await expect(f.db.query('update public.game_saves set name=$1 where id=$2',['Hacked',f.ids.one])).rejects.toThrow();}finally{await f.db.exec('rollback');}
  await f.db.exec('begin;set local role authenticated');
  try{await expect(f.db.query('select * from game_private.save_creation_requests')).rejects.toThrow();}finally{await f.db.exec('rollback');}
  const grants=await f.db.query("select has_function_privilege('anon','public.create_game_save(uuid,text)','execute') a,has_function_privilege('anon','public.list_game_saves(boolean)','execute') l,has_function_privilege('anon','public.set_game_save_archived(uuid,boolean,bigint)','execute') r");
  expect(grants.rows[0]).toEqual({a:false,l:false,r:false});
});
it('rejects mismatched list data and namespaces pending creation by account',async()=>{
  const input=await list();input.saves[0].save.user_id=f.ids.b;expect(()=>validateSaveList(input,f.ids.a,false)).toThrow();
  expect(newSaveStorageKey(f.ids.a)).not.toBe(newSaveStorageKey(f.ids.b));
});
