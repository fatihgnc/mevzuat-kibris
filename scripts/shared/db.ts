import postgres from 'postgres';

// Env loading lives in `./env`; it must run before DATABASE_URL is read.
import './env';

/**
 * The ingest connection. Separate from the app's: this one writes with the
 * service role and bypasses RLS (spec 6). It also runs on the GitHub Actions
 * runner rather than on Vercel — heavy work belongs on the unbilled runner
 * (spec 14.3).
 */
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error('DATABASE_URL tanımlı değil. .env.example dosyasına bakın.');
}

export const sql = postgres(url, {
  max: 4,
  idle_timeout: 30,
  connect_timeout: 15,
  prepare: false,
  // Ingest writes long text; the default timeout may not be enough (ms).
  connection: { statement_timeout: 120_000 },
});

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}

/** Records one ingest run; the error list accumulates as jsonb. */
export async function startRun(
  kind: 'daily' | 'backfill' | 'retry',
  targetYear?: number,
): Promise<number> {
  const rows = await sql<Array<{ id: string }>>`
    insert into ingest_runs (kind, target_year) values (${kind}, ${targetYear ?? null})
    returning id
  `;
  return Number(rows[0]!.id);
}

export async function finishRun(
  runId: number,
  status: 'ok' | 'failed',
  counts: { issuesSeen?: number; issuesNew?: number; recordsNew?: number },
  errors: unknown[] = [],
): Promise<void> {
  await sql`
    update ingest_runs set
      finished_at = now(),
      status = ${status},
      issues_seen = ${counts.issuesSeen ?? 0},
      issues_new = ${counts.issuesNew ?? 0},
      records_new = ${counts.recordsNew ?? 0},
      errors = ${sql.json(errors as never)}
    where id = ${runId}
  `;
}
