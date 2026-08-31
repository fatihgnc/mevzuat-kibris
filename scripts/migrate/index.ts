import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Migration çalıştırıcı.
 *
 * Elle yazılmış SQL dosyaları otorite (drizzle-kit yalnızca diff kontrolü için).
 * Generated column, GIN indeksleri, text search configuration ve RLS politikaları
 * drizzle-kit'in üretemediği şeyler; hepsi supabase/migrations altında.
 *
 * Supabase CLI kullanıyorsanız buna ihtiyaç yok; bu, yerel Postgres ve CI için.
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
   * Supabase'de auth şeması ve auth.uid() hazır gelir. Yerel Postgres'te yok,
   * o yüzden RLS politikaları (0006) kurulamıyor. Aşağısı YALNIZCA yerel
   * geliştirme ve CI için bir gölge: auth.uid() null döndürüyor, yani anon
   * rolüyle hiçbir kullanıcı satırı görünmüyor. Supabase'de bu bloğun etkisi
   * yok, çünkü nesneler zaten var (create if not exists / or replace).
   */
  await sql.unsafe(`
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text
    );
  `);

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
