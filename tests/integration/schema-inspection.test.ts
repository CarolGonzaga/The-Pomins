import { it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

it('inspects empty, foundation and complete schemas using a read-only transaction', async () => {
  const db = new PGlite();
  const query = readFileSync('supabase/diagnostics/inspect-schema.sql', 'utf8');
  type Inspection = {
    tables: { name: string; present: boolean; row_security: boolean }[];
    functions: { name: string; security_definer: boolean; anon_execute: boolean }[];
    indexes: { name: string }[];
    triggers: { name: string }[];
    migration_history_present: boolean;
  };
  const inspect = async () => {
    await db.exec('begin read only');
    try {
      const result = await db.query<{ inspection: Inspection }>(query);
      return result.rows[0]?.inspection;
    } finally {
      await db.exec('rollback');
    }
  };
  try {
    // Minimal local Auth fixture: this does not run GoTrue or validate real JWTs.
    await db.exec(`create role anon nologin; create role authenticated nologin;
      create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb not null default '{}');
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
    const empty = await inspect();
    expect(empty?.tables).toHaveLength(13);
    expect(empty?.tables.every((table) => !table.present)).toBe(true);
    expect(empty?.functions).toEqual([]);
    expect(empty?.migration_history_present).toBe(false);

    await db.exec(readFileSync('supabase/migrations/202610160001_foundation.sql', 'utf8'));
    expect((await inspect())?.tables.filter((table) => table.present)).toHaveLength(7);

    await db.exec(readFileSync('supabase/migrations/202610210001_playable_room.sql', 'utf8'));
    const complete = await inspect();
    expect(complete?.tables.every((table) => table.present && table.row_security)).toBe(true);
    expect(complete?.functions).toHaveLength(7);
    expect(complete?.functions.every((fn) => fn.security_definer && !fn.anon_execute)).toBe(true);
    expect(complete?.triggers).toHaveLength(4);
    expect(complete?.indexes.some((index) => index.name === 'one_legacy_life')).toBe(true);
    expect(complete?.indexes.some((index) => index.name === 'one_playable_life')).toBe(false);
    // SQL applied manually can be present even when the CLI history table is absent.
    expect(complete?.migration_history_present).toBe(false);
  } finally {
    await db.close();
  }
});
