import { classifyMunhalKind, type MunhalKind } from '../classify/rules';
import { kindOfCategory } from '../khk-sync/circular';
import { plan } from '../khk-sync/sync';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Fills `records.munhal_kind` (migration 0027) for the commission's circulars.
 *
 * Two sources, the second wins: the title/reference classifier, then -- for every
 * circular that is also listed on khk.gov.ct.tr -- the commission's own category.
 * Disagreements between the two are logged, which doubles as a check on the
 * classifier. Records of other bodies are left NULL.
 *
 * Only fills EMPTY values unless --overwrite is given. Dry run unless --apply.
 *
 * Usage: tsx scripts/backfill-munhal-kind/index.ts [--apply] [--overwrite]
 */

interface Row {
  id: string;
  title: string;
  ref_type: string | null;
  issuer: string | null;
  munhal_kind: string | null;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const overwrite = process.argv.includes('--overwrite');

  const rows = await sql<Row[]>`
    select r.id, r.title, r.ref_type, r.issuer, r.munhal_kind
      from records r
     where r.issuer = 'khk'
       and exists (select 1 from record_topics rt where rt.record_id = r.id and rt.topic = 'munhal')
  `;

  const kinds = new Map<number, MunhalKind | null>();
  for (const row of rows) {
    kinds.set(Number(row.id), classifyMunhalKind({ title: row.title, refType: row.ref_type, issuer: 'khk' }));
  }

  const { candidates } = await plan([2022, 2023, 2024, 2025, 2026]);
  let overridden = 0;
  const disagree: string[] = [];
  for (const candidate of candidates) {
    const site = kindOfCategory(candidate.row.category);
    if (!site) continue;
    // The site files Ö.4 and Ö.5/2023 under Yükselme, a mis-filing: the Ö series is teaching posts.
    if (candidate.circular.series === 'Ö') continue;
    for (const id of candidate.matchIds) {
      if (!kinds.has(id)) continue;
      const guess = kinds.get(id);
      if (guess && guess !== site) disagree.push(`${candidate.circular.label}: classifier ${guess} / site ${site}`);
      if (guess !== site) overridden += 1;
      kinds.set(id, site);
    }
  }

  const tally: Record<string, number> = {};
  let written = 0;
  for (const row of rows) {
    const next = kinds.get(Number(row.id)) ?? null;
    tally[next ?? 'none'] = (tally[next ?? 'none'] ?? 0) + 1;
    if (!next || row.munhal_kind === next || (row.munhal_kind && !overwrite)) continue;
    written += 1;
    if (apply) await sql`update records set munhal_kind = ${next} where id = ${row.id}`;
  }

  log.info(apply ? 'munhal_kind written' : 'dry run (nothing written)', { records: rows.length, written, overridden, ...tally });
  if (disagree.length) log.info('classifier and site disagree', { items: disagree });
}

main()
  .catch((error) => {
    log.error('backfill-munhal-kind failed', { error: String(error) });
    process.exitCode = 1;
  })
  .finally(closeDb);
