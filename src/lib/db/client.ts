import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

/**
 * The read connection. Record and list pages are entirely server components
 * (spec 13), so every query goes through here.
 *
 * IT USES THE TRANSACTION POOLER, not the same URL as migrations and ingest.
 * Those two need session mode: migrations run DDL, ingest holds long
 * transactions. The app needs the opposite — many short-lived connections, one
 * per lambda on Vercel — and Supabase's session pooler caps that at 15 clients.
 *
 * That cap is not theoretical. Pointing this client at the session pooler made
 * `next build` fail outright, because prerendering 3,399 pages runs ~8 workers
 * that each open their own pool:
 *
 *   (EMAXCONNSESSION) max clients reached in session mode
 *                     max clients are limited to pool_size: 15
 *
 * So `DATABASE_URL_POOLED` (port 6543) is preferred and `DATABASE_URL` is only a
 * fallback — for local Postgres, where one URL serves everything and there is no
 * pooler at all. `prepare: false` is what transaction mode requires; it is not
 * optional.
 *
 * BUILD IS THE EXCEPTION — IT USES SESSION MODE. See `poolUrl()` below.
 *
 * RLS NOTE — do not rely on it here. This connects as the `postgres` role, which
 * has `rolbypassrls = true`, so the policies in migration 0006 never apply to
 * these queries. Ownership of user-scoped rows is enforced by the queries
 * themselves (`and user_id = ...` in queries/alerts.ts). RLS currently only
 * guards direct access through the anon key, which the app does not use for data.
 */
declare global {
  // eslint-disable-next-line no-var
  var __mkDb: ReturnType<typeof createClient> | undefined;
}

/**
 * Which URL to connect on. Runtime and build want OPPOSITE poolers.
 *
 * Runtime (Vercel): the transaction pooler, for the reason above — many
 * short-lived lambdas against a 15-client session cap.
 *
 * Build (`next build`): the SESSION pooler. Measured, not guessed. Prerendering
 * against the transaction pooler loses responses: a query is sent, Postgres runs
 * it and goes `idle` (confirmed in `pg_stat_activity` — no backend was still
 * executing it), but the answer never reaches postgres-js. The socket stays open,
 * so postgres-js never rejects — a connection that closes DOES reject its pending
 * queries, and no rejection was ever logged. The query hangs forever and burns one
 * of the four pool slots permanently. Next kills the page at 60 s, retries it on a
 * surviving slot (which is why the same page can fail once and pass next time, and
 * why the failing page looked random and data-independent), and once enough slots
 * are gone the build dies. Two full single-worker runs failed this way; the same
 * build on the session pooler produced 3.399/3.399 pages with no query even
 * exceeding 5 s.
 *
 * The session pooler's 15-client cap is what `experimental.cpus: 1` in
 * next.config.ts is for — it pins the build to one prerender worker, so the build
 * opens ~8 clients instead of the ~32 that blew the cap before. The two settings
 * are one decision; changing either alone breaks the build.
 */
function poolUrl(): string | undefined {
  const build = process.env.NEXT_PHASE === 'phase-production-build';
  return build
    ? process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED
    : process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
}

function createClient() {
  const url = poolUrl();
  if (!url) {
    throw new Error(
      'DATABASE_URL_POOLED / DATABASE_URL tanımlı değil. .env.example dosyasına bakın; ' +
        'Supabase kullanıyorsanız uygulama transaction pooler (6543) ile bağlanmalı.',
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

// Stop hot reload from opening a new pool on every change in dev.
export const db = globalThis.__mkDb ?? createClient();
if (process.env.NODE_ENV !== 'production') globalThis.__mkDb = db;

export { schema };
