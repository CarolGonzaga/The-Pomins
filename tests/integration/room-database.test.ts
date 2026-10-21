import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { defaultAppearance } from '../../src/features/character-creator/model';
import {
  activities,
  defaultAdultAppearance,
  roomStateSchema,
  type RoomState,
} from '../../src/features/room/domain';
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222',
  client = '33333333-3333-4333-8333-333333333333';
let db: PGlite;
let legacyId: string;
let residentA: string;
let residentB: string;
let session: string;
const legacySession = randomUUID();
async function as(uid: string, fn: () => Promise<unknown>) {
  await db.exec(
    `set role authenticated;select set_config('request.jwt.claim.sub','${uid}',false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
async function command(uid: string, action: string, payload: unknown): Promise<RoomState> {
  let state: RoomState;
  await as(uid, async () => {
    const result = await db.query<{ data: unknown }>(
      'select public.room_command($1,$2::jsonb) data',
      [action, JSON.stringify(payload)],
    );
    state = roomStateSchema.parse(result.rows[0].data);
  });
  return state!;
}
async function state(uid: string) {
  let s: RoomState;
  await as(uid, async () => {
    const result = await db.query<{ data: unknown }>('select public.room_state() data');
    s = roomStateSchema.parse(result.rows[0].data);
  });
  return s!;
}
async function completed(uid: string, characterId: string) {
  const id = randomUUID();
  await as(uid, () =>
    db.query('select * from public.start_resident_focus($1,$2,$3,120,$4,$5)', [
      id,
      client,
      characterId,
      'Escrever',
      'Abrir o arquivo',
    ]),
  );
  await db.query('update public.focus_sessions set validated_ms=120000 where id=$1', [id]);
  await as(uid, () =>
    db.query("select * from public.focus_command('complete',$1,$2,1)", [id, client]),
  );
  return id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  await db.exec(readFileSync('supabase/migrations/202610160001_foundation.sql', 'utf8'));
  await db.query(
    `insert into auth.users(id,raw_user_meta_data) values($1,'{"nickname":"lumi"}'),($2,'{"nickname":"nilo"}')`,
    [a, b],
  );
  await as(a, async () => {
    const c = await db.query<{ id: string }>(
      'select * from public.create_character($1,$2::jsonb)',
      ['Bebê', JSON.stringify(defaultAppearance)],
    );
    legacyId = c.rows[0].id;
    await db.query("select * from public.focus_command('start',$1,$2,0,120)", [
      legacySession,
      client,
    ]);
  });
  await db.query('update public.focus_sessions set validated_ms=120000 where id=$1', [
    legacySession,
  ]);
  await as(a, () =>
    db.query("select * from public.focus_command('complete',$1,$2,1)", [legacySession, client]),
  );
  await db.exec(readFileSync('supabase/migrations/202610210001_playable_room.sql', 'utf8'));
});
afterAll(async () => db.close());
describe('room migration, credits and safe allocations', () => {
  it('preserves the baby and creates a separate adult with real appearance config', async () => {
    const old = await db.query<{ render_system: string; name: string; life_xp: number }>(
      'select * from public.characters where id=$1',
      [legacyId],
    );
    expect(old.rows[0].name).toBe('Bebê');
    expect(old.rows[0].render_system).toBe('legacy');
    expect(old.rows[0].life_xp).toBe(20);
    const s = await command(a, 'create', { name: 'Lumi', appearance: defaultAdultAppearance });
    residentA = s.residents[0].id;
    expect(s.residents[0].life_stage).toBe('adult');
    expect(s.residents[0].appearance).toEqual(defaultAdultAppearance);
    expect(s.credits.find((c) => c.session_id === legacySession)?.eligible_minutes).toBe(2);
    await as(a, async () => {
      const legacy = await db.query<{ id: string }>(
        'select * from public.create_character($1,$2::jsonb)',
        ['Outro bebê', JSON.stringify(defaultAppearance)],
      );
      expect(legacy.rows[0].id).toBe(legacyId);
    });
    expect(
      (await command(a, 'create', { name: 'Duplicado', appearance: defaultAdultAppearance }))
        .residents,
    ).toHaveLength(1);
    residentB = (await command(b, 'create', { name: 'Nilo', appearance: defaultAdultAppearance }))
      .residents[0].id;
  });
  it('keeps declarative server activities aligned with navigation/effects', async () => {
    const result = await db.query<{
      id: keyof typeof activities;
      destination: unknown;
      effects: unknown;
    }>('select * from public.activities');
    for (const row of result.rows) {
      expect(row.destination).toEqual(activities[row.id].destination);
      expect(row.effects).toEqual(activities[row.id].effects);
    }
  });
  it('persists appearance and ignores arrival from a superseded activity', async () => {
    const appearance = { ...defaultAdultAppearance, hairStyle: 'afro', eyeColor: '#7897b3' };
    await command(a, 'appearance', { characterId: residentA, appearance });
    let s = await command(a, 'activity', { characterId: residentA, activity: 'study' });
    const revision = s.residents[0].activity_revision;
    s = await command(a, 'activity', { characterId: residentA, activity: 'read' });
    s = await command(a, 'arrive', { characterId: residentA, activity: 'study', revision });
    expect(s.residents[0].current_activity).toBe('read');
    expect(s.residents[0].animation_state).toBe('walking');
    s = await command(a, 'arrive', {
      characterId: residentA,
      activity: 'read',
      revision: s.residents[0].activity_revision,
    });
    expect(s.residents[0].position).toEqual(activities.read.destination);
    expect(s.residents[0].animation_state).toBe('reading');
    expect((await state(a)).residents[0].appearance).toEqual(appearance);
  });
  it('denies cross-account characters, credits, direct writes and unsupported appearances', async () => {
    await expect(
      command(b, 'appearance', { characterId: residentA, appearance: defaultAdultAppearance }),
    ).rejects.toThrow(/not found/);
    await expect(
      command(a, 'appearance', {
        characterId: residentA,
        appearance: { ...defaultAdultAppearance, clothing: 'unavailable' },
      }),
    ).rejects.toThrow();
    await as(a, async () => {
      expect(
        (await db.query('select * from public.characters where id=$1', [residentB])).rows,
      ).toHaveLength(0);
      for (const table of ['characters', 'focus_credits', 'focus_allocations', 'game_events'])
        await expect(db.query(`delete from public.${table}`)).rejects.toThrow(/permission denied/);
    });
  });
  it('credits a completed session once, without automatically developing the adult', async () => {
    session = await completed(a, residentA);
    let s = await state(a);
    expect(s.credits.find((c) => c.session_id === session)?.eligible_minutes).toBe(2);
    expect(s.residents[0].progress_minutes).toBe(0);
    await as(a, () =>
      db.query("select * from public.focus_command('complete',$1,$2,1)", [session, client]),
    );
    s = await state(a);
    expect(s.credits.filter((c) => c.session_id === session)).toHaveLength(1);
    const c = await db.query<{ life_xp: number }>(
      'select life_xp from public.characters where id=$1',
      [residentA],
    );
    expect(c.rows[0].life_xp).toBe(0);
  });
  it('rolls back all lines if any allocation would exceed the session balance', async () => {
    const before = await state(a);
    await expect(
      command(a, 'allocate', {
        requestId: randomUUID(),
        lines: [
          { sessionId: session, characterId: residentA, activity: 'study', minutes: 1 },
          { sessionId: session, characterId: residentA, activity: 'read', minutes: 2 },
        ],
      }),
    ).rejects.toThrow(/Insufficient/);
    const after = await state(a);
    expect(after.credits).toEqual(before.credits);
    expect(after.residents[0].skills).toEqual(before.residents[0].skills);
    expect(after.allocations).toEqual([]);
  });
  it('allocates atomically and deduplicates retry with the same request', async () => {
    const payload = {
      requestId: randomUUID(),
      lines: [{ sessionId: session, characterId: residentA, activity: 'study', minutes: 1 }],
    };
    let s = await command(a, 'allocate', payload);
    expect(s.residents[0].skills.knowledge).toBe(2);
    expect(s.residents[0].skills.autonomy).toBe(1);
    expect(s.residents[0].progress_minutes).toBe(1);
    s = await command(a, 'allocate', payload);
    expect(s.residents[0].progress_minutes).toBe(1);
    expect(s.allocations).toHaveLength(1);
    await expect(
      command(a, 'allocate', { ...payload, lines: [{ ...payload.lines[0], activity: 'sleep' }] }),
    ).rejects.toThrow(/already used/);
  });
  it('serializes simultaneous allocation requests without overspending', async () => {
    await as(a, async () => {
      const requests = await Promise.allSettled(
        [1, 2].map(() =>
          db.query('select public.room_command($1,$2::jsonb)', [
            'allocate',
            JSON.stringify({
              requestId: randomUUID(),
              lines: [{ sessionId: session, characterId: residentA, activity: 'read', minutes: 1 }],
            }),
          ]),
        ),
      );
      expect(requests.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(requests.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });
    const s = await state(a);
    expect(s.credits.find((c) => c.session_id === session)?.allocated_minutes).toBe(2);
    expect(s.residents[0].skills.knowledge).toBe(3);
    expect(s.residents[0].skills.creativity).toBe(1);
  });
  it('supports splitting a new session between two residents and activities', async () => {
    const second = await db.query<{ id: string }>(
      'insert into public.characters(user_id,name,appearance,life_stage,render_system) values($1,$2,$3,$4,$5) returning id',
      [a, 'Iara', JSON.stringify(defaultAdultAppearance), 'adult', 'lpc'],
    );
    const id = await completed(a, residentA);
    const s = await command(a, 'allocate', {
      requestId: randomUUID(),
      lines: [
        { sessionId: id, characterId: residentA, activity: 'sleep', minutes: 1 },
        { sessionId: id, characterId: second.rows[0].id, activity: 'read', minutes: 1 },
      ],
    });
    expect(s.residents).toHaveLength(2);
    expect(s.residents.find((c) => c.id === residentA)?.needs.energy).toBe(78);
    expect(s.residents.find((c) => c.id === second.rows[0].id)?.skills.creativity).toBe(1);
    expect(s.residents.every((c) => c.life_stage === 'adult')).toBe(true);
  });
  it('does not grant minutes to interrupted or cancelled sessions', async () => {
    const id = randomUUID();
    await as(b, () =>
      db.query('select * from public.start_resident_focus($1,$2,$3,120,$4,$5)', [
        id,
        client,
        residentB,
        '',
        '',
      ]),
    );
    await db.query(
      "update public.focus_sessions set last_seen_at=clock_timestamp()-interval '20 seconds' where id=$1",
      [id],
    );
    await as(b, () =>
      db.query("select * from public.focus_command('heartbeat',$1,$2,1)", [id, client]),
    );
    expect((await state(b)).credits).toEqual([]);
    await as(b, () =>
      db.query("select * from public.focus_command('cancel',$1,$2,2)", [id, client]),
    );
    expect((await state(b)).credits).toEqual([]);
  });
  it('requires auth and keeps needs unchanged through long absence', async () => {
    const before = await state(a);
    await db.query(
      "update public.characters set born_at=now()-interval '10 years' where user_id=$1",
      [a],
    );
    const after = await state(a);
    expect(
      after.residents
        .map((c) => ({ id: c.id, needs: c.needs }))
        .sort((x, y) => x.id.localeCompare(y.id)),
    ).toEqual(
      before.residents
        .map((c) => ({ id: c.id, needs: c.needs }))
        .sort((x, y) => x.id.localeCompare(y.id)),
    );
    await db.exec('set role anon');
    try {
      await expect(db.query('select public.room_state()')).rejects.toThrow(/permission denied/);
    } finally {
      await db.exec('reset role');
    }
  });
});
