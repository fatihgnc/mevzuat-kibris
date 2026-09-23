import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

/**
 * The read connection. Record and list pages are entirely server components
 * (spec 13), so every query goes through here.
 *
 * Production is a plain Postgres 17 on the same VPS as the app (container
 * `mevzuat-db`, see /opt/mevzuat-db on the server), no pooler in between. The
 * Supabase-era notes about session vs transaction poolers are in git history.
 *
 * `prepare: false` stays: it costs nothing here and keeps a transaction pooler
 * usable if one is ever put in front again.
 */
declare global {
  // eslint-disable-next-line no-var
  var __mkDb: ReturnType<typeof createClient> | undefined;
}

/**
 * The connection budget, against Postgres' max_connections (60 on the VPS).
 *
 *   build     3 prerender workers (experimental.cpus in next.config.ts)
 *             x max 4  =  12 clients
 *   runtime   one long-lived Node process serves every request, so the pool
 *             must be big enough for concurrent requests; 10 leaves room for the
 *             build of the next deploy and the GitHub Actions jobs.
 */
function poolConfig(): { url: string | undefined; max: number } {
  const build = process.env.NEXT_PHASE === 'phase-production-build';
  return {
    // DATABASE_URL_POOLED is only a fallback for older env files.
    url: process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED,
    max: build ? 4 : 10,
  };
}

function createClient() {
  const { url, max } = poolConfig();
  if (!url) {
    throw new Error(
      'DATABASE_URL tanımlı değil. .env.example dosyasına bakın.',
    );
  }

  const sql = postgres(url, {
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  return drizzle(sql, { schema });
}

// Stop hot reload from opening a new pool on every change in dev.
export const db = globalThis.__mkDb ?? createClient();
if (process.env.NODE_ENV !== 'production') globalThis.__mkDb = db;

export { schema };
