import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Migration runner.
 *
 * The hand-written SQL files are the authority (drizzle-kit is only used for
 * diff checking). Generated columns, GIN indexes, the text search configuration
 * and RLS policies are things drizzle-kit cannot produce; they all live under
 * supabase/migrations.
 *
 * If you use the Supabase CLI you do not need this; it exists for local Postgres
 * and CI.
 */
const DIR = join(process.cwd(), 'supabase', 'migrations');

async function main() {
  const reset = process.argv.includes('--reset');

  if (reset) {
    log.warn('şema sıfırlanıyor (--reset)');
    await sql.unsafe('drop schema if exists public cascade; create schema public;');
    await sql.unsafe('drop schema if exists auth cascade;');
  }

  /*
   * On Supabase the auth schema and auth.uid() come ready-made. Local Postgres
   * has neither, so the RLS policies (0006) cannot be installed. What follows is
   * a shim for local development and CI ONLY: auth.uid() returns null, so no
   * user rows are visible under the anon role.
   *
   * IT MUST BE SKIPPED ENTIRELY ON SUPABASE, and `create ... if not exists` is
   * NOT enough to make that safe. This block used to run unconditionally, on the
   * assumption that "the objects already exist, so it is a no-op". Running it
   * against a real Supabase project failed on the first try:
   *
   *   permission denied for schema auth
   *
   * `create table if not exists` still requires CREATE on the schema even when
   * the table is already there, and on Supabase `auth` belongs to
   * `supabase_auth_admin`, not to `postgres`. So we probe for the table and only
   * build the shim where it is genuinely missing.
   */
  const hasAuthUsers = await sql<Array<{ present: boolean }>>`
    select exists (
      select 1 from information_schema.tables
       where table_schema = 'auth' and table_name = 'users'
    ) as present
  `;

  if (!hasAuthUsers[0]?.present) {
    log.warn('auth.users yok, yerel gölge kuruluyor (yalnızca geliştirme)');
    await sql.unsafe(`
      create schema if not exists auth;
      create table if not exists auth.users (
        id uuid primary key default gen_random_uuid(),
        email text
      );
    `);
  }

  const hasAuthUid = await sql<Array<{ present: boolean }>>`
    select exists (
      select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'auth' and p.proname = 'uid'
    ) as present
  `;

  if (!hasAuthUid[0]?.present) {
    log.warn('auth.uid() yok, yerel gölge kuruluyor (yalnızca geliştirme)');
    await sql.unsafe(`
      create or replace function auth.uid() returns uuid
      language sql stable as $$ select null::uuid $$;
    `);
  }

  const files = readdirSync(DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    log.info('migration calistiriliyor', { file });
    await sql.unsafe(readFileSync(join(DIR, file), 'utf8'));
  }

  log.info('migration tamam', { count: files.length });
}

main()
  .catch((error) => {
    log.error('migration basarisiz', { message: String(error) });
    process.exitCode = 1;
  })
  .finally(() => closeDb());
