import { extractEntities, type ExtractedEntity } from './extractor';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * RECOMPUTES entity links from the stored title and body_text.
 *
 * Why a separate script: entity extraction only ever ran once, at ingest time,
 * with whatever the extractor's matching rules were then. A fix to the matching
 * logic (see extractor.ts's whitespace-collapse comment -- pdftotext's
 * "Bakanlar  Kurulu" double-space beat a plain .includes() check) never reaches
 * a record that has already been written, because nothing re-runs extraction
 * afterward. This is the reclassify.ts pattern (scripts/reclassify/index.ts)
 * applied to entities instead of doc_type/topics: read what's already stored,
 * recompute, write only what changed. No network, no re-crawl.
 *
 * Usage: tsx scripts/extract-entities/backfill.ts [--dry]
 */

const CHUNK = 1000;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface RecordRow {
  id: string;
  title: string;
  body_text: string | null;
}

async function main() {
  const dry = process.argv.includes('--dry');

  const records = await sql<RecordRow[]>`select id, title, body_text from records order by id`;

  /*
   * Every record's current entity links, in ONE query -- see reclassify.ts's
   * comment on why this loop is not "select ... where record_id = ?" per record
   * (24k round trips at ~100ms each is not a script, it is an outage).
   */
  const linkRows = await sql<Array<{ record_id: string; slug: string }>>`
    select re.record_id, e.slug
      from record_entities re
      join entities e on e.id = re.entity_id
  `;
  const slugsByRecord = new Map<string, Set<string>>();
  for (const row of linkRows) {
    const key = String(row.record_id);
    const set = slugsByRecord.get(key);
    if (set) set.add(row.slug);
    else slugsByRecord.set(key, new Set([row.slug]));
  }

  log.info('varlık yeniden çıkarma başlıyor', { records: records.length, dry });

  let changed = 0;
  let added = 0;
  const allEntities = new Map<string, ExtractedEntity>(); // slug -> entity (deduped, for the entities upsert)
  const rewrites: Array<{ id: number; entities: ExtractedEntity[] }> = [];

  for (const record of records) {
    const entities = extractEntities({ title: record.title, bodyText: record.body_text });
    const newSlugs = new Set(entities.map((e) => e.slug));
    const oldSlugs = slugsByRecord.get(String(record.id)) ?? new Set();

    const same =
      newSlugs.size === oldSlugs.size && [...newSlugs].every((slug) => oldSlugs.has(slug));
    if (same) continue;

    changed += 1;
    added += [...newSlugs].filter((slug) => !oldSlugs.has(slug)).length;
    rewrites.push({ id: Number(record.id), entities });
    for (const entity of entities) allEntities.set(entity.slug, entity);
  }

  log.info('fark hesaplandı', { changed, added, distinctEntities: allEntities.size });

  if (dry || rewrites.length === 0) {
    await closeDb();
    return;
  }

  await sql.begin(async (tx) => {
    /*
     * Upsert every distinct entity first, so record_entities can reference a
     * real id below -- one row per statement, same shape as
     * scripts/parse-records/index.ts's live insert path. The distinct count is
     * bounded by the fixed INSTITUTIONS/PLACES lists plus however many company
     * names matched, not by the record count, so this stays small.
     */
    const entityIdBySlug = new Map<string, number>();
    for (const entity of allEntities.values()) {
      const [row] = await tx<Array<{ id: string }>>`
        insert into entities (kind, slug, name, name_normalized, district)
        values (${entity.kind}, ${entity.slug}, ${entity.name}, ${entity.nameNormalized}, ${entity.district})
        on conflict (slug) do update set name = excluded.name
        returning id
      `;
      entityIdBySlug.set(entity.slug, Number(row!.id));
    }

    const rewriteIds = rewrites.map((item) => item.id);
    for (const slice of chunk(rewriteIds, CHUNK)) {
      await tx`delete from record_entities where record_id = any(${slice})`;
    }

    const links = rewrites.flatMap((item) =>
      item.entities.map((entity) => ({
        record_id: item.id,
        entity_id: entityIdBySlug.get(entity.slug)!,
        confidence: entity.confidence,
      })),
    );
    for (const slice of chunk(links, CHUNK)) {
      await tx`
        insert into record_entities ${tx(slice, 'record_id', 'entity_id', 'confidence')}
        on conflict (record_id, entity_id) do update set confidence = excluded.confidence
      `;
    }
  });

  await sql`select refresh_entity_counts(null)`;

  log.info('varlık yeniden çıkarma tamam', { changed, added });
  await closeDb();
}

main().catch((error) => {
  log.error('varlık yeniden çıkarma başarısız', { message: String(error) });
  process.exit(1);
});
