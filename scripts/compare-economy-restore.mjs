// Disposable PostgreSQL restore check. Never accepts Supabase/production endpoints.
import pg from 'pg';
import { createHash } from 'node:crypto';
const source = process.env.POMINS_FOUNDATION_TEST_DATABASE_URL;
const restored = process.env.POMINS_FOUNDATION_RESTORE_DATABASE_URL;
function validate(value, name) {
  if (!value) throw Error('A dedicated loopback test database is required.');
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/' + name)
    throw Error('Refusing a non-disposable restore target.');
}
validate(source, 'pomins_foundation_test');
validate(restored, 'pomins_foundation_restore');
async function fingerprint(connectionString) {
  const db = new pg.Client({ connectionString });
  await db.connect();
  try {
    const tables = (
      await db.query(
        "select schemaname,tablename from pg_tables where schemaname in ('public','game_private','auth') order by 1,2",
      )
    ).rows;
    const data = {};
    for (const { schemaname, tablename } of tables) {
      if (!/^[a-z_]+$/.test(schemaname + tablename)) throw Error('Unexpected fixture identifier');
      data[schemaname + '.' + tablename] = (
        await db.query(
          `select to_jsonb(t) data from ${schemaname}.${tablename} t order by to_jsonb(t)::text`,
        )
      ).rows;
    }
    data.policies = (
      await db.query(
        "select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname in ('public','game_private') order by 1,2,3",
      )
    ).rows;
    data.rls = (
      await db.query(
        "select n.nspname,c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and n.nspname in ('public','game_private') order by 1,2",
      )
    ).rows;
    data.constraints = (
      await db.query(
        "select n.nspname,t.relname,c.conname,pg_get_constraintdef(c.oid) definition from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname in ('public','game_private','auth') order by 1,2,3",
      )
    ).rows;
    data.functions = (
      await db.query(
        "select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition,p.proacl::text permissions from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','game_private','auth') order by 1,2,3",
      )
    ).rows;
    data.grants = (
      await db.query(
        "select n.nspname,c.relname,pg_get_userbyid(a.grantor) grantor,case when a.grantee=0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end grantee,a.privilege_type,a.is_grantable from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.relkind='r' and n.nspname in ('public','game_private','auth') order by 1,2,3,4,5,6",
      )
    ).rows;
    data.triggers = (
      await db.query(
        "select n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','game_private','auth') order by 1,2,3",
      )
    ).rows;
    return {
      tables: tables.length,
      hash: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
      sections: Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          createHash('sha256').update(JSON.stringify(value)).digest('hex'),
        ]),
      ),
    };
  } finally {
    await db.end();
  }
}
const a = await fingerprint(source),
  b = await fingerprint(restored);
if (a.hash !== b.hash)
  throw Error(
    'Restored fixture differs in: ' +
      Object.keys(a.sections)
        .filter((key) => a.sections[key] !== b.sections[key])
        .join(', '),
  );
console.log(JSON.stringify({ restoreVerified: true, tables: a.tables, sha256: a.hash }));
