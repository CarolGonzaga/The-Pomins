import {it,expect,vi,beforeEach} from 'vitest';
import {defaultPreferences,readPreferences,preferencesSchema,loginDestination} from '@/features/preferences/model';
const mock=vi.hoisted(()=>({getUser:vi.fn(),updateUser:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({serverClient:async()=>({auth:mock})}));
import {PATCH} from '@/app/api/preferences/route';
const userId='10000000-0000-4000-8000-000000000001';
const request=(body:unknown=defaultPreferences,origin='http://localhost:3000')=>new Request('http://0.0.0.0:3000/api/preferences',{method:'PATCH',headers:{host:'localhost:3000',origin,'x-pomins-account':userId},body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mock.getUser.mockResolvedValue({data:{user:{id:userId}},error:null});mock.updateUser.mockImplementation(async x=>({data:{user:{id:userId,user_metadata:x.data}},error:null}));});
it('accepts only supported preferences and provides safe defaults for invalid metadata',()=>{
  expect(readPreferences(null)).toEqual(defaultPreferences);expect(readPreferences({pomins_preferences:{...defaultPreferences,focus_minutes:121}})).toEqual(defaultPreferences);
  expect(preferencesSchema.safeParse({...defaultPreferences,pause_minutes:5}).success).toBe(false);
});
it('restores account preferences without treating metadata as authorization',()=>{
  expect(readPreferences({pomins_preferences:{...defaultPreferences,theme:'dark',focus_minutes:37},role:'admin'})).toEqual({...defaultPreferences,theme:'dark',focus_minutes:37});
});
it('allows only explicit internal destinations after login',()=>{
  expect(loginDestination('/settings')).toBe('/settings');expect(loginDestination('/saves/new')).toBe('/saves/new');
  for(const value of [null,'//foreign.test','https://foreign.test','/game/anything','/settings?next=foreign'])expect(loginDestination(value)).toBe('/menu');
});
it('persists only the current account metadata and returns verified preferences',async()=>{
  const preferences={...defaultPreferences,theme:'dark' as const,avatar:'moon' as const};
  const r=await PATCH(request(preferences));expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('private, no-store');
  expect(mock.updateUser).toHaveBeenCalledWith({data:{pomins_preferences:preferences}});expect(await r.json()).toEqual({userId,preferences});
});
it('blocks cross-origin requests and forged properties',async()=>{
  expect((await PATCH(request(defaultPreferences,'https://foreign.test'))).status).toBe(403);
  expect((await PATCH(request({...defaultPreferences,user_id:userId}))).status).toBe(400);expect(mock.updateUser).not.toHaveBeenCalled();
});
it('requires verified authentication and does not report failed updates as success',async()=>{
  mock.getUser.mockResolvedValue({data:{user:null},error:null});expect((await PATCH(request())).status).toBe(401);
  mock.getUser.mockResolvedValue({data:{user:{id:userId}},error:null});mock.updateUser.mockResolvedValue({data:{user:null},error:{message:'private'}});
  const r=await PATCH(request());expect(r.status).toBe(503);expect(await r.text()).not.toContain('private');
});
it('rejects a stale account context from another tab before writing metadata',async()=>{
  const r=request();r.headers.set('x-pomins-account','another-account');expect((await PATCH(r)).status).toBe(409);expect(mock.updateUser).not.toHaveBeenCalled();
});
