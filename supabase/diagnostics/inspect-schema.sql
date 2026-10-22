-- Read-only inspection. Run in the selected DEVELOPMENT project's SQL Editor.
-- Returns catalog metadata only: no user rows, tokens or passwords.
-- This is NOT a migration and does not repair or apply anything.
with expected(name) as (
  values ('profiles'), ('characters'), ('focus_sessions'), ('focus_events'),
    ('focus_rewards'), ('wallets'), ('character_memories'), ('households'),
    ('activities'), ('focus_credits'), ('allocation_requests'),
    ('focus_allocations'), ('game_events')
), tables as (
  select e.name, c.oid, c.relrowsecurity
  from expected e
  left join pg_namespace n on n.nspname = 'public'
  left join pg_class c on c.relnamespace = n.oid and c.relname = e.name
    and c.relkind in ('r', 'p')
)
select jsonb_build_object(
  'tables', (select jsonb_agg(jsonb_build_object(
    'name', name, 'present', oid is not null,
    'row_security', coalesce(relrowsecurity, false)
  ) order by name) from tables),
  'columns', (select coalesce(jsonb_agg(jsonb_build_object(
    'table', table_name, 'column', column_name, 'type', udt_name,
    'nullable', is_nullable, 'default', column_default
  ) order by table_name, ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema = 'public' and table_name in (select name from expected)),
  'constraints', (select coalesce(jsonb_agg(jsonb_build_object(
    'table', t.name, 'name', c.conname, 'definition', pg_get_constraintdef(c.oid)
  ) order by t.name, c.conname), '[]'::jsonb)
    from tables t join pg_constraint c on c.conrelid = t.oid),
  'indexes', (select coalesce(jsonb_agg(jsonb_build_object(
    'table', tablename, 'name', indexname, 'definition', indexdef
  ) order by tablename, indexname), '[]'::jsonb)
    from pg_indexes where schemaname = 'public'
      and tablename in (select name from expected)),
  'policies', (select coalesce(jsonb_agg(jsonb_build_object(
    'table', tablename, 'name', policyname, 'roles', roles,
    'command', cmd, 'using', qual, 'with_check', with_check
  ) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname = 'public'
      and tablename in (select name from expected)),
  'table_grants', (select coalesce(jsonb_agg(jsonb_build_object(
    'table', table_name, 'role', grantee, 'privilege', privilege_type
  ) order by table_name, grantee, privilege_type), '[]'::jsonb)
    from information_schema.table_privileges where table_schema = 'public'
      and table_name in (select name from expected)
      and grantee in ('PUBLIC', 'anon', 'authenticated')),
  'column_grants', (select coalesce(jsonb_agg(jsonb_build_object(
    'table', table_name, 'column', column_name, 'role', grantee,
    'privilege', privilege_type
  ) order by table_name, column_name, grantee, privilege_type), '[]'::jsonb)
    from information_schema.column_privileges where table_schema = 'public'
      and table_name in (select name from expected)
      and grantee in ('PUBLIC', 'anon', 'authenticated')),
  'functions', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', p.proname, 'arguments', pg_get_function_arguments(p.oid),
    'returns', pg_get_function_result(p.oid), 'security_definer', p.prosecdef,
    'settings', p.proconfig,
    'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
    'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ) order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'create_character', 'read_birth', 'focus_command', 'delete_my_account',
      'room_state', 'room_command', 'start_resident_focus'
    )),
  'triggers', (select coalesce(jsonb_agg(jsonb_build_object(
    'name', tgname, 'enabled', tgenabled, 'definition', pg_get_triggerdef(oid)
  ) order by tgname), '[]'::jsonb)
    from pg_trigger where not tgisinternal and tgname in (
      'on_auth_user_created', 'profile_household', 'character_household',
      'completed_focus_credit'
    )),
  'migration_history_present', to_regclass('supabase_migrations.schema_migrations') is not null
) as inspection;
