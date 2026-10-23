import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const mock=vi.hoisted(()=>({getUser:vi.fn(),getSession:vi.fn(),active:vi.fn(),updateUser:vi.fn(),signOut:vi.fn(),resetPasswordForEmail:vi.fn(),assurance:vi.fn(),verify:vi.fn(),verifyOut:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({serverClient:async()=>({auth:{getUser:mock.getUser,getSession:mock.getSession,updateUser:mock.updateUser,signOut:mock.signOut,resetPasswordForEmail:mock.resetPasswordForEmail,mfa:{getAuthenticatorAssuranceLevel:mock.assurance}},from:()=>({select:()=>({eq:()=>({eq:()=>({limit:mock.active})})})})})}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{signInWithPassword:mock.verify,signOut:mock.verifyOut}})}));
import {POST} from '@/app/api/account/route';
const request=(body:unknown,origin='http://localhost:3000')=>new Request('http://0.0.0.0:3000/api/account',{method:'POST',headers:{host:'localhost:3000',origin,'x-pomins-account':'owner'},body:JSON.stringify(body)});
beforeEach(()=>{
  vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_APP_URL','http://localhost:3000');
  mock.getUser.mockResolvedValue({data:{user:{id:'owner',email:'owner@example.test'}},error:null});mock.active.mockResolvedValue({data:[],error:null});
  mock.assurance.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null});mock.verify.mockResolvedValue({data:{user:{id:'owner'}},error:null});
  mock.getSession.mockResolvedValue({data:{session:{access_token:'verified-fixture-token'}},error:null});
  for(const fn of [mock.updateUser,mock.signOut,mock.resetPasswordForEmail,mock.verifyOut])fn.mockResolvedValue({error:null});
});
afterEach(()=>vi.unstubAllEnvs());
it('requires authentication and rejects CSRF before changing account data',async()=>{
  expect((await POST(request({action:'logout'},'https://foreign.test'))).status).toBe(403);
  mock.getUser.mockResolvedValue({data:{user:null},error:null});expect((await POST(request({action:'logout'}))).status).toBe(401);expect(mock.signOut).not.toHaveBeenCalled();
});
it('does not log out or change the account during active focus',async()=>{
  mock.active.mockResolvedValue({data:[{id:'focus'}],error:null});
  for(const action of [{action:'logout'},{action:'password-link'},{action:'email',email:'new@example.test',password:'fixture-password'}])expect((await POST(request(action))).status).toBe(409);
  expect(mock.signOut).not.toHaveBeenCalled();expect(mock.updateUser).not.toHaveBeenCalled();expect(mock.resetPasswordForEmail).not.toHaveBeenCalled();
});
it('sends password recovery to the verified account email using the existing callback',async()=>{
  expect((await POST(request({action:'password-link'}))).status).toBe(200);
  expect(mock.resetPasswordForEmail).toHaveBeenCalledWith('owner@example.test',{redirectTo:'http://localhost:3000/auth/callback?next=/auth?mode=update'});
});
it('rejects wrong current passwords and cleans only the temporary verification session',async()=>{
  mock.verify.mockResolvedValue({data:{user:null},error:{message:'private'}});
  expect((await POST(request({action:'email',email:'new@example.test',password:'wrong-fixture-password'}))).status).toBe(403);
  expect(mock.updateUser).not.toHaveBeenCalled();expect(mock.verifyOut).toHaveBeenCalledWith({scope:'local'});expect(mock.signOut).not.toHaveBeenCalled();
});
it('requires MFA assurance when the account has verified additional factors',async()=>{
  mock.assurance.mockResolvedValue({data:{currentLevel:'aal1',nextLevel:'aal2'},error:null});
  expect((await POST(request({action:'email',email:'new@example.test',password:'fixture-password'}))).status).toBe(403);expect(mock.verify).not.toHaveBeenCalled();
});
it('requests email confirmation only after reauthentication of the same user',async()=>{
  const r=await POST(request({action:'email',email:'new@example.test',password:'fixture-password'}));expect(r.status).toBe(200);
  expect(mock.verify).toHaveBeenCalledWith({email:'owner@example.test',password:'fixture-password'});
  expect(mock.assurance).toHaveBeenCalledWith('verified-fixture-token');
  expect(mock.updateUser).toHaveBeenCalledWith({email:'new@example.test'},{emailRedirectTo:'http://localhost:3000/auth/callback'});
  expect((await r.json()).message).toContain('confirmação');
});
it('logs out only the current browser and rejects unsupported changes',async()=>{
  expect((await POST(request({action:'logout'}))).status).toBe(200);expect(mock.signOut).toHaveBeenCalledWith({scope:'local'});
  expect((await POST(request({action:'password',password:'fixture-password'}))).status).toBe(400);
});
