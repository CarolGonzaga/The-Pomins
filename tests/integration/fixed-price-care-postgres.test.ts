import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defaultAppearance } from '../../src/features/character-creator/model';
import { defaultAdultAppearance } from '../../src/features/room/domain';
const url = process.env.POMINS_PAID_CARE_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
let db: Pool;
const migrations = [
  '202610160001_foundation.sql',
  '202610210001_playable_room.sql',
  '20261022021139_baby_care.sql',
  '20261022134830_game_saves_compatibility.sql',
  '20261022191724_explicit_save_protagonist.sql',
  '20261022202113_save_manager.sql',
  '20261026173537_economy_continuity_foundation.sql',
];
async function rpc(uid: string, name: string, args: unknown[] = [], client?: PoolClient) {
  const c = client ?? (await db.connect());
  await c.query('begin;set local role authenticated');
  try {
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [uid]);
    const r = await c.query(
      `select to_jsonb(public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')})) data`,
      args,
    );
    await c.query('commit');
    return r.rows[0].data;
  } catch (e) {
    await c.query('rollback');
    throw e;
  } finally {
    if (!client) c.release();
  }
}
async function user(minutes = 2) {
  const uid = randomUUID();
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
    uid,
    { nickname: 'paid_' + uid.replaceAll('-', '').slice(0, 16) },
  ]);
  const save = (await rpc(uid, 'get_game_context')).save.id;
  const baby = (
    await rpc(uid, 'create_character_for_save', [save, 'Lumi', JSON.stringify(defaultAppearance)])
  ).id;
  const sessions: string[] = [];
  for (let n = 0; n < minutes; n += 2) {
    const id = randomUUID();
    sessions.push(id);
    await db.query(
      "insert into public.focus_sessions(id,user_id,character_id,origin_save_id,status,planned_seconds,validated_ms,client_id,ended_at) values($1,$2,$3,$4,'completed',120,120000,$5,clock_timestamp())",
      [id, uid, baby, save, randomUUID()],
    );
  }
  return { uid, save, baby, sessions };
}
type User = Awaited<ReturnType<typeof user>>;
const intent = (u: User, activity = 'baby_feed', requestId = randomUUID()) => ({
  requestId,
  characterId: u.baby,
  activity,
});
const buy = (u: User, input = intent(u)) =>
  rpc(u.uid, 'purchase_baby_care', [u.save, JSON.stringify(input)]);
