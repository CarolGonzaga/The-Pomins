import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { defaultAppearance } from '../../src/features/character-creator/model';
import { defaultAdultAppearance } from '../../src/features/room/domain';
import { foundationSchema } from '../../src/features/economy-foundation/model';
import { projectContinuity } from '../../src/features/continuity/model';

const url = process.env.POMINS_FOUNDATION_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const migration = '20261026173537_economy_continuity_foundation.sql';
const oldMigrations = [
  '202610160001_foundation.sql',
  '202610210001_playable_room.sql',
  '20261022021139_baby_care.sql',
  '20261022134830_game_saves_compatibility.sql',
  '20261022191724_explicit_save_protagonist.sql',
  '20261022202113_save_manager.sql',
];
const a = randomUUID(),
  b = randomUUID(),
  credit = randomUUID(),
  babyCredit = randomUUID(),
  paused = randomUUID();
let pool: Pool,
  saveA: string,
  saveB: string,
  babySave: string,
  adultA: string,
  adultB: string,
  baby: string;
let oldTables: string[], before: unknown, functions: unknown, permissions: unknown;
async function acting<T>(uid: string, run: (client: PoolClient) => Promise<T>) {
  const c = await pool.connect();
  await c.query('begin;set local role authenticated');
  try {
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    const data = await run(c);
    await c.query('commit');
    return data;
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    c.release();
  }
}
async function rpc(uid: string, name: string, args: unknown[] = []) {
  return (
    await acting(uid, (c) =>
      c.query(
        `select to_jsonb(public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')})) data`,
        args,
      ),
    )
  ).rows[0].data;
}
async function snapshot(tables = oldTables) {
  const data: Record<string, unknown> = {};
  for (const t of tables)
    data[t] = (
      await pool.query(`select to_jsonb(t) data from public.${t} t order by to_jsonb(t)::text`)
    ).rows;
  return data;
}
async function spendState() {
  return (
    await pool.query(`select (select coalesce(jsonb_agg(to_jsonb(c) order by session_id),'[]') from public.focus_credits c) credits,
 (select jsonb_agg(jsonb_build_array(id,world_revision) order by id) from public.game_saves) worlds,
 (select jsonb_agg(jsonb_build_array(id,focus_revision,account_xp) order by id) from public.profiles) profiles`)
  ).rows[0];
}
async function purchase(uid = a, char = baby, save = babySave, request = randomUUID()) {
  return (
    await pool.query(
      `insert into public.economy_purchase_requests(user_id,request_id,request_payload,kind,offer_id,offer_version,price_minutes,save_id,character_id)
 values($1,$2,'{}','care','baby_feed',1,2,$3,$4) returning id`,
      [uid, request, save, char],
    )
  ).rows[0].id as string;
}
suite('6D-A native PostgreSQL foundation, isolated and inactive', () => {
  it('C1 counts a real server completion at the daily XP cap and replay cannot duplicate rewards/events', async () => {
    const c = await pool.connect();
    await c.query('begin');
    try {
      const uid = randomUUID(),
        id = randomUUID(),
        client = randomUUID();
      await c.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
        uid,
        JSON.stringify({ nickname: 'cap_' + uid.slice(0, 8) }),
      ]);
      await c.query('set local role authenticated');
      await c.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
      const save = (await c.query('select public.get_game_context() data')).rows[0].data.save.id;
      const character = (
        await c.query("select public.room_command_for_save($1,'create',$2) data", [
          save,
          JSON.stringify({ name: 'Teste', appearance: defaultAdultAppearance }),
        ])
      ).rows[0].data.residents[0].id;
      await c.query('reset role');
      for (let i = 0; i < 2; i++) {
        const previous = randomUUID();
        await c.query(
          "insert into public.focus_sessions(id,user_id,character_id,client_id,status,planned_seconds,validated_ms,ended_at) values($1,$2,$3,$4,'completed',7200,7200000,clock_timestamp()-interval '1 day')",
          [previous, uid, character, randomUUID()],
        );
        await c.query(
          'insert into public.focus_rewards(session_id,user_id,life_xp,account_xp,coins,energy,rewarded_minutes) values($1,$2,1200,1200,240,120,120)',
          [previous, uid],
        );
      }
      await c.query(
        "insert into public.focus_sessions(id,user_id,character_id,origin_save_id,client_id,status,planned_seconds,validated_ms) values($1,$2,$3,$4,$5,'active',120,120000)",
        [id, uid, character, save, client],
      );
      await c.query('set local role authenticated');
      const complete = async () =>
        (
          await c.query("select to_jsonb(public.focus_command('complete',$1,$2,1)) data", [
            id,
            client,
          ])
        ).rows[0].data;
      const first = await complete(),
        repeated = await complete();
      expect(first.status).toBe('completed');
      expect(first.reward_xp).toBe(0);
      expect(repeated).toEqual(first);
      const state = (await c.query('select public.get_economy_foundation() data')).rows[0].data;
      expect(state.last_valid_focus.session_id).toBe(id);
      expect(projectContinuity(state).next_milestone?.hours).toBe(72);
      expect(
        (await c.query('select count(*)::int n from public.focus_events where session_id=$1', [id]))
          .rows[0].n,
      ).toBe(1);
      expect(
        (
          await c.query('select count(*)::int n from public.focus_rewards where session_id=$1', [
            id,
          ])
        ).rows[0].n,
      ).toBe(1);
      expect(
        (
          await c.query('select count(*)::int n from public.continuity_events where user_id=$1', [
            uid,
          ])
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await c.query('rollback');
      c.release();
    }
  });
  it.each(['active', 'paused', 'interrupted', 'cancelled', 'expired', 'completed'])(
    'C1 ignores newer %s/incomplete focus and preserves the ledger on repeated reads',
    async (status) => {
      const c = await pool.connect();
      await c.query('begin');
      try {
        const uid = randomUUID(),
          session = randomUUID();
        await c.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
          uid,
          JSON.stringify({ nickname: 'c1_' + uid.slice(0, 8) }),
        ]);
        await c.query('set local role authenticated');
        await c.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
        const save = (await c.query('select public.get_game_context() data')).rows[0].data.save.id;
        const character = (
          await c.query("select public.room_command_for_save($1,'create',$2) data", [
            save,
            JSON.stringify({ name: 'Teste', appearance: defaultAdultAppearance }),
          ])
        ).rows[0].data.residents[0].id;
        await c.query('reset role');
        await c.query(
          "insert into public.focus_sessions(id,user_id,character_id,client_id,status,planned_seconds,validated_ms,ended_at) values($1,$2,$3,$4,'completed',120,120000,clock_timestamp()-interval '4 days')",
          [session, uid, character, randomUUID()],
        );
        await c.query(
          "insert into public.focus_sessions(id,user_id,character_id,client_id,status,planned_seconds,validated_ms,ended_at) values($1,$2,$3,$4,$5,120,60000,clock_timestamp()-interval '1 day')",
          [randomUUID(), uid, character, randomUUID(), status],
        );
        const ledger = async () =>
          (
            await c.query(
              'select to_jsonb(s) data from public.focus_sessions s where user_id=$1 order by id',
              [uid],
            )
          ).rows;
        const before = await ledger();
        await c.query('set local role authenticated');
        await c.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
        for (let i = 0; i < 2; i++) {
          const state = (await c.query('select public.get_economy_foundation() data')).rows[0].data;
          expect(state.last_valid_focus.session_id).toBe(session);
          const dto = projectContinuity(state);
          expect(dto.next_milestone?.hours).toBe(168);
          expect(dto.penalties_active).toBe(false);
        }
        expect(await ledger()).toEqual(before);
        await c.query("select set_config('request.jwt.claim.sub',$1,true)", [b]);
        expect(
          (await c.query('select public.get_economy_foundation() data')).rows[0].data
            .last_valid_focus?.session_id,
        ).not.toBe(session);
      } finally {
        await c.query('rollback');
        c.release();
      }
    },
  );
  beforeAll(async () => {
    if (!url) throw Error('Dedicated database required');
    const target = new URL(url);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/pomins_foundation_test'
    )
      throw Error('Only an empty loopback pomins_foundation_test database is allowed.');
    pool = new Pool({ connectionString: url, max: 5 });
    if (
      (
        await pool.query(
          "select count(*)::integer n from pg_tables where schemaname not in ('pg_catalog','information_schema')",
        )
      ).rows[0].n !== 0
    )
      throw Error('Refusing a nonempty database; no reset is performed.');
    await pool.query(
      `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
    );
    for (const name of oldMigrations)
      await pool.query(readFileSync('supabase/migrations/' + name, 'utf8'));
    for (const [uid, name] of [
      [a, 'foundation_a'],
      [b, 'foundation_b'],
    ])
      await pool.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
        uid,
        JSON.stringify({ nickname: name }),
      ]);
    saveA = (await rpc(a, 'get_game_context')).save.id;
    saveB = (await rpc(b, 'get_game_context')).save.id;
    adultA = (
      await rpc(a, 'room_command_for_save', [
        saveA,
        'create',
        JSON.stringify({ name: 'Adulto A', appearance: defaultAdultAppearance }),
      ])
    ).residents[0].id;
    adultB = (
      await rpc(b, 'room_command_for_save', [
        saveB,
        'create',
        JSON.stringify({ name: 'Adulto B', appearance: defaultAdultAppearance }),
      ])
    ).residents[0].id;
    babySave = (await rpc(a, 'create_game_save', [randomUUID(), 'Primeira infância'])).id;
    baby = (
      await rpc(a, 'create_character_for_save', [
        babySave,
        'Aurora',
        JSON.stringify(defaultAppearance),
      ])
    ).id;
    await rpc(a, 'read_birth_for_save', [babySave, baby, 'sky']);
    for (const [id, char, save] of [
      [credit, adultA, saveA],
      [babyCredit, baby, babySave],
    ])
      await pool.query(
        `insert into public.focus_sessions(id,user_id,character_id,origin_save_id,status,planned_seconds,validated_ms,client_id,created_at,last_seen_at,ended_at)
   values($1,$2,$3,$4,'completed',120,120000,$5,clock_timestamp()-interval '45 days',clock_timestamp()-interval '45 days',clock_timestamp()-interval '45 days')`,
        [id, a, char, save, randomUUID()],
      );
    await pool.query(
      `insert into public.focus_sessions(id,user_id,character_id,origin_save_id,status,planned_seconds,validated_ms,client_id) values($1,$2,$3,$4,'paused',120,60000,$5)`,
      [paused, a, adultA, saveA, randomUUID()],
    );
    await rpc(a, 'baby_care_for_save', [
      babySave,
      JSON.stringify({
        requestId: randomUUID(),
        characterId: baby,
        activity: 'baby_cuddle',
        lines: [{ sessionId: babyCredit, minutes: 1 }],
      }),
    ]);
    oldTables = (
      await pool.query(
        "select tablename from pg_tables where schemaname='public' order by tablename",
      )
    ).rows.map((r) => r.tablename);
    functions = (
      await pool.query(
        "select p.oid,pg_get_functiondef(p.oid) body from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','game_private') order by p.oid",
      )
    ).rows;
    permissions = (
      await pool.query(
        "select table_name,column_name,privilege_type,grantee from information_schema.column_privileges where table_schema='public' order by 1,2,3,4",
      )
    ).rows;
    before = await snapshot();
    await pool.query(readFileSync('supabase/migrations/' + migration, 'utf8'));
  }, 60000);
  afterAll(async () => {
    await pool?.end();
  });

  it('preserves every historical row, original function definition and existing grants', async () => {
    expect(await snapshot()).toEqual(before);
    for (const f of functions as { oid: number; body: string }[])
      expect(
        (await pool.query('select pg_get_functiondef($1::oid) body', [f.oid])).rows[0].body,
      ).toBe(f.body);
    const actual = (
      await pool.query(
        "select table_name,column_name,privilege_type,grantee from information_schema.column_privileges where table_schema='public' and table_name=any($1::text[]) order by 1,2,3,4",
        [oldTables],
      )
    ).rows;
    expect(actual).toEqual(permissions);
  });
  it('starts with no activated account, save, cycle, penalty, purchase or inventory grant', async () => {
    const state = foundationSchema.parse(await rpc(a, 'get_economy_foundation'));
    expect(state.active).toBe(false);
    expect(state.activation_at).toBeNull();
    const latest = (
      await pool.query(
        "select id,ended_at from public.focus_sessions where user_id=$1 and status='completed' order by ended_at desc,id desc limit 1",
        [a],
      )
    ).rows[0];
    expect(state.last_valid_focus?.session_id).toBe(latest.id);
    const observation = (
      await pool.query('select * from public.account_continuity where user_id=$1', [a])
    ).rows[0];
    expect(observation.last_valid_session_id).toBe(latest.id);
    expect(observation.last_valid_completed_at).toEqual(latest.ended_at);
    expect(observation.activation_at).toBeNull();
    expect(state.available_minutes).toBe(3);
    expect(state.care_offers).toHaveLength(6);
    expect(state.care_offers.every((o) => o.price_minutes === 2 && !o.enabled)).toBe(true);
    for (const table of [
      'inactivity_cycles',
      'continuity_events',
      'character_memorials',
      'economy_purchase_requests',
      'account_inventory',
    ])
      expect((await pool.query(`select count(*)::integer n from public.${table}`)).rows[0].n).toBe(
        0,
      );
    expect(
      (
        await pool.query(
          'select count(*)::integer n from public.cosmetic_catalog where available_by_default',
        )
      ).rows[0].n,
    ).toBe(12);
  });
  it('exposes only owned observations and denies client writes even for the owner', async () => {
    expect(
      (
        await acting(b, (c) =>
          c.query('select * from public.account_continuity where user_id=$1', [a]),
        )
      ).rows,
    ).toEqual([]);
    expect(
      (await acting(a, (c) => c.query('select * from public.save_continuity'))).rows,
    ).toHaveLength(2);
    await expect(
      acting(a, (c) =>
        c.query('update public.account_continuity set revision=revision+1 where user_id=$1', [a]),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      acting(a, (c) =>
        c.query(
          "insert into public.economy_purchase_requests(user_id,request_id,request_payload,kind,offer_id,offer_version,price_minutes,save_id,character_id) values($1,$2,'{}','care','baby_feed',1,2,$3,$4)",
          [a, randomUUID(), babySave, baby],
        ),
      ),
    ).rejects.toMatchObject({ code: '42501' });
    const c = await pool.connect();
    try {
      await c.query('set role anon');
      await expect(c.query('select public.get_economy_foundation()')).rejects.toMatchObject({
        code: '42501',
      });
    } finally {
      await c.query('reset role');
      c.release();
    }
  });
  it('cannot activate launch, offers, penalties, closures or owned items in the foundation schema', async () => {
    await expect(
      pool.query('update game_private.economy_release set activation_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query('update public.account_continuity set activation_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        "update public.save_continuity set lifecycle='closed',closed_at=clock_timestamp(),closure_reason='inactivity'",
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query('update public.economy_offer_versions set enabled_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query('update public.economy_rule_versions set mandatory=false'),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('previews exact boundaries without writing effects or relying on a client clock', async () => {
    for (const [n, state] of [
      [259199.999, 'normal'],
      [259200, 'warning'],
      [604799.999, 'warning'],
      [604800, 'regression_due'],
      [2591999.999, 'regression_due'],
      [2592000, 'closure_due'],
    ])
      expect(
        (await pool.query('select game_private.preview_inactivity($1) state', [n])).rows[0].state,
      ).toBe(state);
    await expect(pool.query('select game_private.preview_inactivity(-1)')).rejects.toThrow();
    expect((await rpc(a, 'get_economy_foundation')).active).toBe(false);
  });
  it('rejects mismatched owner/save/character references and under-priced offers', async () => {
    await expect(purchase(a, adultB, saveA)).rejects.toMatchObject({ code: '23503' });
    await expect(purchase(b, baby, babySave)).rejects.toMatchObject({ code: '23503' });
    await expect(
      pool.query(
        `insert into public.economy_purchase_requests(user_id,request_id,request_payload,kind,offer_id,offer_version,price_minutes,save_id,character_id) values($1,$2,'{}','care','baby_feed',1,1,$3,$4)`,
        [a, randomUUID(), babySave, baby],
      ),
    ).rejects.toMatchObject({ code: '23503' });
  });
  it('serializes duplicate planned request IDs across independent PostgreSQL connections without reserving minutes', async () => {
    const before = await spendState(),
      request = randomUUID();
    const sql = `insert into public.economy_purchase_requests(user_id,request_id,request_payload,kind,offer_id,offer_version,price_minutes,save_id,character_id) values($1,$2,'{}','care','baby_feed',1,2,$3,$4) on conflict(user_id,request_id) do nothing returning id`;
    const results = await Promise.all([
      pool.query(sql, [a, request, babySave, baby]),
      pool.query(sql, [a, request, babySave, baby]),
    ]);
    expect(results.map((r) => r.rowCount).sort()).toEqual([0, 1]);
    expect(await spendState()).toEqual(before);
    await expect(purchase(a, baby, babySave, request)).rejects.toMatchObject({ code: '23505' });
  });
  it('validates planned funding totals, ownership and provenance without charging', async () => {
    const before = await spendState(),
      id = await purchase();
    await pool.query(
      'insert into public.economy_purchase_sources(purchase_id,user_id,line,session_id,minutes) values($1,$2,1,$3,2)',
      [id, a, credit],
    );
    await expect(
      pool.query(
        'insert into public.economy_purchase_sources(purchase_id,user_id,line,session_id,minutes) values($1,$2,2,$3,1)',
        [id, a, babyCredit],
      ),
    ).rejects.toThrow('Invalid planned funding');
    await expect(
      pool.query(
        'insert into public.economy_purchase_sources(purchase_id,user_id,line,session_id,minutes) values($1,$2,1,$3,1)',
        [id, b, credit],
      ),
    ).rejects.toThrow();
    expect(await spendState()).toEqual(before);
    await expect(
      pool.query(
        "update public.economy_purchase_requests set state='committed',committed_at=clock_timestamp() where id=$1",
        [id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('enforces funding limits under concurrent plans with the existing outer account lock', async () => {
    const before = await spendState(),
      id = await purchase();
    const results = await Promise.allSettled([
      pool.query('insert into public.economy_purchase_sources values($1,$2,1,$3,2,null)', [
        id,
        a,
        credit,
      ]),
      pool.query('insert into public.economy_purchase_sources values($1,$2,2,$3,2,null)', [
        id,
        a,
        babyCredit,
      ]),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (
        await pool.query(
          'select sum(minutes)::integer n from public.economy_purchase_sources where purchase_id=$1',
          [id],
        )
      ).rows[0].n,
    ).toBe(2);
    expect(await spendState()).toEqual(before);
  });
  it('deduplicates cycle events and prevents foreign or applied regression records', async () => {
    const cycle = (
      await pool.query(
        'insert into public.inactivity_cycles(user_id,rules_version,request_id) values($1,1,$2) returning id',
        [a, randomUUID()],
      )
    ).rows[0].id;
    await pool.query(
      "insert into public.continuity_events(user_id,cycle_id,kind,request_id) values($1,$2,'warning',$3)",
      [a, cycle, randomUUID()],
    );
    await expect(
      pool.query(
        "insert into public.continuity_events(user_id,cycle_id,kind,request_id) values($1,$2,'warning',$3)",
        [a, cycle, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        "insert into public.continuity_events(user_id,cycle_id,kind,request_id) values($1,$2,'warning',$3)",
        [b, cycle, randomUUID()],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      pool.query('update public.continuity_events set applied_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query('update public.inactivity_cycles set anchor_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('keeps the existing one-minute baby RPC and idempotent effects unchanged while prices are inactive', async () => {
    const before = (
      await pool.query('select allocated_minutes from public.focus_credits where session_id=$1', [
        babyCredit,
      ])
    ).rows[0].allocated_minutes;
    const command = JSON.stringify({
      requestId: randomUUID(),
      characterId: baby,
      activity: 'baby_feed',
      lines: [{ sessionId: babyCredit, minutes: 1 }],
    });
    const first = await rpc(a, 'baby_care_for_save', [babySave, command]);
    await rpc(a, 'baby_care_for_save', [babySave, command]);
    expect(
      (
        await pool.query('select allocated_minutes from public.focus_credits where session_id=$1', [
          babyCredit,
        ])
      ).rows[0].allocated_minutes,
    ).toBe(before + 1);
    expect(first.stats.needs.satiety).toBe(87);
  });
  it('keeps draft baselines and memorials isolated without closing or changing a character', async () => {
    const skills = { knowledge: 0, creativity: 0, sociability: 0, autonomy: 0, wellbeing: 0 };
    await pool.query(
      'insert into public.character_continuity_baselines(character_id,user_id,save_id,rules_version,skills) values($1,$2,$3,1,$4)',
      [baby, a, babySave, skills],
    );
    await expect(
      pool.query('update public.character_continuity_baselines set captured_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        'update public.character_continuity_baselines set save_id=$1 where character_id=$2',
        [saveA, baby],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      pool.query("update public.character_continuity_baselines set skills='{}'"),
    ).rejects.toMatchObject({ code: '23514' });
    const cycle = (
      await pool.query(
        'insert into public.inactivity_cycles(user_id,rules_version,request_id) values($1,1,$2) returning id',
        [a, randomUUID()],
      )
    ).rows[0].id;
    const event = (
      await pool.query(
        "insert into public.continuity_events(user_id,cycle_id,save_id,kind,request_id) values($1,$2,$3,'journey_closed',$4) returning id",
        [a, cycle, babySave, randomUUID()],
      )
    ).rows[0].id;
    const characterBefore = (
      await pool.query('select to_jsonb(c) data from public.characters c where id=$1', [baby])
    ).rows[0].data;
    await pool.query(
      "insert into public.character_memorials(character_id,user_id,save_id,closure_event_id,snapshot) values($1,$2,$3,$4,'{}')",
      [baby, a, babySave, event],
    );
    await expect(
      pool.query('update public.character_memorials set published_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      pool.query(
        "insert into public.character_memorials(character_id,user_id,save_id,closure_event_id,snapshot) values($1,$2,$3,$4,'{}')",
        [adultA, a, saveA, event],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    expect(
      (await pool.query('select to_jsonb(c) data from public.characters c where id=$1', [baby]))
        .rows[0].data,
    ).toEqual(characterBefore);
    expect(
      (
        await pool.query('select lifecycle from public.save_continuity where save_id=$1', [
          babySave,
        ])
      ).rows[0].lifecycle,
    ).toBe('open');
    for (const table of [
      'account_continuity',
      'save_continuity',
      'inactivity_cycles',
      'character_continuity_baselines',
      'continuity_events',
      'character_memorials',
      'economy_purchase_requests',
      'economy_purchase_sources',
      'account_inventory',
    ]) {
      expect(
        (await acting(b, (c) => c.query(`select * from public.${table} where user_id=$1`, [a])))
          .rows,
      ).toEqual([]);
      await expect(
        acting(a, (c) => c.query(`delete from public.${table} where user_id=$1`, [a])),
      ).rejects.toMatchObject({ code: '42501' });
    }
  });
  it('keeps funding identity immutable and rolls back an invalid multi-line draft atomically', async () => {
    const id = await purchase(),
      before = await spendState();
    const c = await pool.connect();
    try {
      await c.query('begin');
      await c.query('insert into public.economy_purchase_sources values($1,$2,1,$3,2,null)', [
        id,
        a,
        credit,
      ]);
      await expect(
        c.query('insert into public.economy_purchase_sources values($1,$2,2,$3,1,null)', [
          id,
          a,
          babyCredit,
        ]),
      ).rejects.toThrow('Invalid planned funding');
      await c.query('rollback');
    } finally {
      c.release();
    }
    expect(
      (await pool.query('select * from public.economy_purchase_sources where purchase_id=$1', [id]))
        .rows,
    ).toEqual([]);
    await pool.query('insert into public.economy_purchase_sources values($1,$2,1,$3,2,null)', [
      id,
      a,
      credit,
    ]);
    await expect(
      pool.query('update public.economy_purchase_sources set line=2 where purchase_id=$1', [id]),
    ).rejects.toThrow('Funding identity is immutable');
    await pool.query('update public.economy_purchase_sources set minutes=1 where purchase_id=$1', [
      id,
    ]);
    expect(await spendState()).toEqual(before);
  });
  it('leaves newly created accounts and journeys inactive without automatic observers', async () => {
    const uid = randomUUID();
    await pool.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
      uid,
      { nickname: 'foundation_new' },
    ]);
    const save = (await rpc(uid, 'create_game_save', [randomUUID(), 'Sem relógio ativo'])).id;
    const state = foundationSchema.parse(await rpc(uid, 'get_economy_foundation'));
    expect(state.active).toBe(false);
    expect(state.last_valid_focus).toBeNull();
    expect(state.available_minutes).toBe(0);
    expect(
      (await pool.query('select * from public.account_continuity where user_id=$1', [uid])).rows,
    ).toEqual([]);
    expect(
      (await pool.query('select * from public.save_continuity where save_id=$1', [save])).rows,
    ).toEqual([]);
    expect((await rpc(a, 'get_economy_foundation')).active).toBe(false);
  });
  it('preserves legacy focus start/pause/cancel and archive/restore contracts', async () => {
    const id = randomUUID(),
      client = randomUUID();
    expect(
      (await rpc(b, 'start_save_focus', [saveB, id, client, adultB, 120, 'fixture', 'fixture']))
        .status,
    ).toBe('active');
    expect((await rpc(b, 'focus_command', ['pause', id, client, 1])).status).toBe('paused');
    expect((await rpc(b, 'focus_command', ['cancel', id, client, 2])).status).toBe('cancelled');
    const save = (await rpc(b, 'load_game_save', [saveB])).context.save;
    const archived = await rpc(b, 'set_game_save_archived', [saveB, true, save.world_revision]);
    expect(archived.archived_at).not.toBeNull();
    expect(
      (await rpc(b, 'set_game_save_archived', [saveB, false, archived.world_revision])).archived_at,
    ).toBeNull();
  });
  it('reads future completions without changing historical dates, activating rules or trusting cached observations', async () => {
    const existing = (
      await pool.query('select ended_at from public.focus_sessions where id=$1', [credit])
    ).rows[0].ended_at;
    const id = randomUUID();
    await pool.query(
      `insert into public.focus_sessions(id,user_id,character_id,origin_save_id,status,planned_seconds,validated_ms,client_id,ended_at) values($1,$2,$3,$4,'completed',120,120000,$5,clock_timestamp())`,
      [id, b, adultB, saveB, randomUUID()],
    );
    const state = foundationSchema.parse(await rpc(b, 'get_economy_foundation'));
    expect(state.last_valid_focus?.session_id).toBe(id);
    expect(state.active).toBe(false);
    expect(
      (await pool.query('select ended_at from public.focus_sessions where id=$1', [credit])).rows[0]
        .ended_at,
    ).toEqual(existing);
    expect(
      (
        await pool.query(
          'select last_valid_session_id from public.account_continuity where user_id=$1',
          [b],
        )
      ).rows[0].last_valid_session_id,
    ).toBeNull();
  });
  it('keeps free RGB and legacy assets free and enforces unique owner inventory/provenance', async () => {
    await expect(
      pool.query(
        "update public.cosmetic_catalog set available_by_default=false where id='legacy.custom-colors'",
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await pool.query(
      "insert into public.cosmetic_catalog values('future.hat','accessory','not-yet-available',array['adult'],array['human'],false,false,'{}')",
    );
    await pool.query(
      "insert into public.economy_offer_versions(id,version,kind,cosmetic_id,cosmetic_free,price_minutes) values('hat',1,'cosmetic','future.hat',false,10)",
    );
    const id = (
      await pool.query(
        "insert into public.economy_purchase_requests(user_id,request_id,request_payload,kind,offer_id,offer_version,price_minutes,cosmetic_id) values($1,$2,'{}','cosmetic','hat',1,10,'future.hat') returning id",
        [a, randomUUID()],
      )
    ).rows[0].id;
    await pool.query(
      "insert into public.account_inventory(user_id,cosmetic_id,purchase_id) values($1,'future.hat',$2)",
      [a, id],
    );
    await expect(
      pool.query(
        "insert into public.account_inventory(user_id,cosmetic_id,purchase_id) values($1,'future.hat',$2)",
        [a, id],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await expect(
      pool.query(
        "insert into public.account_inventory(user_id,cosmetic_id,purchase_id) values($1,'future.hat',$2)",
        [b, id],
      ),
    ).rejects.toMatchObject({ code: '23503' });
    await expect(
      pool.query('update public.account_inventory set granted_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
    expect(
      (await acting(b, (c) => c.query('select * from public.account_inventory'))).rows,
    ).toEqual([]);
  });
});
