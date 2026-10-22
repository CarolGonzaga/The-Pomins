import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { defaultAppearance } from '../../src/features/character-creator/model';
import { defaultAdultAppearance } from '../../src/features/room/domain';

const migration = 'supabase/migrations/20261022134830_game_saves_compatibility.sql';
let db: PGlite;
const a = randomUUID(),
  b = randomUUID(),
  empty = randomUUID(),
  client = randomUUID();
let adultA: string,
  adultB: string,
  babyB: string,
  archived: string,
  session: string,
  openSession: string;
let before: Record<string, Record<string, unknown>[]>;
let engine: string;
const tables = [
  'profiles',
  'households',
  'characters',
  'focus_sessions',
  'focus_events',
  'focus_rewards',
  'wallets',
  'focus_credits',
  'focus_allocations',
  'allocation_requests',
  'character_memories',
  'game_events',
  'baby_care_config',
  'activities',
];
async function as<T>(uid: string, run: () => Promise<T>) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${uid}',false);`,
  );
  try {
    return await run();
  } finally {
    await db.exec('reset role');
  }
}
async function rpc<T = Record<string, unknown>>(uid: string, name: string, args: unknown[] = []) {
  return as(
    uid,
    async () =>
      (
        await db.query<{ data: T }>(
          `select to_jsonb(public.${name}(${args.map((_, i) => '$' + (i + 1)).join(',')})) data`,
          args,
        )
      ).rows[0].data,
  );
}
async function rows(table: string) {
  return (
    await db.query<{ row: Record<string, unknown> }>(
      `select to_jsonb(t) row from public.${table} t`,
    )
  ).rows.map((r) => r.row);
}
async function context(uid: string) {
  return rpc<{
    save: {
      id: string;
      state: string;
      protagonist_id: string | null;
      primary_household_id: string;
      world_revision: number;
    };
    focus_revision: number;
  }>(uid, 'get_game_context');
}
async function room(uid: string, save: string, action: string, payload: unknown) {
  return rpc<{
    residents: { id: string; appearance: unknown; progress_minutes: number }[];
    save_id: string;
    world_revision: number;
    focus_revision: number;
    allocations: unknown[];
    credits: { allocated_minutes: number }[];
  }>(uid, 'room_command_for_save', [save, action, JSON.stringify(payload)]);
}
async function newUser(uid: string) {
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
    uid,
    JSON.stringify({ nickname: 's_' + uid.replaceAll('-', '').slice(0, 16) }),
  ]);
}
async function extraSave(uid: string) {
  const s = randomUUID(),
    h = randomUUID();
  await db.exec('begin');
  try {
    await db.query(
      "insert into public.game_saves(id,user_id,name) values($1,$2,'Segunda partida')",
      [s, uid],
    );
    await db.query('insert into public.households(id,user_id,save_id) values($1,$2,$3)', [
      h,
      uid,
      s,
    ]);
    await db.query('update public.game_saves set primary_household_id=$1 where id=$2', [h, s]);
    await db.exec('commit');
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
  return { s, h };
}
async function completed(uid: string, char: string, save: string) {
  const id = randomUUID();
  await rpc(uid, 'start_save_focus', [save, id, client, char, 120, 'Teste', 'Abrir']);
  await db.query('update public.focus_sessions set validated_ms=120000 where id=$1', [id]);
  await rpc(uid, 'focus_command', ['complete', id, client, 1]);
  return id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const p of [
    '202610160001_foundation.sql',
    '202610210001_playable_room.sql',
    '20261022021139_baby_care.sql',
  ])
    await db.exec(readFileSync('supabase/migrations/' + p, 'utf8'));
  for (const uid of [a, b, empty]) await newUser(uid);
  adultA = (
    await rpc<{ residents: { id: string }[] }>(a, 'room_command', [
      'create',
      JSON.stringify({ name: 'Aurora', appearance: defaultAdultAppearance }),
    ])
  ).residents[0].id;
  adultB = (
    await rpc<{ residents: { id: string }[] }>(b, 'room_command', [
      'create',
      JSON.stringify({ name: 'Bento', appearance: defaultAdultAppearance }),
    ])
  ).residents[0].id;
  babyB = (
    await rpc<{ id: string }>(b, 'create_character', ['Bebê', JSON.stringify(defaultAppearance)])
  ).id;
  archived = (
    await rpc<{ id: string }>(a, 'create_character', ['Antigo', JSON.stringify(defaultAppearance)])
  ).id;
  await rpc(a, 'read_birth', ['sky']);
  await db.query('update public.characters set archived_at=now() where id=$1', [archived]);
  session = randomUUID();
  await rpc(a, 'start_resident_focus', [session, client, adultA, 120, 'Ler', 'Abrir']);
  await db.query('update public.focus_sessions set validated_ms=120000 where id=$1', [session]);
  await rpc(a, 'focus_command', ['complete', session, client, 1]);
  await rpc(a, 'room_command', [
    'allocate',
    JSON.stringify({
      requestId: randomUUID(),
      lines: [{ sessionId: session, characterId: adultA, activity: 'study', minutes: 1 }],
    }),
  ]);
  const babySession = randomUUID();
  await rpc(b, 'focus_command', ['start', babySession, client, 0, 120, 'Cuidar', 'Começar']);
  await db.query('update public.focus_sessions set validated_ms=120000 where id=$1', [babySession]);
  await rpc(b, 'focus_command', ['complete', babySession, client, 1]);
  await rpc(b, 'baby_care', [
    JSON.stringify({
      requestId: randomUUID(),
      characterId: babyB,
      activity: 'baby_cuddle',
      lines: [{ sessionId: babySession, minutes: 1 }],
    }),
  ]);
  openSession = randomUUID();
  await rpc(b, 'focus_command', ['start', openSession, client, 0, 120, 'Cuidar', 'Começar']);
  await rpc(b, 'focus_command', ['pause', openSession, client, 1]);
  before = {};
  for (const table of tables) before[table] = await rows(table);
  engine = (
    await db.query<{ prosrc: string }>(
      "select prosrc from pg_proc where oid='public.focus_command(text,uuid,uuid,integer,integer,text,text)'::regprocedure",
    )
  ).rows[0].prosrc;
  await db.exec(readFileSync(migration, 'utf8'));
});
afterAll(async () => db.close());
describe('save migration rehearsal and compatibility', () => {
  it('preserves every old column/ID and the validated focus engine, including an open session', async () => {
    const comparison: Record<
      string,
      { before: number; after: number; original_columns_equal: boolean }
    > = {};
    for (const table of tables) {
      const after = await rows(table);
      const keys = before[table][0] ? Object.keys(before[table][0]) : [];
      const normalized = after.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]])));
      const sorted = (rs: Record<string, unknown>[]) => rs.map((r) => JSON.stringify(r)).sort();
      expect(sorted(normalized), table).toEqual(sorted(before[table]));
      comparison[table] = {
        before: before[table].length,
        after: after.length,
        original_columns_equal: true,
      };
    }
    const current = (
      await db.query<{ prosrc: string }>(
        "select prosrc from pg_proc where oid='game_private.focus_engine(text,uuid,uuid,integer,integer,text,text)'::regprocedure",
      )
    ).rows[0].prosrc;
    expect(current).toBe(engine);
    expect(
      (
        await db.query<{ status: string }>('select status from public.focus_sessions where id=$1', [
          openSession,
        ])
      ).rows[0].status,
    ).toBe('paused');
    expect(await rows('game_saves')).toHaveLength(3);
    mkdirSync('.cache/game-saves', { recursive: true });
    writeFileSync(
      '.cache/game-saves/rehearsal.json',
      JSON.stringify(
        {
          environment: 'local-pglite-simulated-auth',
          migration,
          migration_sha256: createHash('sha256').update(readFileSync(migration)).digest('hex'),
          tables: comparison,
          focus_engine_unchanged: current === engine,
          paused_session_preserved: true,
          existing_ids_preserved: true,
          game_saves_created: 3,
          native_concurrency: 'reported separately',
          remote_applied: false,
        },
        null,
        2,
      ) + '\n',
    );
  });
  it('chooses only an unambiguous active protagonist and audits ambiguous/empty households', async () => {
    const ca = await context(a),
      cb = await context(b),
      ce = await context(empty);
    expect(ca.save.protagonist_id).toBe(adultA);
    expect(ca.save.state).toBe('ready');
    expect(cb.save.protagonist_id).toBeNull();
    expect(cb.save.state).toBe('pending_selection');
    expect(ce.save.protagonist_id).toBeNull();
    expect(ce.save.state).toBe('draft');
    const chars = await db.query<{ save_id: string }>(
      'select save_id from public.characters where id in ($1,$2)',
      [adultB, babyB],
    );
    expect(chars.rows.every((c) => c.save_id === cb.save.id)).toBe(true);
    const audit = await db.query<{ strategy: string; candidate_ids: string[] }>(
      'select * from public.game_save_migration_audit where save_id=$1',
      [cb.save.id],
    );
    expect(audit.rows[0].strategy).toBe('pending_multiple');
    expect(audit.rows[0].candidate_ids.sort()).toEqual([adultB, babyB].sort());
    expect(
      (
        await db.query<{ save_id: string }>('select save_id from public.characters where id=$1', [
          archived,
        ])
      ).rows[0].save_id,
    ).toBe(ca.save.id);
  });
  it('retains global credit and reward totals without reconstructing old effects', async () => {
    expect(
      (await rows('focus_credits')).map((r) => [r.eligible_minutes, r.allocated_minutes]),
    ).toEqual([
      [2, 1],
      [2, 1],
    ]);
    expect(await rows('focus_rewards')).toHaveLength(before.focus_rewards.length);
    const allocation = (await rows('focus_allocations'))[0];
    expect(allocation.effects_snapshot).toBeNull();
    expect(allocation.effect_status).toBe('legacy_unknown');
    expect(allocation.save_id).toBe((await context(a)).save.id);
  });
  it('keeps old RPC routes working and restores appearance/baby state without guessing a protagonist', async () => {
    const appearance = { ...defaultAdultAppearance, hairColor: '#23ab79' };
    await rpc(a, 'room_command', [
      'appearance',
      JSON.stringify({ characterId: adultA, appearance }),
    ]);
    const restored = await rpc<{ residents: { appearance: unknown }[] }>(a, 'room_state');
    expect(restored.residents[0].appearance).toEqual(appearance);
    await rpc(b, 'read_birth', ['home']);
    const baby = await rpc<{ character: { first_memory: string }; stats: { needs: unknown } }>(
      b,
      'baby_state',
      [babyB],
    );
    expect(baby.character.first_memory).toBe('home');
    expect(baby.stats.needs).toEqual({
      satiety: 75,
      hygiene: 75,
      energy: 75,
      affection: 87,
      fun: 75,
    });
    await rpc(b, 'room_command', [
      'activity',
      JSON.stringify({ characterId: adultB, activity: 'read' }),
    ]);
  });
  it('replays pre-migration adult and baby requests without rewriting payloads or duplicating history', async () => {
    const adultRequest = before.allocation_requests.find((r) => r.user_id === a)!.payload;
    const babyRequest = (
      before.allocation_requests.find((r) => r.user_id === b)!.payload as { babyCare: unknown }
    ).babyCare;
    const adultBefore = await rpc(a, 'room_state');
    expect(await rpc(a, 'room_command', ['allocate', JSON.stringify(adultRequest)])).toEqual(
      adultBefore,
    );
    const babyBefore = await rpc<{ stats: { history: unknown[] } }>(b, 'baby_state', [babyB]);
    expect(babyBefore.stats.history).toHaveLength(1);
    expect(await rpc(b, 'baby_care', [JSON.stringify(babyRequest)])).toEqual(babyBefore);
    expect(
      (await rows('allocation_requests')).filter((r) => r.user_id === a || r.user_id === b),
    ).toEqual(before.allocation_requests);
  });
  it('supports separate same-owner worlds and rejects cross-save references/commands', async () => {
    const first = await context(a),
      second = await extraSave(a);
    const other = (
      await room(a, second.s, 'create', { name: 'Outra vida', appearance: defaultAdultAppearance })
    ).residents[0].id;
    const list = await rpc<{ residents: { id: string }[] }>(a, 'room_state_for_save', [
      first.save.id,
    ]);
    expect(list.residents.map((r) => r.id)).toEqual([adultA]);
    await expect(
      room(a, first.save.id, 'appearance', {
        characterId: other,
        appearance: defaultAdultAppearance,
      }),
    ).rejects.toThrow();
    await expect(
      db.query('update public.characters set household_id=$1 where id=$2', [second.h, adultA]),
    ).rejects.toThrow();
    await expect(
      db.query('update public.characters set save_id=$1 where id=$2', [second.s, adultA]),
    ).rejects.toThrow();
    await expect(
      db.query('update public.game_saves set protagonist_id=$1 where id=$2', [adultA, second.s]),
    ).rejects.toThrow();
    expect((await context(a)).save.id).toBe(first.save.id);
    await expect(
      room(a, first.save.id, 'allocate', {
        requestId: randomUUID(),
        lines: [
          {
            sessionId: session,
            characterId: adultA,
            saveId: second.s,
            activity: 'study',
            minutes: 1,
          },
        ],
      }),
    ).rejects.toThrow();
  });
  it('enforces RLS, controlled writes and private helper grants', async () => {
    const own = await context(a),
      foreign = await context(b);
    await expect(rpc(b, 'get_game_context', [own.save.id])).rejects.toThrow('Save not found');
    await expect(rpc(b, 'room_state_for_save', [own.save.id])).rejects.toThrow();
    await expect(rpc(a, 'baby_state_for_save', [own.save.id, babyB])).rejects.toThrow();
    await as(b, async () => {
      expect(
        (await db.query('select * from public.game_saves where id=$1', [own.save.id])).rows,
      ).toHaveLength(0);
      await expect(
        db.exec("insert into public.game_saves(user_id,name) values(auth.uid(),'Hack')"),
      ).rejects.toThrow();
      await expect(db.exec('update public.game_saves set world_revision=99999')).rejects.toThrow();
      await expect(
        db.query('select game_private.checked_save($1)', [foreign.save.id]),
      ).rejects.toThrow();
    });
    await db.exec('set role anon');
    try {
      await expect(db.query('select public.get_game_context()')).rejects.toThrow();
    } finally {
      await db.exec('reset role');
    }
  });
  it('separates world/balance revisions, deduplicates requests and atomically rolls back', async () => {
    const uid = randomUUID();
    await newUser(uid);
    const s = (await context(uid)).save.id;
    const char = (
      await room(uid, s, 'create', { name: 'Teste', appearance: defaultAdultAppearance })
    ).residents[0].id;
    const original = await context(uid),
      sid = await completed(uid, char, s),
      afterFocus = await context(uid);
    expect(afterFocus.save.world_revision).toBe(original.save.world_revision);
    expect(afterFocus.focus_revision).toBeGreaterThan(original.focus_revision);
    const oldClient = await rpc<{
      revision: number;
      world_revision: number;
      focus_revision: number;
    }>(uid, 'room_state');
    expect(oldClient.revision).toBe(oldClient.world_revision + oldClient.focus_revision);
    const cmd = {
      requestId: randomUUID(),
      lines: [{ sessionId: sid, characterId: char, activity: 'study', minutes: 1 }],
    };
    const first = await room(uid, s, 'allocate', cmd);
    const repeated = await room(uid, s, 'allocate', cmd);
    expect(repeated).toEqual(first);
    expect(first.allocations).toHaveLength(1);
    await expect(
      room(uid, s, 'allocate', { ...cmd, lines: [{ ...cmd.lines[0], activity: 'read' }] }),
    ).rejects.toThrow();
    const snapshot = await rpc(uid, 'room_state_for_save', [s]);
    await expect(
      room(uid, s, 'allocate', {
        requestId: randomUUID(),
        lines: [cmd.lines[0], { ...cmd.lines[0], sessionId: randomUUID() }],
      }),
    ).rejects.toThrow();
    expect(await rpc(uid, 'room_state_for_save', [s])).toEqual(snapshot);
    await room(uid, s, 'appearance', {
      characterId: char,
      appearance: { ...defaultAdultAppearance, hairStyle: 'afro' },
    });
    const changed = await context(uid);
    expect(changed.focus_revision).toBe(first.focus_revision);
    expect(changed.save.world_revision).toBeGreaterThan(first.world_revision);
  });
  it('records scoped baby care effects using the same global balance as the adult', async () => {
    const uid = randomUUID();
    await newUser(uid);
    const s = (await context(uid)).save.id;
    const baby = (
      await rpc<{ id: string }>(uid, 'create_character_for_save', [
        s,
        'Bebê',
        JSON.stringify(defaultAppearance),
      ])
    ).id;
    const adult = (
      await room(uid, s, 'create', { name: 'Adulto', appearance: defaultAdultAppearance })
    ).residents[0].id;
    const sid = await completed(uid, adult, s);
    const cmd = {
      requestId: randomUUID(),
      characterId: baby,
      activity: 'baby_cuddle',
      lines: [{ sessionId: sid, minutes: 1 }],
    };
    const care = await rpc<{ stats: { needs: { affection: number }; history: unknown[] } }>(
      uid,
      'baby_care_for_save',
      [s, JSON.stringify(cmd)],
    );
    expect(care.stats.needs.affection).toBe(87);
    expect(care.stats.history).toHaveLength(1);
    expect(await rpc(uid, 'baby_care_for_save', [s, JSON.stringify(cmd)])).toEqual(care);
    const r = await room(uid, s, 'allocate', {
      requestId: randomUUID(),
      lines: [{ sessionId: sid, characterId: adult, activity: 'read', minutes: 1 }],
    });
    expect(r.credits[0].allocated_minutes).toBe(2);
    const effects = (await rows('focus_allocations')).filter((x) => x.user_id === uid);
    expect(
      effects.every(
        (x) => x.save_id === s && x.effect_status === 'recorded' && x.effects_snapshot !== null,
      ),
    ).toBe(true);
    const babyEffects = effects.find((x) => x.activity_id === 'baby_cuddle')!.effects_snapshot as {
      effect_scope: string;
      before: { needs: { affection: number } };
      after: { needs: { affection: number } };
    };
    expect(babyEffects.effect_scope).toBe('care_request_total');
    expect(babyEffects.before.needs.affection).toBe(75);
    expect(babyEffects.after.needs.affection).toBe(87);
  });
  it('keeps one open focus per account across saves and can recover the pre-migration session', async () => {
    const s = (await context(b)).save.id;
    await expect(
      rpc(b, 'start_save_focus', [s, randomUUID(), randomUUID(), adultB, 120, '', '']),
    ).rejects.toThrow();
    const second = await extraSave(b);
    const other = (
      await room(b, second.s, 'create', { name: 'Outro', appearance: defaultAdultAppearance })
    ).residents[0].id;
    await expect(
      rpc(b, 'start_save_focus', [second.s, randomUUID(), randomUUID(), other, 120, '', '']),
    ).rejects.toThrow();
    await rpc(b, 'focus_command', ['recover', openSession, client, 0]);
    await rpc(b, 'focus_command', ['cancel', openSession, client, 3]);
    expect(
      (
        await db.query<{ status: string }>('select status from public.focus_sessions where id=$1', [
          openSession,
        ])
      ).rows[0].status,
    ).toBe('cancelled');
    expect(
      (await db.query('select * from public.focus_credits where session_id=$1', [openSession]))
        .rows,
    ).toHaveLength(0);
  });
  it('keeps separate babies and birth memories in two saves of the same owner', async () => {
    const uid = randomUUID();
    await newUser(uid);
    const first = (await context(uid)).save.id,
      second = await extraSave(uid);
    const one = (
      await rpc<{ id: string }>(uid, 'create_character_for_save', [
        first,
        'Primeiro bebê',
        JSON.stringify(defaultAppearance),
      ])
    ).id;
    const two = (
      await rpc<{ id: string }>(uid, 'create_character_for_save', [
        second.s,
        'Segundo bebê',
        JSON.stringify({ ...defaultAppearance, species: 'alien' }),
      ])
    ).id;
    expect(one).not.toBe(two);
    await rpc(uid, 'read_birth_for_save', [second.s, two, 'home']);
    const a = await rpc<{ character: { birth_read: boolean } }>(uid, 'baby_state_for_save', [
      first,
      one,
    ]);
    const b = await rpc<{ character: { birth_read: boolean; first_memory: string } }>(
      uid,
      'baby_state_for_save',
      [second.s, two],
    );
    expect(a.character.birth_read).toBe(false);
    expect(b.character.first_memory).toBe('home');
    await expect(rpc(uid, 'read_birth_for_save', [first, two, 'sky'])).rejects.toThrow();
    await expect(rpc(uid, 'baby_state_for_save', [first, two])).rejects.toThrow();
  });
  it('preserves account deletion despite cyclic save/protagonist/household references', async () => {
    const uid = randomUUID();
    await newUser(uid);
    const s = (await context(uid)).save.id;
    const char = (
      await room(uid, s, 'create', { name: 'Temporário', appearance: defaultAdultAppearance })
    ).residents[0].id;
    await completed(uid, char, s);
    const other = await context(a);
    await rpc(uid, 'delete_my_account');
    expect((await db.query('select * from public.profiles where id=$1', [uid])).rows).toHaveLength(
      0,
    );
    expect(
      (await db.query('select * from public.game_saves where user_id=$1', [uid])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('select * from public.focus_credits where user_id=$1', [uid])).rows,
    ).toHaveLength(0);
    expect((await context(a)).save.id).toBe(other.save.id);
  });
});
