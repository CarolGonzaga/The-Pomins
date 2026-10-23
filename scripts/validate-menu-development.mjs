// Development-only preferences test: restores the original metadata; no email/password updates.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createServerClient} from '@supabase/ssr';
for(const file of ['.env.local','.env.supabase-test.local'])if(fs.existsSync(file))process.loadEnvFile(file);
const env=process.env,clients=[],passed=[];
let original,changed=false,accountB,stage='opt-in';
const checked=r=>{assert(!r.error,'Authenticated request failed');return r.data;};
const pass=name=>{passed.push(name);console.log('APROVADO: '+name);};
async function login(letter){
  const jar=new Map(),db=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
    auth:{autoRefreshToken:false,detectSessionInUrl:false},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))},
    global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(25000)})},
  });clients.push(db);
  const data=checked(await db.auth.signInWithPassword({email:env[`POMINS_TEST_${letter}_EMAIL`],password:env[`POMINS_TEST_${letter}_PASSWORD`]}));assert(data.user);return {db,jar,user:data.user};
}
try{
  assert(env.POMINS_REMOTE_TESTS==='development-only'&&env.POMINS_TEST_PROJECT_URL===env.NEXT_PUBLIC_SUPABASE_URL&&new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname==='ogzgfkxhxdrwemdzxskg.supabase.co');
  const origin=env.POMINS_TEST_SSR_ORIGIN;assert(origin&&['127.0.0.1','localhost'].includes(new URL(origin).hostname)&&['3000','3183'].includes(new URL(origin).port));
  const a=await login('A'),b=await login('B');accountB=b;original=structuredClone(b.user.user_metadata);
  pass('login real A/B e cookies SSR');
  const call=(account,path,method='GET',body,actor=account.user.id)=>fetch(new URL(path,origin),{method,headers:{cookie:[...account.jar].map(([k,v])=>k+'='+v).join('; '),...(method==='GET'?{}:{origin,'Content-Type':'application/json','X-Pomins-Account':actor})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});
  const before=[];
  stage='SSR';
  for(const account of [a,b]){
    const context=checked(await account.db.rpc('get_game_context'));const world=checked(await account.db.rpc('load_game_save',{p_save:context.save.id}));before.push(world);
    for(const route of ['/menu','/rules','/settings','/saves','/saves/new','/','/play'])assert.equal((await call(account,route)).status,200);
    assert((await(await call(account,'/menu')).text()).includes('Começar'));
  }
  pass('menu, regras, configurações, saves e rotas legadas com identidade real');
  const test={focus_minutes:7,theme:'dark',reduce_motion:true,avatar:'star'};
  stage='ownership checks';
  assert.equal((await call(a,'/api/preferences','PATCH',test,b.user.id)).status,409);
  const anonymous=await fetch(new URL('/api/preferences',origin),{method:'PATCH',headers:{origin,'Content-Type':'application/json','X-Pomins-Account':a.user.id},body:JSON.stringify(test)});assert.equal(anonymous.status,401);
  pass('preferências negadas sem login ou com contexto antigo de outra conta');
  stage='save preferences';changed=true;
  const saved=await call(b,'/api/preferences','PATCH',test);assert.equal(saved.status,200);assert.deepEqual((await saved.json()).preferences,test);
  const fresh=checked(await b.db.auth.getUser()).user;assert.deepEqual(fresh.user_metadata.pomins_preferences,test);
  const menuHtml=await(await call(b,'/menu')).text();assert(menuHtml.includes('aria-label="Estrela"'));
  pass('preferências e avatar persistidos no Auth real e renderizados pelo SSR');
  stage='new login';const relogin=await login('B');assert.deepEqual(relogin.user.user_metadata.pomins_preferences,test);
  const settingsHtml=await(await call(relogin,'/settings')).text();assert(settingsHtml.includes('value="7"'));
  assert.deepEqual(checked(await a.db.auth.getUser()).user.user_metadata,a.user.user_metadata);
  pass('novo login restaura preferências de B sem alterar preferências de A');
  stage='restore original metadata';
  checked(await b.db.auth.updateUser({data:{pomins_preferences:original.pomins_preferences??null}}));changed=false;
  assert.deepEqual(checked(await b.db.auth.getUser()).user.user_metadata,original);
  pass('metadados originais da conta de teste restaurados integralmente');
  stage='unchanged game state';
  for(const [i,account]of [a,b].entries()){
    const old=before[i],after=checked(await account.db.rpc('load_game_save',{p_save:old.context.save.id}));
    for(const field of ['characters','memories','events','sessions'])assert.deepEqual(after[field],old[field]);
    assert.deepEqual(after.room.credits,old.room.credits);assert.equal(after.context.save.world_revision,old.context.save.world_revision);assert.equal(after.context.save.protagonist_id,old.context.save.protagonist_id);
  }
  pass('personagens, protagonistas, histórico, saldo e sessões preservados');
  fs.mkdirSync('.cache/menu-development',{recursive:true});fs.writeFileSync('.cache/menu-development/auth-validation.json',JSON.stringify({checked_at:new Date().toISOString(),environment:'real-supabase-development-auth',passed,preferences_restored:true,focus_commands:0,minutes_spent:0,email_or_password_changed:false,recovery_emails_sent:0,migrations_executed:0,browser_sessions_untouched:true},null,2)+'\n');
}catch{console.error('Validação real 5E incompleta na etapa: '+stage+'. Nenhuma credencial foi exibida.');process.exitCode=1;}
finally{
  if(changed&&accountB&&original){try{checked(await accountB.db.auth.updateUser({data:{pomins_preferences:original.pomins_preferences??null}}));console.log('Preferências originais restauradas após falha do teste.');}catch{console.error('Pendente: restaurar a preferência de teste da conta B.');process.exitCode=1;}}
  for(const db of clients)await db.auth.signOut({scope:'local'}).catch(()=>{});
}
