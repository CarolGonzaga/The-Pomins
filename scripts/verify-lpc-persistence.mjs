// Read-only remote verification after saving the selected appearance in the app.
// Uses the existing, ignored development test configuration; never prints credentials.
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';

for (const file of ['.env.local', '.env.supabase-test.local'])
  if (existsSync(file)) loadEnvFile(file);
const env = process.env;
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};
const clients = [];
async function connect() {
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
  clients.push(db);
  const auth = await db.auth.signInWithPassword({
    email: env.POMINS_TEST_B_EMAIL,
    password: env.POMINS_TEST_B_PASSWORD,
  });
  check(!auth.error, 'Não foi possível autenticar a conta de teste B');
  return db;
}
async function read(db) {
  const result = await db.rpc('room_state');
  check(!result.error, 'Não foi possível restaurar o quarto');
  return result.data;
}
try {
  check(
    env.POMINS_REMOTE_TESTS === 'development-only' &&
      env.POMINS_TEST_PROJECT_URL === env.NEXT_PUBLIC_SUPABASE_URL,
    'Confirme o projeto de desenvolvimento no arquivo local de testes',
  );
  check(
    env.POMINS_TEST_B_EMAIL && env.POMINS_TEST_B_PASSWORD,
    'Preencha a conta de teste B no arquivo local ignorado',
  );
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  let anon = false;
  try {
    anon = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
  } catch {}
  check(key.startsWith('sb_publishable_') || anon, 'Use somente chave pública publishable ou anon');
  const first = await connect();
  const before = await read(first);
  const resident = before.residents[0];
  check(
    resident?.appearance.visual?.version === 2 &&
      resident.appearance.visual.hair === 'wavy' &&
      resident.appearance.visual.top === 'sleeveless' &&
      resident.appearance.visual.pantsColor === '#746b8b' &&
      resident.appearance.hairColor === '#739b9a' &&
      resident.appearance.eyeColor === '#aa794b',
    'A aparência de verificação precisa ser salva primeiro pela interface',
  );
  const signedOut = await first.auth.signOut({ scope: 'local' });
  check(!signedOut.error, 'Logout da conexão de teste falhou');
  const second = await connect();
  const restored = await read(second);
  check(isDeepStrictEqual(restored, before), 'O quarto ou a aparência mudou após novo login');
  console.log(
    JSON.stringify({
      remote_appearance_restored: true,
      visual_version: 2,
      layers_preserved: true,
      progress_balance_activity_unchanged: true,
      fresh_password_login: true,
      database_writes: 0,
    }),
  );
} catch {
  console.error(
    'Verificação LPC remota não aprovada; confira configuração, aparência selecionada e conexão. Nenhuma credencial foi registrada.',
  );
  process.exitCode = 1;
} finally {
  await Promise.allSettled(clients.map((db) => db.auth.signOut({ scope: 'local' })));
}
