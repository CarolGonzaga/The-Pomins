// Opt-in real Auth/RLS reads. Never creates characters, focus, credits or allocations.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServerClient } from '@supabase/ssr';
const clients = [];
const passed = [];
for (const file of ['.env.local', '.env.supabase-test.local'])
  if (fs.existsSync(file)) process.loadEnvFile(file);
const env = process.env;
const pass = (name) => { passed.push(name); console.log('APROVADO: ' + name); };
const checked = (r) => { assert(!r.error, 'Remote read failed'); return r.data; };
async function login(letter) {
  const jar = new Map();
  const db = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  });
  clients.push(db);
  const auth = await db.auth.signInWithPassword({ email: env[`POMINS_TEST_${letter}_EMAIL`], password: env[`POMINS_TEST_${letter}_PASSWORD`] });
  assert(!auth.error && auth.data.user, 'Test login failed');
  return { db, jar, userId: auth.data.user.id };
}
try {
  assert(env.POMINS_REMOTE_TESTS === 'development-only' && env.POMINS_TEST_PROJECT_URL === env.NEXT_PUBLIC_SUPABASE_URL && new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname === 'ogzgfkxhxdrwemdzxskg.supabase.co', 'Development opt-in required');
  const a = await login('A'), b = await login('B');
  pass('login real das duas contas de teste');
  const ca = checked(await a.db.rpc('get_game_context')), cb = checked(await b.db.rpc('get_game_context'));
  assert(ca.save.id !== cb.save.id && ca.save.user_id === a.userId && cb.save.user_id === b.userId);
  pass('contextos independentes e proprietário validado');
  const savesA = checked(await a.db.from('game_saves').select('id,user_id'));
  assert(savesA.length === 1 && savesA.every(s => s.user_id === a.userId));
  assert(checked(await a.db.from('game_saves').select('id').eq('id', cb.save.id)).length === 0);
  assert((await a.db.rpc('get_game_context', { p_save: cb.save.id })).error);
  assert((await a.db.rpc('room_state_for_save', { p_save: cb.save.id })).error);
  pass('RLS e RPCs recusam a partida da outra conta');
  for (const [account, context] of [[a, ca], [b, cb]]) {
    const scoped = checked(await account.db.rpc('room_state_for_save', { p_save: context.save.id }));
    const legacy = checked(await account.db.rpc('room_state'));
    assert(scoped.save_id === context.save.id && legacy.save_id === context.save.id);
    assert.deepEqual(scoped.residents, legacy.residents);
    assert.deepEqual(scoped.credits, legacy.credits);
    assert(legacy.revision === legacy.world_revision + legacy.focus_revision);
    assert(scoped.residents.every(c => c.save_id === context.save.id));
    assert(scoped.residents.every(c => c.appearance && Object.keys(c.appearance).length));
  }
  pass('quarto e aparência restaurados pelas RPCs novas e antigas');
  const babies = checked(await b.db.from('characters').select('id,save_id').eq('render_system', 'legacy').is('archived_at', null));
  assert(babies.length === 1 && babies[0].save_id === cb.save.id);
  const baby = checked(await b.db.rpc('baby_state_for_save', { p_save: cb.save.id, p_character: babies[0].id }));
  const legacyBaby = checked(await b.db.rpc('baby_state', { p_character: babies[0].id }));
  assert(baby.save_id === cb.save.id && legacyBaby.save_id === cb.save.id);
  assert((await a.db.rpc('baby_state_for_save', { p_save: cb.save.id, p_character: babies[0].id })).error);
  assert(checked(await a.db.from('characters').select('id').eq('id', babies[0].id)).length === 0);
  pass('bebê restaurado e isolado da outra conta');
  const origin = env.POMINS_TEST_SSR_ORIGIN;
  if (origin) {
    const url = new URL(origin);
    assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.port === '3156', 'Isolated SSR server required');
    for (const [account, context] of [[a, ca], [b, cb]]) for (const route of ['/', '/play']) {
      const cookie = [...account.jar].map(([k, v]) => k + '=' + v).join('; ');
      const response = await fetch(new URL(route, origin), { headers: { cookie }, signal: AbortSignal.timeout(20000) });
      const html = await response.text();
      assert(response.status === 200 && html.includes(context.save.id), 'Authenticated SSR context missing');
    }
    pass('cookies SSR e rotas / e /play com as duas contas reais');
  }
  const result = { checked_at: new Date().toISOString(), environment: 'real-supabase-development-auth', passed, game_writes: false, focus_sessions_created: 0, minutes_spent: 0, browser_sessions_untouched: true };
  fs.mkdirSync('.cache/game-saves', { recursive: true });
  fs.writeFileSync('.cache/game-saves/real-auth-validation.json', JSON.stringify(result, null, 2) + '\n');
} catch {
  console.error('A validação remota não concluiu. Nenhuma credencial foi registrada.');
  process.exitCode = 1;
} finally {
  for (const db of clients) await db.auth.signOut({ scope: 'local' }).catch(() => {});
}
