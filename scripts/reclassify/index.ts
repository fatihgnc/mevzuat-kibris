import { classifyDocType, classifyTopics } from '../classify/rules';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { inheritReferencedTopics } from './inherit';

/**
 * RECOMPUTES document type and topics from the stored titles.
 *
 * Why a separate script: classification rules change as real data is seen, and
 * each change only ever applied to new records. The only way to update existing
 * records was to re-crawl the whole archive — 262 PDF downloads, needless load on
 * the source site, and hours. But classification looks only at the `title`,
 * `section` and `ref_type` columns, and all three are already in the database. We
 * never touch the network.
 *
 * What it deliberately does NOT change: `body_text`, `summary`, `has_own_page`,
 * `slug`. Those depend on the PDF text or on a decision made at generation time;
 * and per spec 8.1 a slug never changes once generated.
 *
 * Usage: tsx scripts/reclassify/index.ts [--dry]
 */

/*
 * Statement size. Postgres caps a statement at 65,535 bound parameters, and the
 * topic insert binds two per row, so this leaves an order of magnitude of room.
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
  section: string;
  doc_type: string;
  ref_type: string | null;
}

async function main() {
  const dry = process.argv.includes('--dry');

  const rows = await sql<RecordRow[]>`
    select id, title, section, doc_type, ref_type from records order by id
  `;

  /*
   * Every record's current topics, in ONE query.
   *
   * This loop used to ask `select topic from record_topics where record_id = ?`
   * per record. The classification itself is pure and takes seconds; the run took
   * 44 minutes, and all of it was 24,438 round trips to a remote database at a
   * measured 108ms each. The whole table is 22,734 rows.
   */
  const topicRows = await sql<Array<{ record_id: string; topic: string }>>`
    select record_id, topic from record_topics
  `;

  /*
   * KEYED BY STRING, because that is what the driver hands back for a bigint —
   * `record_id` arrives as "6173", not 6173. Keying this map by string while
   * reading it with Number() missed every single lookup, which made `before`
   * always empty and reported every record that has any topic as changed: 19,283
   * of them. The rewrite that followed deleted and reinserted the same rows, so
   * the data survived and only the number lied. `records.id` is the same type,
   * hence String() on both sides.
   */
  const topicsByRecord = new Map<string, string[]>();
  for (const item of topicRows) {
    const key = String(item.record_id);
    const list = topicsByRecord.get(key);
    if (list) list.push(item.topic);
    else topicsByRecord.set(key, [item.topic]);
  }

  log.info('yeniden sınıflandırma başlıyor', {
    records: rows.length,
    topicRows: topicRows.length,
    dry,
  });

  let docTypeChanged = 0;
  let topicsChanged = 0;

  /** Collected first, written in bulk below. */
  const docTypeUpdates = new Map<string, number[]>();
  const topicRewrites: Array<{ id: number; topics: string[] }> = [];

  for (const row of rows) {
    const docType = classifyDocType({
      title: row.title,
      section: row.section,
      refType: row.ref_type,
    });
    const topics = classifyTopics({ title: row.title, docType });

    const before = [...(topicsByRecord.get(String(row.id)) ?? [])].sort();
    const after = [...topics].sort();
    const sameTopics = before.length === after.length && before.every((t, i) => t === after[i]);

    if (docType !== row.doc_type) {
      docTypeChanged += 1;
      const list = docTypeUpdates.get(docType);
      if (list) list.push(Number(row.id));
      else docTypeUpdates.set(docType, [Number(row.id)]);
    }

    if (!sameTopics) {
      topicsChanged += 1;
      topicRewrites.push({ id: Number(row.id), topics });
    }
  }

  const pairs = topicRewrites.flatMap((item) =>
    item.topics.map((topic) => ({ record_id: item.id, topic })),
  );

  if (!dry) {
    /*
     * The writes go out in bulk for the same reason the read above does: at a
     * measured 108ms per round trip, one statement per record meant 19,283
     * deletes and roughly 40,000 inserts — about an hour and three quarters of
     * waiting on the network for work that takes milliseconds.
     *
     * ALL OF IT IN ONE TRANSACTION, and that is not tidiness. A record's topics
     * are rewritten as a delete followed by an insert. Batched, a failure between
     * the two would strip the topics from up to a thousand records at a time and
     * leave them stripped; the per-record version could only ever lose one. DNS
     * to this database dropped twice while this change was being written, so the
     * failure is not hypothetical.
     */
    await sql.begin(async (tx) => {
      /*
       * Grouped by target value, so doc_type costs at most one statement per type.
       *
       * NO `updated_at = now()`: records has created_at and nothing else, and the
       * assignment was here from the start. Postgres rejects the statement, so the
       * script died on the FIRST record whose doc_type changed — after it had
       * already rewritten the topics of every record before it, because there was
       * no transaction either. That is the most likely reason 5,119 records reached
       * this session with no topics at all while the rules would give them some.
       */
      for (const [docType, ids] of docTypeUpdates) {
        for (const slice of chunk(ids, CHUNK)) {
          await tx`update records set doc_type = ${docType} where id = any(${slice})`;
        }
      }

      /*
       * Deleting removed topics is ESSENTIAL. With inserts only, a record would
       * carry a topic it had once been given by mistake forever, and narrowing a
       * rule would have no effect at all.
       */
      const rewriteIds = topicRewrites.map((item) => item.id);
      for (const slice of chunk(rewriteIds, CHUNK)) {
        await tx`delete from record_topics where record_id = any(${slice})`;
      }

      for (const slice of chunk(pairs, CHUNK)) {
        await tx`
          insert into record_topics ${tx(slice, 'record_id', 'topic')}
          on conflict do nothing
        `;
      }
    });

    log.info('toplu yazma bitti', {
      docTypeStatements: docTypeUpdates.size,
      topicRows: pairs.length,
    });
  }

  log.info('kural tabanlı sınıflandırma bitti', { docTypeChanged, topicsChanged });

  /*
   * Inheritance has to run AFTER the rule layer: an amendment record takes its
   * topic from the decision it cites, and that source's topic is only determined
   * in this step. In the reverse order most of the sources would still have no
   * topic.
   */
  const inherited = dry ? 0 : await inheritReferencedTopics();
  log.info('yeniden sınıflandırma tamam', { docTypeChanged, topicsChanged, inherited });

  await closeDb();
}

main().catch((error) => {
  log.error('yeniden sınıflandırma başarısız', { message: String(error) });
  process.exit(1);
});
