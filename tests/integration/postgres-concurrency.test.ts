import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { defaultAdultAppearance } from '../../src/features/room/domain';
import { defaultAppearance } from '../../src/features/character-creator/model';
const url = process.env.POMINS_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite('independent PostgreSQL connections: allocation race', () => {
  let pool: Pool;
  const user = randomUUID();
  const session = randomUUID();
  let character: string;
  let baby: string;
  const sharedSession = randomUUID();
  const crossSaveSession = randomUUID();
  let primarySave: string, secondarySave: string, secondaryCharacter: string;
  async function acting<T>(client: PoolClient, fn: () => Promise<T>) {
    await client.query('begin');
    try {
      await client.query('set local role authenticated');
      await client.query("select set_config('request.jwt.claim.sub',$1,true)", [user]);
      const result = await fn();
      await client.query('commit');
      return result;
    } catch (error) {
      await client.query('rollback');
      throw error;
    }
  }
  async function allocate(id: string) {
    const client = await pool.connect();
    try {
      return await acting(client, () =>
        client.query('select public.room_command($1,$2::jsonb)', [
          'allocate',
          JSON.stringify({
            requestId: id,
            lines: [{ sessionId: session, characterId: character, activity: 'study', minutes: 1 }],
          }),
        ]),
      );
    } finally {
      client.release();
    }
  }
  beforeAll(async () => {
    // This optional integration fixture must never target a user/production database.
    if (!url || new URL(url).pathname !== '/pomins_test')
      throw Error('Use a dedicated ephemeral database named pomins_test.');
    pool = new Pool({ connectionString: url, max: 4 });
    await pool.query(
      `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
    );
    for (const path of ['202610160001_foundation.sql', '202610210001_playable_room.sql'])
      await pool.query(readFileSync(`supabase/migrations/${path}`, 'utf8'));
    await pool.query(readFileSync('supabase/migrations/20261022021139_baby_care.sql', 'utf8'));
    await pool.query(
      readFileSync('supabase/migrations/20261022134830_game_saves_compatibility.sql', 'utf8'),
    );
    await pool.query(readFileSync('supabase/migrations/20261022191724_explicit_save_protagonist.sql','utf8'));
    await pool.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
      user,
      JSON.stringify({ nickname: 'race_test' }),
    ]);
    const client = await pool.connect();
    try {
      const result = await acting(client, () =>
        client.query('select public.room_command($1,$2::jsonb) data', [
          'create',
          JSON.stringify({ name: 'Lumi', appearance: defaultAdultAppearance }),
        ]),
      );
      character = result.rows[0].data.residents[0].id;
      const created = await acting(client, () =>
        client.query('select * from public.create_character($1,$2::jsonb)', [
          'Bebê',
          JSON.stringify(defaultAppearance),
        ]),
      );
      baby = created.rows[0].id;
      primarySave = (
        await acting(client, () => client.query('select public.get_game_context() data'))
      ).rows[0].data.save.id;
    } finally {
      client.release();
    }
    await pool.query(
      "insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,validated_ms,client_id) values($1,$2,$3,'completed',120,120000,$4)",
      [session, user, character, randomUUID()],
    );
    await pool.query(
      "insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,validated_ms,client_id) values($1,$2,$3,'completed',120,120000,$4)",
      [sharedSession, user, baby, randomUUID()],
    );
    // This second slot exists only in the disposable DB fixture, never in the public UI.
    secondarySave = randomUUID();
    const household = randomUUID();
    await pool.query(
      "insert into public.game_saves(id,user_id,name) values($1,$2,'Outra partida')",
      [secondarySave, user],
    );
    await pool.query('insert into public.households(id,user_id,save_id) values($1,$2,$3)', [
      household,
      user,
      secondarySave,
    ]);
    await pool.query('update public.game_saves set primary_household_id=$1 where id=$2', [
      household,
      secondarySave,
    ]);
    const other = await pool.connect();
    try {
      secondaryCharacter = (
        await acting(other, () =>
          other.query("select public.room_command_for_save($1,'create',$2::jsonb) data", [
            secondarySave,
            JSON.stringify({ name: 'Outra vida', appearance: defaultAdultAppearance }),
          ]),
        )
      ).rows[0].data.residents[0].id;
    } finally {
      other.release();
    }
    await pool.query(
      "insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,validated_ms,client_id) values($1,$2,$3,'completed',120,120000,$4)",
      [crossSaveSession, user, secondaryCharacter, randomUUID()],
    );
  });
  afterAll(async () => {
    await pool?.end();
  });
  it('deduplicates concurrent retries on different connections', async () => {
    const id = randomUUID();
    const result = await Promise.allSettled([allocate(id), allocate(id)]);
    expect(result.every((r) => r.status === 'fulfilled')).toBe(true);
    const credits = await pool.query(
      'select allocated_minutes from public.focus_credits where session_id=$1',
      [session],
    );
    expect(credits.rows[0].allocated_minutes).toBe(1);
  });
  it('only one of two competing requests can spend the last minute', async () => {
    const result = await Promise.allSettled([allocate(randomUUID()), allocate(randomUUID())]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1);
    const credits = await pool.query(
      'select allocated_minutes from public.focus_credits where session_id=$1',
      [session],
    );
    expect(credits.rows[0].allocated_minutes).toBe(2);
    const progress = await pool.query(
      'select progress_minutes,skills from public.characters where id=$1',
      [character],
    );
    expect(progress.rows[0].progress_minutes).toBe(2);
    expect(progress.rows[0].skills.knowledge).toBe(4);
  });
  async function care(requestId: string) {
    const client = await pool.connect();
    try {
      return await acting(client, () =>
        client.query('select public.baby_care($1::jsonb)', [
          JSON.stringify({
            requestId,
            characterId: baby,
            activity: 'baby_cuddle',
            lines: [{ sessionId: sharedSession, minutes: 1 }],
          }),
        ]),
      );
    } finally {
      client.release();
    }
  }
  it('deduplicates simultaneous baby care retries on independent connections', async () => {
    const id = randomUUID();
    const results = await Promise.allSettled([care(id), care(id)]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(
      (
        await pool.query('select allocated_minutes from public.focus_credits where session_id=$1', [
          sharedSession,
        ])
      ).rows[0].allocated_minutes,
    ).toBe(1);
    expect(
      (
        await pool.query(
          "select * from public.game_events where character_id=$1 and kind='BabyCare'",
          [baby],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it('serializes adult and baby spending of the same last minute', async () => {
    const client = await pool.connect();
    try {
      const adult = acting(client, () =>
        client.query("select public.room_command('allocate',$1::jsonb)", [
          JSON.stringify({
            requestId: randomUUID(),
            lines: [
              { sessionId: sharedSession, characterId: character, activity: 'study', minutes: 1 },
            ],
          }),
        ]),
      );
      const results = await Promise.allSettled([care(randomUUID()), adult]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
      expect(
        (
          await pool.query(
            'select allocated_minutes from public.focus_credits where session_id=$1',
            [sharedSession],
          )
        ).rows[0].allocated_minutes,
      ).toBe(2);
      expect(
        (
          await pool.query(
            'select sum(minutes)::integer total from public.focus_allocations where session_id=$1',
            [sharedSession],
          )
        ).rows[0].total,
      ).toBe(2);
    } finally {
      client.release();
    }
  });
  async function allocateInSave(save: string, char: string, requestId: string) {
    const client = await pool.connect();
    try {
      return await acting(client, () =>
        client.query("select public.room_command_for_save($1,'allocate',$2::jsonb)", [
          save,
          JSON.stringify({
            requestId,
            lines: [
              { sessionId: crossSaveSession, characterId: char, activity: 'study', minutes: 1 },
            ],
          }),
        ]),
      );
    } finally {
      client.release();
    }
  }
  it('deduplicates a scoped request concurrently without changing its global identity', async () => {
    const request = randomUUID();
    const result = await Promise.allSettled([
      allocateInSave(secondarySave, secondaryCharacter, request),
      allocateInSave(secondarySave, secondaryCharacter, request),
    ]);
    expect(result.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(
      (
        await pool.query('select allocated_minutes from public.focus_credits where session_id=$1', [
          crossSaveSession,
        ])
      ).rows[0].allocated_minutes,
    ).toBe(1);
    expect(
      (await pool.query('select * from public.focus_allocations where request_id=$1', [request]))
        .rows,
    ).toHaveLength(1);
  });
  it('lets only one save consume the final account minute', async () => {
    const result = await Promise.allSettled([
      allocateInSave(primarySave, character, randomUUID()),
      allocateInSave(secondarySave, secondaryCharacter, randomUUID()),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(
      (
        await pool.query('select allocated_minutes from public.focus_credits where session_id=$1', [
          crossSaveSession,
        ])
      ).rows[0].allocated_minutes,
    ).toBe(2);
    expect(
      (
        await pool.query(
          'select sum(minutes)::integer total from public.focus_allocations where session_id=$1',
          [crossSaveSession],
        )
      ).rows[0].total,
    ).toBe(2);
  });
  it('allows only one open focus when two saves start simultaneously', async () => {
    const ids = [randomUUID(), randomUUID()],
      characters = [character, secondaryCharacter],
      saves = [primarySave, secondarySave];
    const result = await Promise.allSettled(
      ids.map(async (id, i) => {
        const client = await pool.connect();
        try {
          return await acting(client, () =>
            client.query("select public.start_save_focus($1,$2,$3,$4,120,'','')", [
              saves[i],
              id,
              randomUUID(),
              characters[i],
            ]),
          );
        } finally {
          client.release();
        }
      }),
    );
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(
      (
        await pool.query(
          "select * from public.focus_sessions where user_id=$1 and status in ('active','paused','interrupted')",
          [user],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it('serializes competing protagonist choices and retries the winner idempotently',async()=>{
    await pool.query("update public.game_saves set state='pending_selection',protagonist_id=null where id=$1",[primarySave]);
    const revision=(await pool.query('select world_revision from public.game_saves where id=$1',[primarySave])).rows[0].world_revision;
    const choose=async(id:string)=>{const client=await pool.connect();try{return await acting(client,()=>client.query('select public.select_save_protagonist($1,$2,$3) data',[primarySave,id,revision]));}finally{client.release();}};
    const results=await Promise.allSettled([choose(character),choose(baby)]);
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
    const save=(await pool.query('select protagonist_id,world_revision from public.game_saves where id=$1',[primarySave])).rows[0];
    const retry=await choose(save.protagonist_id);expect(retry.rows[0].data.save.world_revision).toBe(Number(save.world_revision));
    expect((await pool.query("select count(*)::integer n from public.game_events where save_id=$1 and kind='ProtagonistSelected'",[primarySave])).rows[0].n).toBe(1);
  });
});
