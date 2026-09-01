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
 * The connection budget. Everything here is arithmetic against ONE number:
 * the session pooler allows 15 clients, and that is a free-tier limit we are
 * deliberately staying inside rather than paying to raise.
 *
 *   build     3 prerender workers (experimental.cpus in next.config.ts)
 *             x max 3  =  9 clients
 *   runtime   1 per lambda; a Vercel lambda serves one request at a time, so a
 *             bigger pool would only sit idle
 *
 * The two have to be added together, not considered separately: during a deploy
 * the build runs while the PREVIOUS deployment is still serving traffic. 9 for
 * the build leaves 6 for concurrent lambdas. Most page views never reach a
 * lambda at all — record and list pages are prerendered and ISR-cached (spec
 * 11.1), so only /ara, /takip and cache misses draw from this budget.
 *
 * The cost of max 1 at runtime, stated plainly: the four queries in
 * getRecordBySlug's Promise.all are serialised, so a cache-miss render pays
 * about four round-trips instead of one. That is the trade for not failing
 * outright at the cap — latency degrades gracefully, EMAXCONNSESSION does not.
 *
 * If you raise any of these, redo the sum. If it exceeds 15 the build dies with
 * EMAXCONNSESSION and lambdas start failing to connect.
 */
function poolConfig(): { url: string | undefined; max: number } {
  const build = process.env.NEXT_PHASE === 'phase-production-build';
  return {
    // DATABASE_URL_POOLED is only a fallback now — see the note above. Local
    // Postgres has no pooler at all, where either name resolves to the one URL.
    url: process.env.DATABASE_URL || process.env.DATABASE_URL_POOLED,
    max: build ? 3 : 1,
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
