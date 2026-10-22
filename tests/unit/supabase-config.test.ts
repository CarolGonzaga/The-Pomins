import { it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

// Deliberately unsigned local fixtures; never used for requests or app .env files.
const fixtureJwt = (role: string) =>
  `${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.fixture`;
const loadConfig = (key: string) =>
  execFileSync(
    process.execPath,
    ['--input-type=module', '-e', "await import('./next.config.mjs')"],
    {
      cwd: process.cwd(),
      env: { ...process.env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key },
      stdio: 'pipe',
      windowsHide: true,
    },
  );

it.each([
  ['guest mode', ''],
  ['publishable key format', 'sb_publishable_local_fixture'],
  ['legacy anon format', fixtureJwt('anon')],
])('keeps %s available', (_name, key) => {
  expect(() => loadConfig(key)).not.toThrow();
});

it.each([
  ['secret', 'sb_secret_local_fixture'],
  ['service_role', fixtureJwt('service_role')],
])('blocks %s before bundling without printing the key', (_name, key) => {
  let output = '';
  try {
    loadConfig(key);
  } catch (error) {
    output = String((error as { stderr?: Buffer }).stderr ?? '');
  }
  expect(output).toContain('Chave Supabase privilegiada');
  expect(output).not.toContain(key);
});