async function balance(u: User) {
  return Number(
    (
      await db.query(
        'select coalesce(sum(eligible_minutes-allocated_minutes),0) n from public.focus_credits where user_id=$1',
        [u.uid],
      )
    ).rows[0].n,
  );
}
async function ownedSnapshot(u: User) {
  const result = {};
  for (const t of [
    'characters',
    'focus_credits',
    'focus_allocations',
    'game_events',
    'allocation_requests',
    'economy_purchase_requests',
    'economy_purchase_sources',
  ]) {
    Object.assign(result, {
      [t]: (
        await db.query(
          `select to_jsonb(t) data from public.${t} t where user_id=$1 order by to_jsonb(t)::text`,
          [u.uid],
        )
      ).rows,
    });
  }
  return result;
}
async function leaveOneMinutePerCredit(u: User) {
  const adult = (
    await rpc(u.uid, 'room_command_for_save', [
      u.save,
      'create',
      JSON.stringify({ name: 'Íris', appearance: defaultAdultAppearance }),
    ])
  ).residents[0].id;
  await rpc(u.uid, 'room_command_for_save', [
    u.save,
    'allocate',
    JSON.stringify({
      requestId: randomUUID(),
      lines: u.sessions.map((sessionId) => ({
        sessionId,
        characterId: adult,
        activity: 'study',
        minutes: 1,
      })),
    }),
  ]);
}
let historyUser: User, oldIntent: unknown, oldSnapshot: unknown;
suite('6D-B fixed-price care on disposable native PostgreSQL', () => {
  beforeAll(async () => {
    const target = new URL(url!);
    if (
      !['127.0.0.1', 'localhost'].includes(target.hostname) ||
      target.pathname !== '/pomins_paid_care_test'
    )
      throw Error('Only a dedicated loopback database is allowed');
    db = new Pool({ connectionString: url, max: 6 });
    if (
      Number(
        (
          await db.query(
            "select count(*) n from pg_tables where schemaname not in ('pg_catalog','information_schema')",
          )
        ).rows[0].n,
      )
    )
      throw Error('Refusing nonempty database; no reset');
    await db.query(
      "create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;",
    );
    for (const m of migrations) await db.query(readFileSync('supabase/migrations/' + m, 'utf8'));
    historyUser = await user(4);
    oldIntent = {
      requestId: randomUUID(),
      characterId: historyUser.baby,
      activity: 'baby_cuddle',
      lines: [{ sessionId: historyUser.sessions[0], minutes: 1 }],
    };
    await rpc(historyUser.uid, 'baby_care_for_save', [historyUser.save, JSON.stringify(oldIntent)]);
    oldSnapshot = await ownedSnapshot(historyUser);
    await db.query(
      readFileSync('supabase/migrations/20261026183003_fixed_price_baby_care.sql', 'utf8'),
    );
  }, 60000);
  afterAll(async () => {
    await db?.end();
  });
  it('preserves historical care, credits, attributes and allocation dates at migration', async () => {
    expect(await ownedSnapshot(historyUser)).toEqual(oldSnapshot);
  });
  for (const activity of [
    'baby_feed',
    'baby_bath',
    'baby_diaper',
    'baby_play',
    'baby_cuddle',
    'baby_sleep',
  ])
    it('charges exactly two and applies ' + activity, async () => {
      const u = await user();
      const result = await buy(u, intent(u, activity));
      expect(result.receipt.chargedMinutes).toBe(2);
      expect(result.receipt.offerVersion).toBe(2);
      expect(
        result.receipt.sources.reduce((s: number, x: { minutes: number }) => s + x.minutes, 0),
      ).toBe(2);
      expect(result.stats.progress_minutes).toBe(2);
      expect(result.stats.history).toHaveLength(1);
      expect(result.stats.history[0].activity).toBe(activity);
      expect(result.stats.history[0].minutes).toBe(2);
      expect(await balance(u)).toBe(0);
      expect(Object.values(result.stats.needs).some((x) => Number(x) > 75)).toBe(true);
    });
  it('rejects insufficient and zero balances with no persistent effect', async () => {
    for (const available of [0, 1]) {
      const u = await user(available ? 2 : 0);
      if (available) await leaveOneMinutePerCredit(u);
      const before = await ownedSnapshot(u);
      await expect(buy(u)).rejects.toThrow('Insufficient minutes');
      expect(await ownedSnapshot(u)).toEqual(before);
      expect(await balance(u)).toBe(available);
    }
  });
  it('rejects arbitrary prices, minutes, funding lines and unknown actions', async () => {
    const u = await user(8);
    for (const extra of [
      { price: 1 },
      { minutes: 1 },
      { lines: [] },
      { userId: u.uid },
      { offerVersion: 1 },
    ])
      await expect(buy(u, { ...intent(u), ...extra })).rejects.toThrow('Invalid care intent');
    await expect(buy(u, intent(u, 'study'))).rejects.toThrow();
    expect(await balance(u)).toBe(8);
  });
  it('selects FIFO funds from different sessions and retains allocation provenance', async () => {
    const u = await user(4);
    await leaveOneMinutePerCredit(u);
    await db.query("update public.focus_credits set created_at='2026-01-01' where session_id=$1", [
      u.sessions[0],
    ]);
    const result = await buy(u);
    expect(result.receipt.sources.map((s: { minutes: number }) => s.minutes)).toEqual([1, 1]);
    expect(result.receipt.sources[0].sessionId).toBe(u.sessions[0]);
    expect(
      Number(
        (
          await db.query(
            'select sum(minutes) n from public.economy_purchase_sources where purchase_id=$1',
            [result.receipt.purchaseId],
          )
        ).rows[0].n,
      ),
    ).toBe(2);
    expect(await balance(u)).toBe(0);
  });
  it('replays the same request without charging after balance reaches zero', async () => {
    const u = await user(),
      cmd = intent(u),
      first = await buy(u, cmd),
      before = await ownedSnapshot(u);
    const again = await buy(u, cmd);
    expect(again.receipt).toEqual(first.receipt);
    expect(await ownedSnapshot(u)).toEqual(before);
    await expect(buy(u, { ...cmd, activity: 'baby_play' })).rejects.toThrow(
      'Request ID already used',
    );
  });
  it('serializes duplicated requests across independent connections', async () => {
    const u = await user(),
      cmd = intent(u);
    const [a, b] = await Promise.all([buy(u, cmd), buy(u, cmd)]);
    expect(a.receipt).toEqual(b.receipt);
    expect(await balance(u)).toBe(0);
    expect(
      Number(
        (
          await db.query(
            "select count(*) n from public.game_events where user_id=$1 and kind='BabyCare'",
            [u.uid],
          )
        ).rows[0].n,
      ),
    ).toBe(1);
  });
  it('serializes competing requests without consuming the same credits', async () => {
    const u = await user();
    const r = await Promise.allSettled([buy(u), buy(u, intent(u, 'baby_play'))]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(await balance(u)).toBe(0);
    expect(
      Number(
        (
          await db.query(
            'select count(*) n from public.economy_purchase_requests where user_id=$1',
            [u.uid],
          )
        ).rows[0].n,
      ),
    ).toBe(1);
  });
  it('rolls back debit, allocations, effects, revisions and receipt after a late fault', async () => {
    const u = await user();
    await db.query(
      `create function game_private.test_paid_fault() returns trigger language plpgsql as $$begin if new.user_id='${u.uid}'::uuid then raise exception 'injected care failure';end if;return new;end$$;create trigger test_paid_fault before insert on public.game_events for each row execute function game_private.test_paid_fault()`,
    );
    const before = await ownedSnapshot(u),
      revision = (await db.query('select focus_revision from public.profiles where id=$1', [u.uid]))
        .rows[0].focus_revision,
      cmd = intent(u);
    try {
      await expect(buy(u, cmd)).rejects.toThrow('injected care failure');
      expect(await ownedSnapshot(u)).toEqual(before);
      expect(
        (await db.query('select focus_revision from public.profiles where id=$1', [u.uid])).rows[0]
          .focus_revision,
      ).toBe(revision);
    } finally {
      await db.query(
        'drop trigger test_paid_fault on public.game_events;drop function game_private.test_paid_fault()',
      );
    }
    expect((await buy(u, cmd)).receipt.chargedMinutes).toBe(2);
  });
  it('rejects foreign accounts and mismatched saves, preserving both balances', async () => {
    const a = await user(),
      b = await user();
    await expect(
      rpc(a.uid, 'purchase_baby_care', [b.save, JSON.stringify(intent(b))]),
    ).rejects.toThrow();
    const second = (await rpc(a.uid, 'create_game_save', [randomUUID(), 'Outra história'])).id;
    await expect(
      rpc(a.uid, 'purchase_baby_care', [second, JSON.stringify(intent(a))]),
    ).rejects.toThrow('Baby not found');
    expect(await balance(a)).toBe(2);
    expect(await balance(b)).toBe(2);
  });
  it('uses the account-global balance across saves but progresses only the destination', async () => {
    const u = await user();
    const s = (await rpc(u.uid, 'create_game_save', [randomUUID(), 'Segundo bebê'])).id;
    const baby = (
      await rpc(u.uid, 'create_character_for_save', [s, 'Sol', JSON.stringify(defaultAppearance)])
    ).id;
    const r = await buy({ ...u, save: s, baby });
    expect(r.save_id).toBe(s);
    expect(r.stats.progress_minutes).toBe(2);
    expect(
      Number(
        (await db.query('select progress_minutes from public.characters where id=$1', [u.baby]))
          .rows[0].progress_minutes,
      ),
    ).toBe(0);
    expect(r.receipt.sources[0].sessionId).toBe(u.sessions[0]);
  });
  it('blocks arbitrary historical RPC calls but permits acknowledged historical retries', async () => {
    const u = await user(),
      legacy = {
        requestId: randomUUID(),
        characterId: u.baby,
        activity: 'baby_feed',
        lines: [{ sessionId: u.sessions[0], minutes: 1 }],
      };
    for (const fn of ['baby_care_for_save', 'baby_care'])
      await expect(
        rpc(
          u.uid,
          fn,
          fn === 'baby_care' ? [JSON.stringify(legacy)] : [u.save, JSON.stringify(legacy)],
        ),
      ).rejects.toThrow('Legacy care disabled');
    const before = await ownedSnapshot(historyUser);
    await rpc(historyUser.uid, 'baby_care_for_save', [historyUser.save, JSON.stringify(oldIntent)]);
    await rpc(historyUser.uid, 'baby_care', [JSON.stringify(oldIntent)]);
    expect(await ownedSnapshot(historyUser)).toEqual(before);
    expect(await balance(u)).toBe(2);
  });
  it('routes old RPC names with new intentions through the same fixed-price executor', async () => {
    const u = await user(),
      cmd = intent(u),
      first = await rpc(u.uid, 'baby_care', [JSON.stringify(cmd)]);
    const replay = await rpc(u.uid, 'baby_care_for_save', [u.save, JSON.stringify(cmd)]);
    expect(first.receipt).toEqual(replay.receipt);
    expect(await balance(u)).toBe(0);
  });
  it('restores receipt and progress after a new authenticated database session', async () => {
    const u = await user(),
      cmd = intent(u),
      first = await buy(u, cmd);
    const c = await db.connect();
    try {
      const state = await rpc(u.uid, 'baby_state_for_save', [u.save, u.baby], c);
      expect(state.stats).toEqual(first.stats);
      expect(
        (await rpc(u.uid, 'purchase_baby_care', [u.save, JSON.stringify(cmd)], c)).receipt,
      ).toEqual(first.receipt);
    } finally {
      c.release();
    }
  });
  it('keeps continuity, cosmetics and automatic consequences locked', async () => {
    const u = await user();
    await buy(u);
    const f = await rpc(u.uid, 'get_economy_foundation');
    expect(f.active).toBe(false);
    expect(f.activation_at).toBeNull();
    expect(f.care_offers).toHaveLength(6);
    expect(f.care_offers.every((x: { enabled: boolean }) => x.enabled)).toBe(true);
    for (const t of [
      'continuity_events',
      'inactivity_cycles',
      'character_memorials',
      'account_inventory',
    ])
      expect(Number((await db.query('select count(*) n from public.' + t)).rows[0].n)).toBe(0);
    await expect(
      db.query('update game_private.economy_release set activation_at=clock_timestamp()'),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('denies anonymous RPC and direct client writes; published price versions cannot change', async () => {
    const c = await db.connect();
    try {
      await c.query('set role anon');
      await expect(c.query('select public.baby_care_catalog()')).rejects.toMatchObject({
        code: '42501',
      });
      await c.query('reset role;set role authenticated');
      await expect(
        c.query('update public.economy_offer_versions set price_minutes=1'),
      ).rejects.toMatchObject({ code: '42501' });
    } finally {
      await c.query('reset role');
      c.release();
    }
    await expect(
      db.query('update public.economy_offer_versions set price_minutes=1 where version=2'),
    ).rejects.toThrow('Published offer version is immutable');
  });
  it('serializes paid care against the existing adult allocation path', async () => {
    const u = await user(),
      adult = (
        await rpc(u.uid, 'room_command_for_save', [
          u.save,
          'create',
          JSON.stringify({ name: 'Íris', appearance: defaultAdultAppearance }),
        ])
      ).residents[0].id;
    const results = await Promise.allSettled([
      buy(u),
      rpc(u.uid, 'room_command_for_save', [
        u.save,
        'allocate',
        JSON.stringify({
          requestId: randomUUID(),
          lines: [{ sessionId: u.sessions[0], characterId: adult, activity: 'study', minutes: 2 }],
        }),
      ]),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await balance(u)).toBe(0);
    expect(
      Number(
        (
          await db.query('select sum(minutes) n from public.focus_allocations where user_id=$1', [
            u.uid,
          ])
        ).rows[0].n,
      ),
    ).toBe(2);
  });
  it('isolates simultaneous destinations in two saves sharing the same last two minutes', async () => {
    const u = await user(),
      save = (await rpc(u.uid, 'create_game_save', [randomUUID(), 'Outro mundo'])).id,
      baby = (
        await rpc(u.uid, 'create_character_for_save', [
          save,
          'Nina',
          JSON.stringify(defaultAppearance),
        ])
      ).id;
    const results = await Promise.allSettled([buy(u), buy({ ...u, save, baby })]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rows = (
      await db.query(
        'select progress_minutes from public.characters where user_id=$1 order by progress_minutes',
        [u.uid],
      )
    ).rows;
    expect(rows.map((r) => r.progress_minutes)).toEqual([0, 2]);
    expect(await balance(u)).toBe(0);
  });
  it('enforces RLS on actual purchase and source rows belonging to another account', async () => {
    const a = await user(),
      b = await user();
    await buy(a);
    const c = await db.connect();
    try {
      await c.query('begin;set local role authenticated');
      await c.query("select set_config('request.jwt.claim.sub',$1,true)", [b.uid]);
      for (const t of ['economy_purchase_requests', 'economy_purchase_sources'])
        expect(
          (await c.query('select * from public.' + t + ' where user_id=$1', [a.uid])).rows,
        ).toEqual([]);
      await c.query('rollback');
    } finally {
      c.release();
    }
  });
  it('retains immutable price history after disabling a version and ignores future drafts', async () => {
    await db.query(
      "update public.economy_offer_versions set enabled_at=null where id='baby_sleep' and version=2",
    );
    try {
      await expect(
        db.query(
          "update public.economy_offer_versions set price_minutes=1 where id='baby_sleep' and version=2",
        ),
      ).rejects.toThrow('Published offer version is immutable');
    } finally {
      await db.query(
        "update public.economy_offer_versions set enabled_at=clock_timestamp() where id='baby_sleep' and version=2",
      );
    }
    await db.query(
      "insert into public.economy_offer_versions(id,version,kind,activity_id,price_minutes,effects_snapshot) select id,3,kind,activity_id,price_minutes,effects_snapshot from public.economy_offer_versions where id='baby_feed' and version=2",
    );
    const u = await user(),
      result = await buy(u);
    expect(result.receipt.offerVersion).toBe(2);
    const diagnostic = await rpc(u.uid, 'get_economy_foundation');
    expect(
      diagnostic.care_offers.find((x: { activity_id: string }) => x.activity_id === 'baby_feed')
        .enabled,
    ).toBe(true);
  });
});
