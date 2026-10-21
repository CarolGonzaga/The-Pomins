import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { defaultAppearance } from '../../src/features/character-creator/model';
const userA = '11111111-1111-4111-8111-111111111111',
  userB = '22222222-2222-4222-8222-222222222222';
const clientA = '33333333-3333-4333-8333-333333333333',
  clientB = '44444444-4444-4444-8444-444444444444';
let db: PGlite;
async function actor(uid: string, fn: () => Promise<unknown>) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}
async function command(
  uid: string,
  action: string,
  id: string,
  sequence: number,
  client = clientA,
  seconds = 120,
) {
  let row: Record<string, unknown> = {};
  await actor(uid, async () => {
    const r = await db.query<Record<string, unknown>>(
      'select * from public.focus_command($1,$2,$3,$4,$5,$6,$7)',
      [action, id, client, sequence, seconds, 'Escrever', 'Abrir o arquivo'],
    );
    row = r.rows[0];
  });
  return row;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  await db.exec(readFileSync('supabase/migrations/202610160001_foundation.sql', 'utf8'));
  await db.query(
    `insert into auth.users(id,raw_user_meta_data) values($1,'{"nickname":"lumi"}'),($2,'{"nickname":"nilo"}')`,
    [userA, userB],
  );
  for (const uid of [userA, userB])
    await actor(uid, () =>
      db.query('select * from public.create_character($1,$2::jsonb)', [
        'Lumi',
        JSON.stringify(defaultAppearance),
      ]),
    );
});
afterAll(async () => {
  await db.close();
});
describe('PostgreSQL migration, authorization and transactions', () => {
  const sid = '55555555-5555-4555-8555-555555555555';
  it('creates private profiles and only one playable life', async () => {
    const all = await db.query('select * from public.characters');
    expect(all.rows).toHaveLength(2);
    await actor(userA, async () => {
      const own = await db.query('select * from public.profiles');
      expect(own.rows).toHaveLength(1);
      const again = await db.query<{ name: string }>(
        'select * from public.create_character($1,$2::jsonb)',
        ['Outro', JSON.stringify(defaultAppearance)],
      );
      expect(again.rows[0].name).toBe('Lumi');
    });
  });
  it('blocks direct XP, wallet, focus, and cross-user writes', async () => {
    for (const sql of [
      'update public.characters set life_xp=999999',
      'update public.profiles set account_xp=999999',
      'update public.wallets set coins=999999',
      'insert into public.focus_sessions(id) values(gen_random_uuid())',
    ]) {
      await expect(actor(userA, () => db.exec(sql))).rejects.toThrow(/permission denied/);
    }
    await actor(userA, async () => {
      const result = await db.query(
        'update public.profiles set is_public=true where id=$1 returning id',
        [userB],
      );
      expect(result.rows).toHaveLength(0);
    });
  });
  it('persists a birth choice once and rejects arbitrary choices', async () => {
    await expect(
      actor(userA, () => db.query('select * from public.read_birth($1)', ['free_coins'])),
    ).rejects.toThrow();
    await actor(userA, async () => {
      await db.query('select * from public.read_birth($1)', ['sky']);
      const second = await db.query<{ first_memory: string }>(
        'select * from public.read_birth($1)',
        ['home'],
      );
      expect(second.rows[0].first_memory).toBe('sky');
      const memories = await db.query('select * from public.character_memories');
      expect(memories.rows).toHaveLength(1);
    });
  });
  it('starts idempotently and prevents concurrent sessions', async () => {
    expect((await command(userA, 'start', sid, 0)).status).toBe('active');
    expect((await command(userA, 'start', sid, 0)).id).toBe(sid);
    await expect(
      command(userA, 'start', '66666666-6666-4666-8666-666666666666', 0),
    ).rejects.toThrow(/one_open_session/);
  });
  it('rejects early heartbeats, out-of-sequence messages and other users', async () => {
    await expect(command(userA, 'heartbeat', sid, 1)).rejects.toThrow(/frequent/);
    await expect(command(userA, 'heartbeat', sid, 7)).rejects.toThrow(/sequence/);
    await expect(command(userB, 'heartbeat', sid, 1)).rejects.toThrow(/not found/);
    await expect(command(userA, 'heartbeat', sid, 1, clientB)).rejects.toThrow(/another tab/);
  });
  it('confirms server intervals and deduplicates heartbeat delivery', async () => {
    await db.query(
      "update public.focus_sessions set last_seen_at=clock_timestamp()-interval '5 seconds' where id=$1",
      [sid],
    );
    const first = await command(userA, 'heartbeat', sid, 1);
    expect(first.validated_ms).toBe(5000);
    const duplicate = await command(userA, 'heartbeat', sid, 1);
    expect(duplicate.validated_ms).toBe(5000);
    await expect(command(userA, 'complete', sid, 2)).rejects.toThrow(/Insufficient/);
  });
  it('does not credit suspension and recovers manually with a new tab lease', async () => {
    await db.query(
      "update public.focus_sessions set last_seen_at=clock_timestamp()-interval '30 seconds' where id=$1",
      [sid],
    );
    const s = await command(userA, 'heartbeat', sid, 2);
    expect(s.status).toBe('interrupted');
    expect(s.validated_ms).toBe(5000);
    const recovered = await command(userA, 'recover', sid, 0, clientB);
    expect(recovered.status).toBe('interrupted');
    expect(recovered.client_id).toBe(clientB);
    await expect(command(userA, 'resume', sid, 4)).rejects.toThrow(/another tab/);
    const resumed = await command(userA, 'resume', sid, Number(recovered.sequence) + 1, clientB);
    expect(resumed.status).toBe('active');
  });
  it('finishes atomically and pays exactly once', async () => {
    let sequence = 4;
    for (let n = 1; n < 24; n++) {
      await db.query(
        "update public.focus_sessions set last_seen_at=clock_timestamp()-interval '5 seconds' where id=$1",
        [sid],
      );
      const s = await command(userA, 'heartbeat', sid, ++sequence, clientB);
      expect(s.status).toBe('active');
    }
    const done = await command(userA, 'complete', sid, ++sequence, clientB);
    expect(done.status).toBe('completed');
    expect(done.reward_xp).toBe(20);
    expect(done.validated_ms).toBe(120000);
    await command(userA, 'complete', sid, sequence, clientB);
    await command(userA, 'recover', sid, 0, clientB);
    const reward = await db.query('select * from public.focus_rewards where session_id=$1', [sid]);
    expect(reward.rows).toHaveLength(1);
    const character = await db.query<{ life_xp: number }>(
      'select life_xp from public.characters where user_id=$1',
      [userA],
    );
    expect(character.rows[0].life_xp).toBe(20);
    const wallet = await db.query<{ coins: number }>(
      'select * from public.wallets where user_id=$1',
      [userA],
    );
    expect(wallet.rows[0].coins).toBe(4);
  });
  it('expires old sessions and preserves confirmed time on cancellation', async () => {
    const other = '77777777-7777-4777-8777-777777777777';
    await command(userB, 'start', other, 0);
    await db.query(
      "update public.focus_sessions set created_at=now()-interval '25 hours', validated_ms=5000 where id=$1",
      [other],
    );
    const expired = await command(userB, 'recover', other, 0);
    expect(expired.status).toBe('expired');
    expect(expired.validated_ms).toBe(5000);
    const id = '88888888-8888-4888-8888-888888888888';
    await command(userB, 'start', id, 0);
    const cancelled = await command(userB, 'cancel', id, 1);
    expect(cancelled.status).toBe('cancelled');
    const rewards = await db.query('select * from public.focus_rewards where user_id=$1', [userB]);
    expect(rewards.rows).toHaveLength(0);
  });
  it('caps reward minutes per day while retaining time', async () => {
    const id = '99999999-9999-4999-8999-999999999999';
    await command(userA, 'start', id, 0);
    await db.query('update public.focus_rewards set rewarded_minutes=120 where session_id=$1', [
      sid,
    ]);
    const budget = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await db.query(
      "insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,client_id) select $1,user_id,id,'completed',7200,$2 from public.characters where user_id=$3",
      [budget, clientA, userA],
    );
    await db.query(
      'insert into public.focus_rewards(session_id,user_id,life_xp,account_xp,coins,energy,rewarded_minutes) values($1,$2,0,0,0,0,120)',
      [budget, userA],
    );
    await db.query('update public.focus_sessions set validated_ms=120000 where id=$1', [id]);
    const s = await command(userA, 'complete', id, 1);
    expect(s.reward_xp).toBe(0);
    expect(s.validated_ms).toBe(120000);
  });
  it('requires authentication and isolates account deletion', async () => {
    await db.exec('set role anon');
    try {
      await expect(db.query('select public.delete_my_account()')).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.exec('reset role');
    }
    await actor(userB, () => db.query('select public.delete_my_account()'));
    expect(
      (await db.query('select * from public.profiles where id=$1', [userB])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query('select * from public.profiles where id=$1', [userA])).rows,
    ).toHaveLength(1);
  });
});
