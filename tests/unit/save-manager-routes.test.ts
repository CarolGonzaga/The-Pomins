import {beforeEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({rpc:vi.fn(),getUser:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({serverClient:async()=>({rpc:mock.rpc,auth:{getUser:mock.getUser}})}));
import {GET,POST,PATCH} from '@/app/api/game-saves/route';
const user='10000000-0000-4000-8000-000000000001',id='20000000-0000-4000-8000-000000000001';
const save={id,user_id:user,name:'História',protagonist_id:null,primary_household_id:null,current_generation:1,state:'draft',format_version:1,world_revision:0,progression:{},created_at:'2026-10-22',last_used_at:null,archived_at:null,origin_save_id:null,origin_snapshot_id:null};
const request=(body:unknown,origin='http://localhost:3000')=>new Request('http://0.0.0.0:3000/api/game-saves',{method:'POST',headers:{host:'localhost:3000',origin},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mock.getUser.mockResolvedValue({data:{user:{id:user}},error:null});mock.rpc.mockResolvedValue({data:save,error:null});});
it('authenticates and creates with only the validated request identifier and name',async()=>{
  const r=await POST(request({requestId:id,name:' História '}));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('private, no-store');
  expect(mock.rpc).toHaveBeenCalledWith('create_game_save',{p_request:id,p_name:'História'});
});
it('rejects forged owners and cross-origin mutations',async()=>{
  expect((await POST(request({requestId:id,name:'História',owner:user}))).status).toBe(400);
  expect((await PATCH(request({saveId:id,archived:true,expectedRevision:0},'https://foreign.test'))).status).toBe(403);expect(mock.rpc).not.toHaveBeenCalled();
});
it('requires authenticated listing and mutations',async()=>{
  mock.getUser.mockResolvedValue({data:{user:null}});
  expect((await GET(new Request('http://localhost/api/game-saves'))).status).toBe(401);
  expect((await POST(request({requestId:id,name:'História'}))).status).toBe(401);expect(mock.rpc).not.toHaveBeenCalled();
});
it('passes revision and desired archive state to the guarded RPC',async()=>{
  expect((await PATCH(request({saveId:id,archived:false,expectedRevision:2}))).status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith('set_game_save_archived',{p_save:id,p_archived:false,p_expected_revision:2});
});
it('rejects malformed data and exposes neither SQL errors nor successful fallback',async()=>{
  expect((await PATCH(request({saveId:id,archived:true,expectedRevision:-1}))).status).toBe(400);
  mock.rpc.mockResolvedValue({data:null,error:{code:'PGRST202',message:'private details'}});
  const r=await POST(request({requestId:id,name:'História'}));expect(r.status).toBe(503);expect(await r.text()).not.toContain('private details');
});
it('validates owner and save identifier in returned mutations',async()=>{
  mock.rpc.mockResolvedValue({data:{...save,user_id:id},error:null});expect((await POST(request({requestId:id,name:'História'}))).status).toBe(503);
});
it('lists archived saves separately with no-store and validates filters',async()=>{
  mock.rpc.mockResolvedValue({data:{saves:[]},error:null});
  const r=await GET(new Request('http://localhost/api/game-saves?archived=true'));expect(r.status).toBe(200);
  expect(mock.rpc).toHaveBeenCalledWith('list_game_saves',{p_archived:true});
  expect((await GET(new Request('http://localhost/api/game-saves?archived=yes'))).status).toBe(400);
});
