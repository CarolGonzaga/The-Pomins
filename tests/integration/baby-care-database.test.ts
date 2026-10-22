import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import {
  babyStateSchema,
  careIds,
  defaultCareRules,
  growthReadiness,
  applyCare,
} from '../../src/features/baby-care/model';
import { defaultAppearance } from '../../src/features/character-creator/model';
import { defaultAdultAppearance, roomStateSchema } from '../../src/features/room/domain';

let db: PGlite;
async function as<T>(uid: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${uid}',false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
async function state(uid: string, id: string) {
  return as(uid, async () =>
    babyStateSchema.parse(
      (await db.query<{ data: unknown }>('select public.baby_state($1) data', [id])).rows[0].data,
    ),
  );
}
async function care(uid: string, payload: unknown) {
  return as(uid, async () =>
    babyStateSchema.parse(
      (
        await db.query<{ data: unknown }>('select public.baby_care($1::jsonb) data', [
          JSON.stringify(payload),
        ])
      ).rows[0].data,
    ),
  );
}
async function setup(minutes = 12) {
  const uid = randomUUID(),
    session = randomUUID();
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)', [
    uid,
    JSON.stringify({ nickname: 'baby_' + uid.replaceAll('-', '').slice(0, 16) }),
  ]);
  const created = await as(uid, () =>
    db.query<{ id: string }>('select * from public.create_character($1,$2::jsonb)', [
      'Lumi',
      JSON.stringify(defaultAppearance),
    ]),
  );
  const id = created.rows[0].id;
  await as(uid, () => db.query("select * from public.read_birth('sky')"));
  // Fixture completion, not evidence of real elapsed focus or remote Auth.
  await db.query(
    "insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,validated_ms,client_id) values($1,$2,$3,'completed',$4,$5,$6)",
    [session, uid, id, minutes * 60, minutes * 60000, randomUUID()],
  );
  return {
    uid,
    id,
    session,
    command: {
      requestId: randomUUID(),
      characterId: id,
      activity: 'baby_feed',
      lines: [{ sessionId: session, minutes: 1 }],
    },
  };
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  for (const path of [
    'supabase/migrations/202610160001_foundation.sql',
    'supabase/migrations/202610210001_playable_room.sql',
    'supabase/migrations/20261022021139_baby_care.sql',
  ])
    await db.exec(readFileSync(path, 'utf8'));
});
afterAll(async () => {
  await db.close();
});
describe('proposed baby care SQL against local PostgreSQL WASM', () => {
  it('matches configurable rules and applies all six care effects with persistent history', async () => {
    const f = await setup();
    let previous = await state(f.uid, f.id);
    expect(previous.rules).toEqual(defaultCareRules);
    expect(previous.stats.progress_minutes).toBe(0);
    expect(previous.character.birth_read).toBe(true);
    for (const activity of careIds) {
      const expected = applyCare(previous.stats, activity, 1);
      const next = await care(f.uid, { ...f.command, requestId: randomUUID(), activity });
      expect(next.stats.needs).toEqual(expected.needs);
      expect(next.stats.skills).toEqual(expected.skills);
      expect(next.stats.traits).toEqual(expected.traits);
      previous = next;
    }
    expect(previous.stats.history).toHaveLength(6);
    expect(previous.stats.care_types).toHaveLength(6);
    expect(previous.stats.progress_minutes).toBe(6);
    expect(await state(f.uid, f.id)).toEqual(previous);
    expect(previous.character.name).toBe('Lumi');
    expect(previous.character.appearance).toEqual(defaultAppearance);
  });
  it('preserves the shared adult ledger and deduplicates retries across functions', async () => {
    const f = await setup(2);
    const first = await care(f.uid, f.command);
    expect(await care(f.uid, f.command)).toEqual(first);
    await expect(care(f.uid, { ...f.command, activity: 'baby_cuddle' })).rejects.toThrow();
    const room = await as(f.uid, async () =>
      roomStateSchema.parse(
        (
          await db.query<{ data: unknown }>("select public.room_command('create',$1::jsonb) data", [
            JSON.stringify({ name: 'Aurora', appearance: defaultAdultAppearance }),
          ])
        ).rows[0].data,
      ),
    );
    expect(room.allocations[0].activity_id).toBe('baby_feed');
    const payload = {
      requestId: randomUUID(),
      lines: [
        { sessionId: f.session, characterId: room.residents[0].id, activity: 'study', minutes: 1 },
      ],
    };
    await as(f.uid, () =>
      db.query("select public.room_command('allocate',$1::jsonb)", [JSON.stringify(payload)]),
    );
    await expect(care(f.uid, { ...f.command, requestId: randomUUID() })).rejects.toThrow(
      'Insufficient minutes',
    );
    await as(f.uid, async () => {
      await expect(
        db.query("select public.room_command('allocate',$1::jsonb)", [
          JSON.stringify({ ...payload, requestId: f.command.requestId }),
        ]),
      ).rejects.toThrow();
    });
    const final = await state(f.uid, f.id);
    expect(final.credits[0].allocated_minutes).toBe(2);
    expect(final.stats.history).toHaveLength(1);
  });
  it('rolls back every ledger/progress write if a later line fails', async () => {
    const f = await setup();
    const before = await state(f.uid, f.id);
    await expect(
      care(f.uid, {
        ...f.command,
        lines: [
          { sessionId: f.session, minutes: 1 },
          { sessionId: randomUUID(), minutes: 1 },
        ],
      }),
    ).rejects.toThrow();
    expect(await state(f.uid, f.id)).toEqual(before);
    const requests = await db.query('select * from public.allocation_requests where id=$1', [
      f.command.requestId,
    ]);
    expect(requests.rows).toHaveLength(0);
    for (const minutes of [0, -1, 1.5, 121, null, '1'])
      await expect(
        care(f.uid, { ...f.command, lines: [{ sessionId: f.session, minutes }] }),
      ).rejects.toThrow();
    expect(await state(f.uid, f.id)).toEqual(before);
  });
  it('isolates babies, credits, history and writes by account and household', async () => {
    const a = await setup(),
      b = await setup();
    await care(a.uid, a.command);
    await expect(state(b.uid, a.id)).rejects.toThrow('Baby not found');
    await expect(care(b.uid, a.command)).rejects.toThrow('Baby not found');
    await expect(
      care(b.uid, { ...b.command, lines: [{ sessionId: a.session, minutes: 1 }] }),
    ).rejects.toThrow();
    await as(b.uid, async () => {
      expect(
        (await db.query('select * from public.game_events where character_id=$1', [a.id])).rows,
      ).toHaveLength(0);
      expect(
        (await db.query('select * from public.focus_allocations where character_id=$1', [a.id]))
          .rows,
      ).toHaveLength(0);
      expect(
        (await db.query('select * from public.characters where id=$1', [a.id])).rows,
      ).toHaveLength(0);
      await expect(db.exec("update public.characters set needs='{}'")).rejects.toThrow();
      await expect(db.exec("update public.baby_care_config set rules='{}'")).rejects.toThrow();
      await expect(
        db.exec('insert into public.focus_allocations default values'),
      ).rejects.toThrow();
    });
    await db.exec('set role anon');
    try {
      await expect(db.query('select public.baby_state($1)', [a.id])).rejects.toThrow();
    } finally {
      await db.exec('reset role');
    }
    // Even a corrupted household association must not make an RPC accept the character.
    await db.query(
      'update public.characters set household_id=(select id from public.households where user_id=$1) where id=$2',
      [a.uid, b.id],
    );
    await expect(state(b.uid, b.id)).rejects.toThrow('Baby not found');
  });
  it('keeps absence neutral and growth voluntary/configurable without altering identity', async () => {
    const f = await setup();
    const before = await state(f.uid, f.id);
    await db.query("update public.characters set born_at=now()-interval '1 year' where id=$1", [
      f.id,
    ]);
    const after = await state(f.uid, f.id);
    expect(after.stats).toEqual(before.stats);
    await db.exec(
      `update public.baby_care_config set rules=jsonb_set(jsonb_set(rules,'{growth,minutes}','1'),'{growth,distinctCare}','1')`,
    );
    try {
      const next = await care(f.uid, f.command);
      expect(growthReadiness(next.stats, next.character, next.rules)).toBe(true);
      const identity = await db.query<{ life_stage: string; first_memory: string }>(
        'select life_stage,first_memory from public.characters where id=$1',
        [f.id],
      );
      expect(identity.rows[0]).toEqual({ life_stage: 'baby', first_memory: 'sky' });
    } finally {
      await db.query('update public.baby_care_config set rules=$1::jsonb', [
        JSON.stringify(defaultCareRules),
      ]);
    }
  });
});
