// Disposable local test server. No credentials or connection to Supabase.
import http from 'node:http';
import { createSaveFixture } from './save-fixture.mjs';
const f = await createSaveFixture();
const commands = [];
const user = (id) => ({
  id,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'fixture@example.test',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-10-22T00:00:00Z',
});
const token = (id) =>
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') +
  '.' +
  Buffer.from(
    JSON.stringify({
      sub: id,
      exp: Math.floor(Date.now() / 1000) + 3600,
      aud: 'authenticated',
      role: 'authenticated',
    }),
  ).toString('base64url') +
  '.fixture-signature';
const rpcNames = new Set([
  'load_game_save',
  'get_game_context',
  'room_state_for_save',
  'room_state',
  'baby_state',
  'baby_state_for_save',
  'select_save_protagonist',
  'room_command_for_save',
  'baby_care_for_save',
  'list_game_saves',
  'create_game_save',
  'set_game_save_archived',
  'create_character_for_save',
  'read_birth_for_save',
]);
const server = http.createServer(async (req, res) => {
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  try {
    if (req.url === '/__test/info')
      return send(200, {
        ...f.ids,
        session: {
          access_token: token(f.ids.a),
          refresh_token: 'fixture-refresh-only',
          token_type: 'bearer',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          user: user(f.ids.a),
        },
        commands,
      });
    const bearer = req.headers.authorization?.split(' ')[1];
    let uid;
    try {
      uid = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()).sub;
    } catch {}
    if (![f.ids.a, f.ids.b].includes(uid))
      return send(401, { message: 'Fixture authentication required' });
    if (req.url === '/auth/v1/user') return send(200, user(uid));
    const name = req.url?.split('?')[0].split('/rest/v1/rpc/')[1];
    if (!rpcNames.has(name))
      return send(404, { code: 'PGRST202', message: 'Unsupported fixture endpoint' });
    let body = '';
    for await (const c of req) body += c;
    const args = JSON.parse(body || '{}');
    if (Object.keys(args).some((k) => !/^p_[a-z_]+$/.test(k))) return send(400, {});
    commands.push(name);
    return send(200, await f.rpc(uid, name, args));
  } catch (e) {
    return send(409, { code: e.code ?? 'P0001', message: 'Fixture command rejected' });
  }
});
server.listen(3181, '127.0.0.1', () => console.log('Disposable save fixture ready on 3181'));
process.on('SIGTERM', () => server.close(() => f.db.close().then(() => process.exit())));
