// Builds/tests an isolated copy against disposable SQL and simulated Auth only.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
const root = process.cwd(),
  target = path.resolve('.cache/explicit-save-validation');
let gateway;
async function run(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env, stdio: 'inherit', windowsHide: true });
  const status = await new Promise((ok, no) => {
    child.on('error', no);
    child.on('exit', ok);
  });
  if (status !== 0) throw Error('Validation command failed');
}
async function portFree(port) {
  await new Promise((ok, no) => {
    const server = net.createServer();
    server.once('error', no);
    server.listen(port, '127.0.0.1', () => server.close(ok));
  });
}
try {
  await portFree(3181);
  await portFree(3182);
  fs.mkdirSync(target, { recursive: true });
  for (const name of [
    'src',
    'public',
    'tests',
    'supabase',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'next.config.mjs',
    'postcss.config.mjs',
    'playwright.config.ts',
    'vitest.config.ts',
    'eslint.config.mjs',
  ])
    fs.cpSync(path.join(root, name), path.join(target, name), { recursive: true, force: true });
  const env = {
    ...process.env,
    CI: '1',
    NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3181',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3182',
    POMINS_SAVE_FIXTURE_ORIGIN: 'http://127.0.0.1:3181',
    POMINS_TEST_PORT: '3182',
    POMINS_TEST_SERVER_MODE: 'production',
  };
  gateway = spawn(process.execPath, ['tests/support/save-gateway.mjs'], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'inherit'],
    windowsHide: true,
  });
  await new Promise((ok, no) => {
    gateway.on('error', no);
    gateway.once('exit', () => no(Error('Fixture failed to start')));
    gateway.stdout.on('data', (b) => {
      if (b.toString().includes('fixture ready')) ok();
    });
  });
  await run([path.join(root, 'node_modules/next/dist/bin/next'), 'build'], target, env);
  await run([path.join(root, 'node_modules/@playwright/test/cli.js'), 'test','--workers=2'], target, env);
} catch (e) {
  console.error(
    e.message === 'Validation command failed'
      ? e.message
      : 'Local fixture could not start; check that ports 3181/3182 are available.',
  );
  process.exitCode = 1;
} finally {
  gateway?.kill();
}
