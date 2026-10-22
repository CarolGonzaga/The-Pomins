-- Run ONLY if inspect-schema.sql reports migration_history_present = true.
-- A missing/empty history does not prove migrations were never applied manually.
select version from supabase_migrations.schema_migrations order by version;
