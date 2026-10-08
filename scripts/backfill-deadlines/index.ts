import { closeDb, sql } from '../shared/db';
import { extractDeadline } from '../shared/deadline';
import { log } from '../shared/logger';

/**
 * Re-derives `deadline_at` / `deadline_note` for münhal records from
 * the best body we hold: the hand/OCR transcription (`body_markdown`) first, the
 * PDF text layer (`body_text`) otherwise.
 *
 * Needed because most münhal bodies arrive after parsing (OCR), and the parser
 * only ever sees `body_text`, so those records were left without a deadline and
 * the "Başvurusu açık / Süresi dolmuş" filter matched nothing.
 *
 * Only fills EMPTY deadlines unless --overwrite is given; a stored value may have
 * been corrected by hand. Dry run by default.
 *
 * Usage: tsx scripts/backfill-deadlines/index.ts [--apply] [--overwrite]
 */

interface Row {
  id: string;
  slug: string;
  body: string | null;
  deadline_at: string | Date | null;
  deadline_note: string | null;
}

function iso(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const overwrite = process.argv.includes('--overwrite');

  const rows = await sql<Row[]>`
    select r.id, r.slug, coalesce(r.body_markdown, r.body_text) as body,
           r.deadline_at, r.deadline_note
      from records r
     where r.has_own_page
       and exists (
         select 1 from record_topics rt
          where rt.record_id = r.id and rt.topic = 'munhal'
       )
  `;

  let filled = 0;
  let changed = 0;
  let unchanged = 0;
  let still = 0;
  const touched: string[] = [];

  for (const row of rows) {
    const found = extractDeadline(row.body);
    const current = iso(row.deadline_at);

    if (!found.deadlineAt) {
      still += 1;
      continue;
    }
    if (found.deadlineAt === current) {
      unchanged += 1;
      continue;
    }
    if (current && !overwrite) {
      unchanged += 1;
      continue;
    }

    if (current) changed += 1;
    else filled += 1;
    touched.push(row.slug);

    if (apply) {
      await sql`
        update records
           set deadline_at = ${found.deadlineAt},
               deadline_note = coalesce(${found.note}, deadline_note)
         where id = ${row.id}
      `;
    }
  }

  log.info(apply ? 'deadlines written' : 'dry run (nothing written)', {
    records: rows.length,
    filled,
    changed,
    unchanged,
    stillEmpty: still,
  });
  if (!apply) log.info('re-run with --apply to write', { wouldTouch: touched.length });
}

main()
  .catch((error) => {
    log.error('backfill-deadlines failed', { error: String(error) });
    process.exitCode = 1;
  })
  .finally(closeDb);
