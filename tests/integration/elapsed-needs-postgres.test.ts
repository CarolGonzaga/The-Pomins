import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { defaultAppearance } from '../../src/features/character-creator/model';
import { babyStateSchema } from '../../src/features/baby-care/model';
const url = process.env.POMINS_NEEDS_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
const migration = '20261029195215_elapsed_time_baby_needs.sql';
let db: Pool, activation: string, old: unknown;
type User = { uid: string; save: string; baby: string };
let existing: User;
let beforeMigration: unknown;
async function ledgerSnapshot() {
  const result: Record<string, unknown> = {};
  for (const { tablename } of (
    await db.query("select tablename from pg_tables where schemaname='public' order by tablename")
  ).rows) {
    const name = '"' + tablename.replaceAll('"', '""') + '"';
    result[tablename] = (
      await db.query(
        `select to_jsonb(t)-'needs_settled_at' data from public.${name} t order by (to_jsonb(t)-'needs_settled_at')::text`,
      )
    ).rows;
  }
  return result;
}
async function rpc(u: User, name: string, args: unknown[] = [], client?: PoolClient, needsVersion: string | null = '2') {
  const c = client ?? (await db.connect());
  await c.query('begin;set local role authenticated');
  try {
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [u.uid]);
    await c.query("select set_config('request.headers',$1,true)", [JSON.stringify(needsVersion ? { 'x-pomins-needs-version':needsVersion } : {})]);
    const data = (
      await c.query(
        `select to_jsonb(public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')})) data`,
        args,
      )
    ).rows[0].data;
    await c.query('commit');
    return data;
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    if (!client) c.release();
  }
}
async function user(minutes = 20): Promise<User> {
  const uid = randomUUID(),
    u = { uid, save: '', baby: '' };
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
    uid,
    { nickname: 'needs_' + uid.replaceAll('-', '').slice(0, 16) },
  ]);
  u.save = (await rpc(u, 'get_game_context')).save.id;
  u.baby = (
    await rpc(u, 'create_character_for_save', [u.save, 'Lumi', JSON.stringify(defaultAppearance)])
  ).id;
  await db.query(
    "insert into public.focus_sessions(id,user_id,character_id,origin_save_id,client_id,status,planned_seconds,validated_ms,ended_at) values($1,$2,$3,$4,$5,'completed',$6,$7,clock_timestamp())",
    [randomUUID(), uid, u.baby, u.save, randomUUID(), minutes * 60, minutes * 60000],
  );
  return u;
}
const buy = (u: User, requestId = randomUUID(), activity = 'baby_feed') =>
  rpc(u, 'purchase_baby_care', [
    u.save,
    JSON.stringify({ requestId, characterId: u.baby, activity }),
  ]);
const balance = async (u: User) =>
  Number(
    (
      await db.query(
        'select sum(eligible_minutes-allocated_minutes) n from public.focus_credits where user_id=$1',
        [u.uid],
      )
    ).rows[0].n,
  );
const stored = async (u: User) =>
  (
    await db.query(
      "select to_jsonb(c)-'needs_settled_at' data from public.characters c where id=$1",
      [u.baby],
    )
  ).rows[0].data;
const project = async (u: User, at: string) =>
  (
    await db.query(
      'select game_private.project_baby_needs(c,$2) data from public.characters c where id=$1',
      [u.baby, at],
    )
  ).rows[0].data;
