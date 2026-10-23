// Disposable local test server. No credentials or connection to Supabase.
import http from 'node:http';
import { createSaveFixture } from './save-fixture.mjs';
const f = await createSaveFixture();
const commands = [];
const metadata=new Map([[f.ids.a,{nickname:'fixture_a'}],[f.ids.b,{nickname:'fixture_b'}]]);
const user = (id) => ({
  id,
  aud: 'authenticated',
  role: 'authenticated',
  email: id===f.ids.a?'fixture-a@example.test':'fixture-b@example.test',
  app_metadata: { provider: 'email' },
  user_metadata: metadata.get(id)??{},
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
      aal:'aal1',
    }),
  ).toString('base64url') +
  '.'+Buffer.from('fixture-signature').toString('base64url');
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
  // Test-only cross-origin Auth calls from the browser at localhost:3182.
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','authorization,apikey,content-type,x-client-info,x-supabase-api-version');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  const send = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  try {
    if (req.url === '/__test/info' || req.url === '/__test/info?account=b') {
      const testUser=req.url.endsWith('?account=b')?f.ids.b:f.ids.a;
      return send(200, {
        ...f.ids,
        session: {
          access_token: token(testUser),
          refresh_token: 'fixture-refresh-only',
          token_type: 'bearer',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          user: user(testUser),
        },
        commands,
      });
    }
    if(req.url?.startsWith('/auth/v1/token?grant_type=password')){
      let body='';for await(const c of req)body+=c;
      const input=JSON.parse(body),id=input.email==='fixture-a@example.test'?f.ids.a:input.email==='fixture-b@example.test'?f.ids.b:null;
      if(!id||input.password!=='fixture-current-password')return send(400,{error_code:'invalid_credentials',message:'Invalid fixture credentials'});
      commands.push('auth:reauthenticate');
      return send(200,{access_token:token(id),refresh_token:'fixture-refresh-only',token_type:'bearer',expires_in:3600,user:user(id)});
    }
    if(req.url?.startsWith('/auth/v1/recover') && req.headers.apikey==='fixture-public-key'){commands.push('auth:password-link');return send(200,{});}
    const bearer = req.headers.authorization?.split(' ')[1];
    let uid;
    try {
      uid = JSON.parse(Buffer.from(bearer.split('.')[1], 'base64url').toString()).sub;
    } catch {}
    if (![f.ids.a, f.ids.b].includes(uid))
      return send(401, { message: 'Fixture authentication required' });
    if(req.url?.startsWith('/auth/v1/logout')){commands.push('auth:logout');res.writeHead(204);return res.end();}
    if(req.url?.startsWith('/auth/v1/recover')){commands.push('auth:password-link');return send(200,{});}
    if (req.url?.split('?')[0] === '/auth/v1/user') {
      if(req.method==='PUT'){
        let body='';for await(const c of req)body+=c;
        const input=JSON.parse(body);
        if(input.data){metadata.set(uid,{...metadata.get(uid),...input.data});commands.push('auth:preferences');}
        if(input.email){commands.push('auth:email-confirmation');return send(200,{...user(uid),new_email:input.email});}
      }
      return send(200,user(uid));
    }
    if(req.url?.startsWith('/rest/v1/focus_sessions?')){
      const p=new URL(req.url,'http://fixture.test').searchParams;
      if(p.get('select')!=='id'||p.get('user_id')!=='eq.'+uid||p.get('status')!=='eq.active')return send(400,{});
      return send(200,(await f.db.query("select id from public.focus_sessions where user_id=$1 and status='active' limit 1",[uid])).rows);
    }
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
