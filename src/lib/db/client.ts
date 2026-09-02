import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

/**
 * The read connection. Record and list pages are entirely server components
 * (spec 13), so every query goes through here.
 *
 * IT USES THE SESSION POOLER (port 5432) — the same URL as migrations and
 * ingest. Those two need session mode anyway: migrations run DDL and ingest
 * holds long transactions. This client ended up there for a different reason.
 *
 * WHY NOT THE TRANSACTION POOLER (6543), WHICH IS THE USUAL SERVERLESS ADVICE:
 * it loses responses. A query goes out, Postgres runs it and returns to `idle`
 * (confirmed in `pg_stat_activity` — no backend was still executing it, no lock,
 * nothing in `pg_blocking_pids`), but the answer never arrives. The socket stays
 * open, so postgres-js never rejects either — a connection that CLOSES does
 * reject its pending queries, and no rejection was ever logged. The query hangs
 * forever and burns a pool slot permanently.
 *
 * Measured twice, in both phases:
 *
 *   build      3.399 pages died mid-prerender on 6543; on 5432 it completed
 *              with no query even exceeding 5 s.
 *   runtime    `createAlert` in /auth/callback hung forever on 6543 (two runs,
 *              cut off at 120 s and 300 s). Changing ONLY the port to 5432 made
 *              the same work take 460 ms.
 *
 * `prepare: false` stays: it costs nothing here and keeps the transaction pooler
 * usable as a fallback if this is ever revisited.
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
 * The connection budget, against the session pooler's client ceiling.
 *
 * That ceiling is a DASHBOARD SETTING, not a law: it ships at 15 and was raised to
 * 40 (Supabase -> Database -> Connection Pooling -> Pool Size) after production
 * traffic exhausted it. Postgres itself allows 60 and was using 30 at the time, so
 * 40 leaves real headroom.
 *
 *   build     3 prerender workers (experimental.cpus in next.config.ts)
 *             x max 4  =  12 clients
 *   runtime   1 per lambda; a Vercel lambda serves one request at a time, so a
 *             bigger pool would only sit idle
 *
 * WHY THE RUNTIME SIDE CANNOT BE BUDGETED THE WAY THE BUILD SIDE CAN. The build's
 * worker count is pinned, so its usage is arithmetic. The lambda count is not ours
 * to set — Vercel scales it with traffic — and worse, a lambda is FROZEN between
 * invocations, so `idle_timeout` never fires and its client slot stays held until
 * the instance is recycled. The first budget here assumed "6 lambdas" and held for
 * exactly as long as nobody used the site: once it was live, search returned 500
 * with EMAXCONNSESSION while static pages kept serving.
 *
 * So the runtime side is bounded by the ceiling, not by this file. If EMAXCONNSESSION
 * appears again, raise Pool Size before touching anything here — and check
 * `max_connections` first, because the pooler cannot exceed it.
 */
function poolConfig(): { url: string | undefined; max: number } {
  const build = process.env.NEXT_PHASE === 'phase-production-build';
  return {
    // DATABASE_URL_POOLED is only a fallback now — see the note above. Local
    // Postgres has no pooler at all, where either name resolves to the one URL.
    url: process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED,
    max: build ? 4 : 1,
  };
}

function createClient() {
  const { url, max } = poolConfig();
  if (!url) {
    throw new Error(
      'DATABASE_URL_POOLED / DATABASE_URL tanımlı değil. .env.example dosyasına bakın; ' +
        'Supabase kullanıyorsanız uygulama transaction pooler (6543) ile bağlanmalı.',
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
