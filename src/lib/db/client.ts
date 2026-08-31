import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

/**
 * Okuma bağlantısı. Kayıt ve liste sayfaları tamamen server component olduğu için
 * (spec 13) sorgular buradan geçiyor; RLS altında anon rolü zaten yalnızca kamu
 * tablolarını görüyor, ama ingest ve alarm işleri ayrı bir bağlantı kullanıyor
 * (scripts/shared/supabase-admin.ts).
 *
 * Vercel'de her function invocation'ı kendi lambda'sında; connection pooler
 * üzerinden bağlanıp havuzu küçük tutuyoruz. `prepare: false` Supabase'in
 * transaction pooler'ı için zorunlu.
 */
declare global {
  // eslint-disable-next-line no-var
  var __mkDb: ReturnType<typeof createClient> | undefined;
}

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL tanımlı değil. .env.example dosyasına bakın; Supabase bağlantı dizesi gerekiyor.',
    );
  }

  const sql = postgres(url, {
    max: 4,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return drizzle(sql, { schema });
}

// Dev'de hot reload her seferinde yeni havuz açmasın.
export const db = globalThis.__mkDb ?? createClient();
if (process.env.NODE_ENV !== 'production') globalThis.__mkDb = db;

export { schema };