suite('6F native PostgreSQL needs: projection, atomic settlement, isolation', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['localhost', '127.0.0.1'].includes(target.hostname) ||
      target.pathname !== '/pomins_needs_test'
    )
      throw Error('Only disposable loopback pomins_needs_test allowed');
    db = new Pool({ connectionString: url, max: 6 });
    if (
      Number(
        (await db.query("select count(*) n from pg_tables where schemaname='public'")).rows[0].n,
      )
    )
      throw Error('Refusing nonempty database');
    await db.query(
      "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;",
    );
    for (const f of readdirSync('supabase/migrations')
      .filter((f) => f.endsWith('.sql') && f !== migration)
      .sort())
      await db.query(readFileSync('supabase/migrations/' + f, 'utf8'));
    existing = await user();
    old = await stored(existing);
    const historical = await user(4);
    await buy(historical, randomUUID(), 'baby_cuddle');
    beforeMigration = await ledgerSnapshot();
    await db.query(readFileSync('supabase/migrations/' + migration, 'utf8'));
  });
  afterAll(async () => {
    await db?.end();
  });
  it('preserves the pre-migration character, credits and histories and starts inactive', async () => {
    expect(await stored(existing)).toEqual(old);
    expect(await ledgerSnapshot()).toEqual(beforeMigration);
    expect(await balance(existing)).toBe(20);
    const state = await rpc(existing, 'baby_state_for_save', [existing.save, existing.baby]);
    expect(state.needs_clock.active).toBe(false);
    expect(state.stats.needs.satiety).toBe(75);
    expect(babyStateSchema.parse(JSON.parse(JSON.stringify(state))).stats.needs.satiety).toBe(75);
    expect((await db.query('select count(*)::int n from public.continuity_events')).rows[0].n).toBe(
      0,
    );
  });
  it('serializes activation with an in-flight old-client purchase and rolls both test transactions back', async () => {
    const u=await user(4), before=await ledgerSnapshot(), buyer=await db.connect(), activator=await db.connect();
    try {
      await buyer.query('begin;set local role authenticated');
      await buyer.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.headers','{}',true)",[u.uid]);
      await buyer.query('select public.purchase_baby_care($1,$2)',[u.save,JSON.stringify({requestId:randomUUID(),characterId:u.baby,activity:'baby_feed'})]);
      await activator.query("begin;set local lock_timeout='100ms'");
      await expect(activator.query('update game_private.baby_need_release set activation_at=clock_timestamp()')).rejects.toMatchObject({code:'55P03'});
    } finally {
      await activator.query('rollback');await buyer.query('rollback');activator.release();buyer.release();
    }
    expect(await ledgerSnapshot()).toEqual(before);
  });
  it('activates only in the local fixture with a server timestamp and no retrospective loss', async () => {
    await db.query('begin');
    activation = (await db.query('select clock_timestamp() at')).rows[0].at.toISOString();
    await db.query(
      'update game_private.baby_need_rule_versions set effective_at=$1 where version=1',
      [activation],
    );
    await db.query('update game_private.baby_need_release set activation_at=$1', [activation]);
    await db.query('commit');
    const state = await project(existing, activation);
    expect(state.needs).toEqual((old as { needs: unknown }).needs);
    expect(state.clock.active).toBe(true);
    expect(await balance(existing)).toBe(20);
  });
  it.each([2, 8, 12, 24, 48, 168])(
    'projects %s hours, including offline, with no writes',
    async (hours) => {
      const before = await stored(existing),
        result = await project(
          existing,
          new Date(Date.parse(activation) + hours * 3600000).toISOString(),
        );
      for (const [key, rate] of Object.entries({
        satiety: 2.5,
        hygiene: 1.5,
        energy: 1.8,
        affection: 1.3,
        fun: 2,
      }))
        expect(result.needs[key]).toBeCloseTo(Math.max(0, 75 - rate * hours), 10);
      expect(await stored(existing)).toEqual(before);
      expect(await balance(existing)).toBe(20);
    },
  );
  it('uses birth as an extra floor and ignores prior days on new babies', async () => {
    const u = await user();
    const birth = (
      await db.query('select born_at from public.characters where id=$1', [u.baby])
    ).rows[0].born_at.toISOString();
    expect((await project(u, birth)).needs.satiety).toBe(75);
  });
  it('uses instants rather than the caller timezone', async () => {
    const time = Date.parse(activation) + 8 * 3600000;
    const utc = new Date(time).toISOString();
    const offset = new Date(time - 3 * 3600000).toISOString().replace('Z', '-03:00');
    expect((await project(existing, offset)).needs).toEqual((await project(existing, utc)).needs);
  });
  it('caps care at 100 while preserving fractional values elsewhere', async () => {
    const u = await user();
    await db.query(
      "update public.characters set needs=jsonb_set(needs,'{satiety}','98') where id=$1",
      [u.baby],
    );
    await buy(u);
    expect(
      (await db.query('select needs from public.characters where id=$1', [u.baby])).rows[0].needs
        .satiety,
    ).toBe(100);
  });
  it('supports version changes piecewise rather than applying new rates retroactively', async () => {
    const effective = new Date(Date.parse(activation) + 12 * 3600000).toISOString();
    await db.query(
      'insert into game_private.baby_need_rule_versions(version,rates_per_hour,effective_at) values(2,$1,$2)',
      [{ satiety: 1, hygiene: 1, energy: 1, affection: 1, fun: 1 }, effective],
    );
    const result = await project(
      existing,
      new Date(Date.parse(activation) + 14 * 3600000).toISOString(),
    );
    expect(result.needs.satiety).toBeCloseTo(43, 10);
    expect(result.clock.version).toBe(2);
  });
  it('reads the same baseline repeatedly without cumulative rounding and keeps read APIs projected', async () => {
    const first = await rpc(existing, 'baby_state_for_save', [existing.save, existing.baby]);
    const second = await rpc(existing, 'baby_state', [existing.baby]);
    expect(Math.abs(first.stats.needs.satiety - second.stats.needs.satiety)).toBeLessThan(0.01);
    expect(await stored(existing)).toEqual(old);
    expect(babyStateSchema.parse(JSON.parse(JSON.stringify(first))).stats.needs).toEqual(first.stats.needs);
  });
  it('blocks old deployment contracts and legacy aliases before any debit when decay is active', async () => {
    const u=await user(8), before=await ledgerSnapshot();
    for(const protocol of [null,'1','3']) {
      const payload=JSON.stringify({ requestId:randomUUID(),characterId:u.baby,activity:'baby_feed' });
      await expect(rpc(u,'purchase_baby_care',[u.save,payload],undefined,protocol)).rejects.toThrow('NEEDS_CLIENT_UPDATE_REQUIRED');
      await expect(rpc(u,'baby_care_for_save',[u.save,payload],undefined,protocol)).rejects.toThrow('NEEDS_CLIENT_UPDATE_REQUIRED');
      await expect(rpc(u,'baby_care',[payload],undefined,protocol)).rejects.toThrow('NEEDS_CLIENT_UPDATE_REQUIRED');
      await expect(rpc(u,'baby_state',[u.baby],undefined,protocol)).rejects.toThrow('NEEDS_CLIENT_UPDATE_REQUIRED');
    }
    expect(await ledgerSnapshot()).toEqual(before);
  });
  it.each(['baby_feed', 'baby_bath', 'baby_diaper', 'baby_play', 'baby_cuddle', 'baby_sleep'])(
    'settles and applies %s at exactly two minutes',
    async (activity) => {
      const u = await user(4),
        result = await buy(u, randomUUID(), activity);
      expect(result.receipt.chargedMinutes).toBe(2);
      expect(await balance(u)).toBe(2);
      expect(result.stats.progress_minutes).toBe(2);
      expect(babyStateSchema.parse(result).receipt?.chargedMinutes).toBe(2);
      expect(result.needs_clock.active).toBe(true);
      expect(
        (await db.query('select needs_settled_at from public.characters where id=$1', [u.baby]))
          .rows[0].needs_settled_at,
      ).not.toBeNull();
      const effects = {
        baby_feed: ['satiety', 24],
        baby_bath: ['hygiene', 20],
        baby_diaper: ['hygiene', 24],
        baby_play: ['fun', 24],
        baby_cuddle: ['affection', 24],
        baby_sleep: ['energy', 24],
      }[activity]!;
      expect(result.stats.needs[effects[0]]).toBeCloseTo(75 + Number(effects[1]), 1);
    },
  );
  it('retains fractional deficits across consecutive settlements', async () => {
    const u = await user();
    await db.query(
      "update public.characters set needs=jsonb_set(needs,'{hygiene}','60.123456789') where id=$1",
      [u.baby],
    );
    await buy(u);
    await buy(u);
    const c = (await db.query('select needs from public.characters where id=$1', [u.baby])).rows[0];
    expect(c.needs.hygiene).toBeGreaterThan(60.11);
    expect(c.needs.hygiene).toBeLessThan(60.123456789);
  });
  it('settles eight hours before a paid effect in the same transaction using server time', async () => {
    const u = await user(),
      c = await db.connect();
    await c.query('begin');
    try {
      // Local-only historical clock fixture; rollback also restores trigger definitions/config.
      // Production RPCs have no timestamp parameter and no way to change this release.
      await c.query(
        'alter table game_private.baby_need_release disable trigger baby_need_activation_immutable;alter table game_private.baby_need_rule_versions disable trigger baby_need_rules_immutable',
      );
      const past = (await c.query("select clock_timestamp()-interval '8 hours' as time_value"))
        .rows[0].time_value;
      await c.query('update game_private.baby_need_release set activation_at=$1', [past]);
      await c.query(
        'update game_private.baby_need_rule_versions set effective_at=$1 where version=1',
        [past],
      );
      await c.query('update public.characters set born_at=$1,needs_settled_at=$1 where id=$2', [
        past,
        u.baby,
      ]);
      await c.query('set local role authenticated');
      await c.query("select set_config('request.jwt.claim.sub',$1,true)", [u.uid]);
      await c.query("select set_config('request.headers',$1,true)", [JSON.stringify({ 'x-pomins-needs-version':'2' })]);
      const state = (
        await c.query('select public.purchase_baby_care($1,$2) data', [
          u.save,
          JSON.stringify({ requestId: randomUUID(), characterId: u.baby, activity: 'baby_feed' }),
        ])
      ).rows[0].data;
      expect(state.stats.needs.satiety).toBeCloseTo(79, 2);
      expect(state.stats.needs.hygiene).toBeCloseTo(63, 2);
      expect(state.receipt.chargedMinutes).toBe(2);
      expect(state.stats.progress_minutes).toBe(2);
    } finally {
      await c.query('rollback');
      c.release();
    }
    expect(await balance(u)).toBe(20);
  });
  it('deduplicates simultaneous retries and serializes two different paid cares', async () => {
    const u = await user(8),
      id = randomUUID();
    const [a, b] = await Promise.all([buy(u, id), buy(u, id)]);
    expect(a.receipt.purchaseId).toBe(b.receipt.purchaseId);
    expect(await balance(u)).toBe(6);
    const stamp = (
      await db.query('select needs_settled_at from public.characters where id=$1', [u.baby])
    ).rows[0].needs_settled_at;
    await buy(u, id);
    expect(
      (await db.query('select needs_settled_at from public.characters where id=$1', [u.baby]))
        .rows[0].needs_settled_at,
    ).toEqual(stamp);
    await Promise.all([buy(u), buy(u)]);
    expect(await balance(u)).toBe(2);
    expect((await rpc(u, 'baby_state_for_save', [u.save, u.baby])).stats.progress_minutes).toBe(6);
  });
  it('one remaining price cannot be consumed by concurrent different requests', async () => {
    const u = await user(2),
      r = await Promise.allSettled([buy(u), buy(u)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await balance(u)).toBe(0);
  });
  it('rolls back debit, settlement, and history if a late trigger fails', async () => {
    const u = await user(),
      before = await stored(u);
    await db.query(
      `create function public.test_fail_need_care() returns trigger language plpgsql as $$begin if new.user_id='${u.uid}'::uuid then raise exception 'Injected test failure';end if;return new;end$$;create trigger test_fail_need_care before insert on public.game_events for each row execute function public.test_fail_need_care();`,
    );
    await expect(buy(u)).rejects.toThrow();
    expect(await balance(u)).toBe(20);
    expect(await stored(u)).toEqual(before);
    await db.query(
      'drop trigger test_fail_need_care on public.game_events;drop function public.test_fail_need_care()',
    );
  });
  it('rejects cross-account/save reads, writes, client timestamps and access to rules', async () => {
    const a = await user(),
      b = await user();
    await expect(rpc(a, 'baby_state_for_save', [b.save, b.baby])).rejects.toThrow();
    await expect(
      rpc(a, 'purchase_baby_care', [
        a.save,
        JSON.stringify({ requestId: randomUUID(), characterId: b.baby, activity: 'baby_feed' }),
      ]),
    ).rejects.toThrow();
    await expect(
      rpc(a, 'purchase_baby_care', [
        a.save,
        JSON.stringify({
          requestId: randomUUID(),
          characterId: a.baby,
          activity: 'baby_feed',
          timestamp: '2099-01-01',
        }),
      ]),
    ).rejects.toThrow();
    const c = await db.connect();
    try {
      await c.query('begin;set local role authenticated');
      await expect(c.query('select * from game_private.baby_need_release')).rejects.toThrow();
    } finally {
      await c.query('rollback');
      c.release();
    }
    expect(await balance(a)).toBe(20);
    expect(await balance(b)).toBe(20);
  });
  it('keeps two baby saves independent while sharing the same account balance', async () => {
    const first = await user(8);
    const save = (await rpc(first, 'create_game_save', [randomUUID(), 'Outra história'])).id;
    const baby = (
      await rpc(first, 'create_character_for_save', [
        save,
        'Nina',
        JSON.stringify(defaultAppearance),
      ])
    ).id;
    const second = { ...first, save, baby };
    await db.query(
      "update public.characters set needs=jsonb_set(needs,'{satiety}','25') where id=$1",
      [baby],
    );
    const before = await stored(first);
    await expect(rpc(first, 'baby_state_for_save', [first.save, baby])).rejects.toThrow();
    await expect(
      rpc(first, 'purchase_baby_care', [
        first.save,
        JSON.stringify({ requestId: randomUUID(), characterId: baby, activity: 'baby_feed' }),
      ]),
    ).rejects.toThrow();
    const result = await buy(second);
    expect(result.stats.needs.satiety).toBeCloseTo(49, 1);
    expect(await balance(first)).toBe(6);
    expect(await balance(second)).toBe(6);
    expect(await stored(first)).toEqual(before);
  });
  it('preserves the real focus executor and keeps continuity inactive with need decay enabled', async () => {
    const u = await user(),
      id = randomUUID(),
      client = randomUUID();
    const before = (
      await db.query('select needs,needs_settled_at from public.characters where id=$1', [u.baby])
    ).rows[0];
    await db.query(
      "insert into public.focus_sessions(id,user_id,character_id,origin_save_id,client_id,status,planned_seconds,validated_ms) values($1,$2,$3,$4,$5,'active',120,120000)",
      [id, u.uid, u.baby, u.save, client],
    );
    const result = await rpc(u, 'focus_command', ['complete', id, client, 1]);
    expect(result.status).toBe('completed');
    expect(await balance(u)).toBe(22);
    expect(
      (await db.query('select needs,needs_settled_at from public.characters where id=$1', [u.baby]))
        .rows[0],
    ).toEqual(before);
    const economy = await rpc(u, 'get_economy_foundation');
    expect(economy.active).toBe(false);
    expect(economy.last_valid_focus.session_id).toBe(id);
  });
  it('locks published versions and activation against edits, without enabling continuity', async () => {
    await expect(
      db.query(
        "update game_private.baby_need_rule_versions set rates_per_hour='{}' where version=1",
      ),
    ).rejects.toThrow();
    await expect(
      db.query('update game_private.baby_need_release set activation_at=null'),
    ).rejects.toThrow();
    expect((await rpc(existing, 'get_economy_foundation')).active).toBe(false);
  });
});
