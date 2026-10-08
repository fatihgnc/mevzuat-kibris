import { classifyIssuer } from '../classify/rules';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';
import type { DocType } from '../../src/lib/constants/doc-types';

/**
 * Fills `records.issuer` (khk / diger) for the vacancy notices, from the best body
 * we hold: the transcription (`body_markdown`) first, the PDF text layer otherwise.
 *
 * Needed once for the records that predate migration 0025, and again whenever a
 * body arrives after parsing (OCR, hand transcription) — the parser only sees
 * `body_text`, so those records are left undecided at ingest.
 *
 * Only fills EMPTY values unless --overwrite is given. Dry run by default.
 *
 * Usage: tsx scripts/backfill-issuer/index.ts [--apply] [--overwrite]
 */

interface Row {
  id: string;
  title: string;
  doc_type: string;
  body: string | null;
  issuer: string | null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const overwrite = process.argv.includes('--overwrite');

  const rows = await sql<Row[]>`
    select r.id, r.title, r.doc_type, coalesce(r.body_markdown, r.body_text) as body, r.issuer
      from records r
     where exists (
       select 1 from record_topics rt where rt.record_id = r.id and rt.topic = 'munhal'
     )
  `;

  const tally = { khk: 0, diger: 0, undecided: 0, unchanged: 0 };
  for (const row of rows) {
    const next = classifyIssuer({
      title: row.title,
      docType: row.doc_type as DocType,
      bodyText: row.body,
    });

    if (!next) {
      tally.undecided += 1;
      continue;
    }
    if (row.issuer === next || (row.issuer && !overwrite)) {
      tally.unchanged += 1;
      continue;
    }

    tally[next] += 1;
    if (apply) await sql`update records set issuer = ${next} where id = ${row.id}`;
  }

  log.info(apply ? 'issuer written' : 'dry run (nothing written)', { records: rows.length, ...tally });
}

main()
  .catch((error) => {
    log.error('backfill-issuer failed', { error: String(error) });
    process.exitCode = 1;
  })
  .finally(closeDb);
