import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
export async function createSaveFixture({immersive:withImmersive=false}={}) {
  const db = new PGlite();
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const name of [
    '202610160001_foundation.sql',
    '202610210001_playable_room.sql',
    '20261022021139_baby_care.sql',
    '20261022134830_game_saves_compatibility.sql',
    '20261022191724_explicit_save_protagonist.sql',
    '20261022202113_save_manager.sql',
  ])
    await db.exec(readFileSync('supabase/migrations/' + name, 'utf8'));
  let queue = Promise.resolve();
  const rpc = (uid, name, args = {}) => {
    const run = queue.then(async () => {
      await db.exec('begin;set local role authenticated');
      try {
        await db.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
        const names = Object.keys(args);
        const result = await db.query(
          `select to_jsonb(public.${name}(${names.map((k, i) => k + '=> $' + (i + 1)).join(',')})) data`,
          Object.values(args).map((v) => (typeof v === 'object' ? JSON.stringify(v) : v)),
        );
        await db.exec('commit');
        return result.rows[0].data;
      } catch (e) {
        await db.exec('rollback');
        throw e;
      }
    });
    queue = run.catch(() => {});
    return run;
  };
  const a = '10000000-0000-4000-8000-000000000001',
    b = '10000000-0000-4000-8000-000000000002';
  for (const uid of [a, b])
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
      uid,
      JSON.stringify({ nickname: uid === a ? 'fixture_a' : 'fixture_b' }),
    ]);
  const one = (await rpc(a, 'get_game_context')).save.id,
    foreign = (await rpc(b, 'get_game_context')).save.id;
  const two = '20000000-0000-4000-8000-000000000002',
    h = '30000000-0000-4000-8000-000000000002';
  await db.query("insert into public.game_saves(id,user_id,name) values($1,$2,'Outra história')", [
    two,
    a,
  ]);
  await db.query('insert into public.households(id,user_id,save_id) values($1,$2,$3)', [h, a, two]);
  await db.query('update public.game_saves set primary_household_id=$1 where id=$2', [h, two]);
  const appearance = {
    body: 'male',
    skin: '#d8a17d',
    hairStyle: 'plain',
    hairColor: '#49352e',
    eyeColor: '#628472',
    clothing: 'longsleeve',
    clothingColor: '#8975aa',
  };
  const create = async (s, name, uid=a) =>
    (
      await rpc(uid, 'room_command_for_save', {
        p_save: s,
        p_action: 'create',
        p_payload: { name, appearance },
      })
    ).residents[0].id;
  const adultOne = await create(one, 'Aurora'),
    adultTwo = await create(two, 'Sol');
  const baby = (
    await rpc(a, 'create_character_for_save', {
      p_save: two,
      p_name: 'Nina',
      p_appearance: {
        species: 'human',
        skin: '#d8a17d',
        hair: 'tuft',
        hairColor: '#49352e',
        eyes: 'round',
        eyeColor: '#544532',
        outfit: '#b7b0d4',
        accessory: 'none',
        antennas: true,
        marks: false,
      },
    })
  ).id;
  await rpc(a,'read_birth_for_save',{p_save:two,p_character:baby,p_memory:'home'});
  await db.query(
    "update public.game_saves set protagonist_id=null,state='pending_selection' where id=$1",
    [two],
  );
  const credit = '40000000-0000-4000-8000-000000000001',
    paused = '40000000-0000-4000-8000-000000000002',
    client = '50000000-0000-4000-8000-000000000001';
  await db.query(
    "insert into public.focus_sessions(id,user_id,character_id,client_id,planned_seconds,status,validated_ms) values($1,$2,$3,$4,120,'completed',120000),($5,$2,$3,$4,120,'paused',60000)",
    [credit, a, adultOne, client, paused],
  );
  // Independent disposable worlds for UI tests; never shared with A/B regressions.
  const immersive={};
  // Separate dial and room suites: files can run concurrently within one project.
  for(const [project,uid] of (withImmersive?[
    ['chromium','10000000-0000-4000-8000-000000000003'],
    ['iphone','10000000-0000-4000-8000-000000000004'],
    ['dial-chromium','10000000-0000-4000-8000-000000000005'],
    ['dial-iphone','10000000-0000-4000-8000-000000000006'],
  ]:[])){
    await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[uid,JSON.stringify({nickname:'immersive_'+project.replaceAll('-','_')})]);
    const adultSave=(await rpc(uid,'get_game_context')).save.id;
    const adult=await create(adultSave,'Íris',uid);
    const babySave=(await rpc(uid,'create_game_save',{p_request:crypto.randomUUID(),p_name:'Pequenos começos'})).id;
    const babyAppearance=(await db.query('select appearance from public.characters where id=$1',[baby])).rows[0].appearance;
    const babyId=(await rpc(uid,'create_character_for_save',{p_save:babySave,p_name:'Lumi',p_appearance:babyAppearance})).id;
    await rpc(uid,'read_birth_for_save',{p_save:babySave,p_character:babyId,p_memory:'sky'});
    await db.query("insert into public.focus_sessions(id,user_id,character_id,client_id,planned_seconds,status,validated_ms) values($1,$2,$3,$4,120,'completed',120000)",[crypto.randomUUID(),uid,adult,crypto.randomUUID()]);
    immersive[project]={userId:uid,adultSave,babySave,adult,baby:babyId};
  }
  return { db, rpc, ids: { immersive, a, b, one, two, foreign, adultOne, adultTwo, baby, credit, paused } };
}
