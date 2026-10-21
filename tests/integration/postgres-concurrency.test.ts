import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { defaultAdultAppearance } from '../../src/features/room/domain';
const url = process.env.POMINS_TEST_DATABASE_URL;
const suite = url ? describe : describe.skip;
suite('independent PostgreSQL connections: allocation race', () => {
  let pool: Pool;
  const user = randomUUID();
  const session = randomUUID();
  let character: string;
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
    } finally {
      client.release();
    }
    await pool.query(
      "insert into public.focus_sessions(id,user_id,character_id,status,planned_seconds,validated_ms,client_id) values($1,$2,$3,'completed',120,120000,$4)",
      [session, user, character, randomUUID()],
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
});
