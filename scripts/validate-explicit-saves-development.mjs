// Real development Auth/RLS/SSR validation. Never chooses a protagonist or spends focus.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createServerClient } from '@supabase/ssr';
for (const file of ['.env.local', '.env.supabase-test.local'])
  if (fs.existsSync(file)) process.loadEnvFile(file);
const env = process.env,
  clients = [],
  passed = [];
const pass = (name) => {
  passed.push(name);
  console.log('APROVADO: ' + name);
};
const checked = (r) => {
  assert(!r.error, 'Authenticated read failed');
  return r.data;
};
async function login(letter) {
  const jar = new Map();
  const db = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { autoRefreshToken: false, detectSessionInUrl: false },
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (values) => values.forEach(({ name, value }) => jar.set(name, value)),
      },
      global: {
        fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(20000) }),
      },
    },
  );
  clients.push(db);
  const r = await db.auth.signInWithPassword({
    email: env[`POMINS_TEST_${letter}_EMAIL`],
    password: env[`POMINS_TEST_${letter}_PASSWORD`],
  });
  assert(!r.error && r.data.user, 'Development login failed');
  return { db, jar, userId: r.data.user.id };
}
try {
  assert(
    env.POMINS_REMOTE_TESTS === 'development-only' &&
      env.POMINS_TEST_PROJECT_URL === env.NEXT_PUBLIC_SUPABASE_URL &&
      new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname === 'ogzgfkxhxdrwemdzxskg.supabase.co',
    'Development opt-in required',
  );
  const a = await login('A'),
    b = await login('B');
  pass('login real A/B e cookies SSR');
  const ca = checked(await a.db.rpc('get_game_context')),
    cb = checked(await b.db.rpc('get_game_context'));
  const x = checked(await a.db.rpc('load_game_save', { p_save: ca.save.id })),
    y = checked(await b.db.rpc('load_game_save', { p_save: cb.save.id }));
  for (const [account, data] of [
    [a, x],
    [b, y],
  ]) {
    const save = data.context.save;
    assert(save.user_id === account.userId);
    assert(data.household.save_id === save.id);
    assert(data.characters.every((c) => c.user_id === account.userId && c.save_id === save.id));
    assert(
      [...data.memories, ...data.events].every(
        (e) => e.user_id === account.userId && e.save_id === save.id,
      ),
    );
  }
  pass('carregamento de residência, moradores e histórico isolados');
  assert(
    x.room.residents.length &&
      y.characters.some((c) => c.render_system === 'lpc') &&
      y.characters.some((c) => c.render_system === 'legacy'),
  );
  pass('adultos e bebê existentes restaurados sem criação');
  assert((await a.db.rpc('load_game_save', { p_save: cb.save.id })).error);
  assert(checked(await a.db.from('game_saves').select('id').eq('id', cb.save.id)).length === 0);
  assert(
    (
      await a.db.rpc('select_save_protagonist', {
        p_save: cb.save.id,
        p_character: y.characters[0].id,
        p_expected_revision: y.context.save.world_revision,
      })
    ).error,
  );
  pass('acesso e seleção de outra conta recusados sem efeitos');
  const origin = env.POMINS_TEST_SSR_ORIGIN;
  assert(
    origin && ['127.0.0.1','localhost'].includes(new URL(origin).hostname) && ['3183','3000'].includes(new URL(origin).port),
    'Use the controlled local server on 3000 or isolated SSR server on 3183',
  );
  const read = async (account, route) => {
    const cookie = [...account.jar].map(([k, v]) => k + '=' + v).join('; ');
    return fetch(new URL(route, origin), {
      headers: { cookie },
      signal: AbortSignal.timeout(25000),
    });
  };
  for (const [account, data] of [
    [a, x],
    [b, y],
  ]) {
    const response = await read(account, '/api/game-saves/' + data.context.save.id);
    assert(response.status === 200);
    const loaded = await response.json();
    assert(
      loaded.userId === account.userId && loaded.data.context.save.id === data.context.save.id,
    );
    const page = await read(account, '/game/' + data.context.save.id),
      html = await page.text();
    assert(page.status === 200);
    assert(
      data.context.save.state === 'ready'
        ? html.includes(data.context.save.id)
        : html.includes('Quem protagoniza esta história?'),
    );
    for (const legacy of ['/', '/play']) assert((await read(account, legacy)).status === 200);
  }
  pass('páginas e endpoint SSR por save; / e /play preservados');
  const forbidden = await read(a, '/api/game-saves/' + cb.save.id);
  assert(forbidden.status === 404);
  const wrongResident = await read(a, `/game/${ca.save.id}?character=${y.characters[0].id}`);
  assert((await wrongResident.text()).includes('Morador indisponível'));
  pass('endpoint alheio e URL de morador incompatível bloqueados');
  const afterA = checked(await a.db.rpc('load_game_save', { p_save: ca.save.id })),
    afterB = checked(await b.db.rpc('load_game_save', { p_save: cb.save.id }));
  for (const [before, after] of [
    [x, afterA],
    [y, afterB],
  ]) {
    assert.deepEqual(after.sessions, before.sessions);
    assert.deepEqual(after.room.credits, before.room.credits);
    assert.equal(after.context.save.protagonist_id, before.context.save.protagonist_id);
    assert.equal(after.context.save.world_revision, before.context.save.world_revision);
  }
  pass('sessões, saldo, revisão e protagonistas inalterados');
  const result = {
    checked_at: new Date().toISOString(),
    environment: 'real-supabase-development-auth',
    passed,
    protagonist_chosen: false,
    focus_commands: 0,
    minutes_spent: 0,
    characters_created: 0,
    browser_sessions_untouched: true,
  };
  fs.mkdirSync('.cache/explicit-save-development', { recursive: true });
  fs.writeFileSync(
    '.cache/explicit-save-development/auth-validation.json',
    JSON.stringify(result, null, 2) + '\n',
  );
} catch {
  console.error('Validação 5C incompleta; nenhum dado privado foi registrado.');
  process.exitCode = 1;
} finally {
  for (const db of clients) await db.auth.signOut({ scope: 'local' }).catch(() => {});
}
