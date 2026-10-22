// Real Auth/RLS/readback validation; never alters focus timestamps or creates credit.
// Creates the legacy test baby in B only if absent. Does not spend any minutes.
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';
for (const path of ['.env.local', '.env.supabase-test.local'])
  if (existsSync(path)) loadEnvFile(path);
const env = process.env;
const clients = [];
async function login(letter) {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
  clients.push(db);
  const result = await db.auth.signInWithPassword({
    email: env[`POMINS_TEST_${letter}_EMAIL`],
    password: env[`POMINS_TEST_${letter}_PASSWORD`],
  });
  assert(!result.error, 'Test login failed');
  return db;
}
async function read(db, id) {
  const result = await db.rpc('baby_state', { p_character: id });
  assert(!result.error, 'Baby read failed');
  return result.data;
}
try {
  assert(
    env.POMINS_REMOTE_TESTS === 'development-only' &&
      env.POMINS_TEST_PROJECT_URL === env.NEXT_PUBLIC_SUPABASE_URL,
    'Confirm development project',
  );
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  let anon = false;
  try {
    anon = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch {}
  assert(key.startsWith('sb_publishable_') || anon, 'Public key required');
  const a = await login('A'),
    b = await login('B');
  const existing = await b
    .from('characters')
    .select('id')
    .eq('render_system', 'legacy')
    .is('archived_at', null)
    .maybeSingle();
  assert(!existing.error, 'Cannot inspect test character');
  let id = existing.data?.id;
  let created = false;
  if (!id) {
    const result = await b
      .rpc('create_character', {
        p_name: 'Bento Bebê',
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
      .single();
    assert(!result.error && result.data?.id, 'Cannot create test baby');
    id = result.data.id;
    created = true;
  }
  const before = await read(b, id);
  if (created)
    assert.deepEqual(before.stats.needs, {
      satiety: 75,
      hygiene: 75,
      energy: 75,
      affection: 75,
      fun: 75,
    });
  assert(
    (await a.rpc('baby_state', { p_character: id })).error,
    'Cross-account state must be denied',
  );
  const invalid = {
    requestId: randomUUID(),
    characterId: id,
    activity: 'baby_feed',
    lines: [{ sessionId: randomUUID(), minutes: 1 }],
  };
  assert(
    (await a.rpc('baby_care', { p_payload: invalid })).error,
    'Cross-account care must be denied',
  );
  assert((await b.rpc('baby_care', { p_payload: invalid })).error, 'Unknown credit must be denied');
  assert(
    (await a.from('characters').select('id').eq('id', id)).data?.length === 0,
    'Character RLS',
  );
  assert(
    (await a.from('game_events').select('id').eq('character_id', id)).data?.length === 0,
    'History RLS',
  );
  const direct = await b.from('characters').update({ needs: {} }).eq('id', id);
  assert(direct.error, 'Direct stats writes must be denied');
  assert(isDeepStrictEqual(await read(b, id), before), 'Rejected care must preserve full state');
  const out = await b.auth.signOut({ scope: 'local' });
  assert(!out.error, 'Test logout');
  const fresh = await login('B');
  assert(isDeepStrictEqual(await read(fresh, id), before), 'New login must restore the baby');
  console.log(
    JSON.stringify({
      real_auth: true,
      test_baby_created_if_absent: created,
      state_restored_after_new_login: true,
      account_isolation: true,
      history_rls: true,
      direct_write_denied: true,
      invalid_credit_rollback: true,
      minutes_spent: 0,
      successful_paid_care: false,
    }),
  );
} catch {
  console.error(
    'Validação remota do bebê não aprovada. Confira projeto, contas, migração e conexão; nenhuma credencial foi registrada.',
  );
  process.exitCode = 1;
} finally {
  await Promise.allSettled(clients.map((db) => db.auth.signOut({ scope: 'local' })));
}
