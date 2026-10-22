// Explicitly opted-in development validation. Creates two labelled test worlds, then archives them.
// Never changes existing protagonists, focus sessions or credit allocations.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServerClient} from '@supabase/ssr';
for(const file of ['.env.local','.env.supabase-test.local'])if(fs.existsSync(file))process.loadEnvFile(file);
const env=process.env,clients=[],passed=[],dir='.cache/save-manager-development';
let stage='development opt-in';
const pass=name=>{stage=name;passed.push(name);console.log('APROVADO: '+name);};
const checked=r=>{assert(!r.error,'Authenticated command failed');return r.data;};
async function login(letter){
  const jar=new Map();
  const db=createServerClient(env.NEXT_PUBLIC_SUPABASE_URL,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
    auth:{autoRefreshToken:false,detectSessionInUrl:false},
    cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))},
    global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(25000)})},
  });clients.push(db);
  const r=await db.auth.signInWithPassword({email:env[`POMINS_TEST_${letter}_EMAIL`],password:env[`POMINS_TEST_${letter}_PASSWORD`]});
  assert(!r.error && r.data.user,'Development login failed');return {db,jar,userId:r.data.user.id};
}
try{
  assert(env.POMINS_REMOTE_TESTS==='development-only' && env.POMINS_TEST_PROJECT_URL===env.NEXT_PUBLIC_SUPABASE_URL && new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname==='ogzgfkxhxdrwemdzxskg.supabase.co');
  const origin=env.POMINS_TEST_SSR_ORIGIN;
  assert(origin && ['127.0.0.1','localhost'].includes(new URL(origin).hostname) && new URL(origin).port==='3183','Use isolated development SSR server on 3183');
  fs.mkdirSync(dir,{recursive:true});
  stage='login';const a=await login('A'),b=await login('B');pass('login real de duas contas e cookies SSR');
  const beforeA=checked(await a.db.rpc('get_game_context')),beforeB=checked(await b.db.rpc('get_game_context'));
  const originalA=checked(await a.db.rpc('load_game_save',{p_save:beforeA.save.id})),originalB=checked(await b.db.rpc('load_game_save',{p_save:beforeB.save.id}));
  assert(!originalA.sessions.some(s=>s.status==='active') && !originalB.sessions.some(s=>s.status==='active'),'Wait for active focus without interrupting it');
  const call=async(account,path,method='GET',body)=>fetch(new URL(path,origin),{
    method,headers:{cookie:[...account.jar].map(([k,v])=>k+'='+v).join('; '),...(method!=='GET'?{'Content-Type':'application/json',origin,host:new URL(origin).host}:{})},
    ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000),redirect:'manual',
  });
  stage='owned lists';
  for(const account of [a,b]){
    const list=checked(await account.db.rpc('list_game_saves',{p_archived:false}));
    assert(list.saves.every(x=>x.save.user_id===account.userId));
    for(const path of ['/saves','/saves/new','/','/play']){stage='SSR '+path;assert((await call(account,path)).status===200);}
  }
  stage='anonymous redirect';
  const anonymous=await fetch(new URL('/saves',origin),{redirect:'manual'});
  // loading.tsx can flush 200 before an async redirect; Next then streams its redirect marker.
  assert(anonymous.status===307 || (anonymous.status===200 && (await anonymous.text()).includes('/auth?next=/saves')));
  pass('listas por proprietário, SSR /saves e /saves/new, rotas antigas e bloqueio anônimo');
  const requestFile=dir+'/runtime-requests.json';
  let requests;
  if(fs.existsSync(requestFile))requests=JSON.parse(fs.readFileSync(requestFile,'utf8'));
  else{requests={userId:a.userId,items:[0,1].map(i=>({requestId:randomUUID(),name:`Validação 5D ${new Date().toISOString()} ${i+1}`}))};fs.writeFileSync(requestFile,JSON.stringify(requests));}
  assert(requests.userId===a.userId);
  const saves=[];
  stage='create idempotent worlds';
  for(const item of requests.items){
    const create=()=>a.db.rpc('create_game_save',{p_request:item.requestId,p_name:item.name});
    const results=await Promise.all([create(),create()]);const first=checked(results[0]);assert.equal(first.id,checked(results[1]).id);
    assert.equal(first.user_id,a.userId);
    if(first.archived_at)checked(await a.db.rpc('set_game_save_archived',{p_save:first.id,p_archived:false,p_expected_revision:first.world_revision}));
    saves.push(checked(await a.db.rpc('load_game_save',{p_save:first.id})));
  }
  assert.notEqual(saves[0].context.save.id,saves[1].context.save.id);assert.notEqual(saves[0].household.id,saves[1].household.id);
  pass('duas partidas reais independentes; criação concorrente repetida sem duplicação');
  stage='birth and persistence';
  const appearance={species:'human',skin:'#d8a17d',hair:'tuft',hairColor:'#49352e',eyes:'round',eyeColor:'#544532',outfit:'#b7b0d4',accessory:'none',antennas:true,marks:false};
  for(const [i,data] of saves.entries()){
    const id=data.context.save.id;
    const c=checked(await a.db.rpc('create_character_for_save',{p_save:id,p_name:i===0?'Brisa 5D':'Luar 5D',p_appearance:{...appearance,outfit:i===0?'#b7b0d4':'#b3c6ac'}}));
    const character=Array.isArray(c)?c[0]:c;
    checked(await a.db.rpc('read_birth_for_save',{p_save:id,p_character:character.id,p_memory:i===0?'sky':'home'}));
    const loaded=checked(await a.db.rpc('load_game_save',{p_save:id}));saves[i]=loaded;
    assert.equal(loaded.characters.length,1);assert.equal(loaded.context.save.protagonist_id,character.id);
    assert.equal(loaded.characters[0].appearance.outfit,i===0?'#b7b0d4':'#b3c6ac');
    assert.equal(loaded.memories.length,1);assert.equal(loaded.memories[0].choice_id,i===0?'sky':'home');
    assert(loaded.memories.every(m=>m.save_id===id && m.character_id===character.id));
    assert.equal((await call(a,'/game/'+id)).status,200);
  }
  assert.notEqual(saves[0].characters[0].id,saves[1].characters[0].id);
  assert((await a.db.rpc('read_birth_for_save',{p_save:saves[0].context.save.id,p_character:saves[1].characters[0].id,p_memory:'home'})).error);
  pass('nascimento, aparência e memórias persistidos separadamente; referência incompatível recusada');
  stage='RLS and origin';
  const target=saves[0].context.save;
  assert((await b.db.rpc('load_game_save',{p_save:target.id})).error);
  assert((await b.db.rpc('set_game_save_archived',{p_save:target.id,p_archived:true,p_expected_revision:target.world_revision})).error);
  assert.equal(checked(await b.db.from('game_saves').select('id').eq('id',target.id)).length,0);
  assert.equal((await call(b,'/api/game-saves','PATCH',{saveId:target.id,archived:true,expectedRevision:target.world_revision})).status,409);
  pass('RLS e endpoints recusam leitura ou arquivamento pela outra conta');
  stage='archive restore';
  for(const data of saves){
    const s=data.context.save;
    const archived=checked(await a.db.rpc('set_game_save_archived',{p_save:s.id,p_archived:true,p_expected_revision:s.world_revision}));
    const retry=checked(await a.db.rpc('set_game_save_archived',{p_save:s.id,p_archived:true,p_expected_revision:s.world_revision}));assert.equal(retry.world_revision,archived.world_revision);
    assert((await a.db.rpc('load_game_save',{p_save:s.id})).error);
    const restored=checked(await a.db.rpc('set_game_save_archived',{p_save:s.id,p_archived:false,p_expected_revision:archived.world_revision}));
    const after=checked(await a.db.rpc('load_game_save',{p_save:s.id}));assert.deepEqual(after.characters,data.characters);assert.deepEqual(after.memories,data.memories);
    assert.equal(restored.protagonist_id,s.protagonist_id);
    // Keep labelled test worlds, archived and recoverable; never delete user data.
    checked(await a.db.rpc('set_game_save_archived',{p_save:s.id,p_archived:true,p_expected_revision:restored.world_revision}));
  }
  const archiveList=checked(await a.db.rpc('list_game_saves',{p_archived:true}));assert(saves.every(x=>archiveList.saves.some(e=>e.save.id===x.context.save.id)));
  pass('arquivamento repetido, restauração integral e duas histórias de teste preservadas como arquivadas');
  stage='new authenticated session';
  await a.db.auth.signOut({scope:'local'});const again=await login('A');
  const restoredList=checked(await again.db.rpc('list_game_saves',{p_archived:true}));assert(saves.every(x=>restoredList.saves.some(e=>e.save.id===x.context.save.id && e.protagonist.id===x.characters[0].id)));
  assert.equal((await call(again,'/saves?archived=true')).status,200);
  pass('novo login real restaura lista, protagonistas e aparências dos saves de teste');
  stage='unchanged global focus and original worlds';
  for(const [account,before] of [[again,originalA],[b,originalB]]){
    const after=checked(await account.db.rpc('load_game_save',{p_save:before.context.save.id}));
    assert.deepEqual(after.sessions,before.sessions);assert.deepEqual(after.room.credits,before.room.credits);
    assert.deepEqual(after.characters,before.characters);assert.deepEqual(after.memories,before.memories);assert.deepEqual(after.events,before.events);
    assert.equal(after.context.save.world_revision,before.context.save.world_revision);assert.equal(after.context.save.protagonist_id,before.context.save.protagonist_id);
  }
  pass('sessões, saldo e mundos originais intactos, incluindo protagonista pendente');
  fs.writeFileSync(dir+'/auth-validation.json',JSON.stringify({checked_at:new Date().toISOString(),environment:'real-supabase-development-auth',passed,test_saves:2,test_saves_archived:2,test_babies:2,focus_commands:0,minutes_spent:0,original_characters_unchanged:true,original_protagonists_unchanged:true,browser_sessions_untouched:true},null,2)+'\n');
}catch{console.error('Validação 5D incompleta na etapa: '+stage+'. Confira os pedidos locais antes de repetir; nenhum dado privado foi exibido.');process.exitCode=1;}
finally{for(const db of clients)await db.auth.signOut({scope:'local'}).catch(()=>{});}
