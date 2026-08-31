import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

/*
 * Next.js .env.local'i kendisi okuyor ama tsx ile çalışan scriptler okumuyor.
 * Aynı dosyadan beslenmezlerse "uygulamada çalışıyor, ingest'te çalışmıyor"
 * sınıfında bir hata çıkıyor. Öncelik Next ile aynı: .env.local > .env
 */
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

/**
 * Ingest bağlantısı. Uygulamanınkinden ayrı: burası service role ile yazıyor
 * ve RLS'i baypas ediyor (spec 6). Ayrıca GitHub Actions runner'ında çalışıyor,
 * Vercel'de değil — ağır iş faturasız runner'da (spec 14.3).
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
  // Ingest uzun metin yazıyor; varsayılan timeout yetmeyebiliyor (ms).
  connection: { statement_timeout: 120_000 },
});

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}

/** Bir ingest çalışmasını kaydeder; hata listesi jsonb olarak birikir. */
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
