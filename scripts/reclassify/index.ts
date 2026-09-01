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

  log.info('yeniden sınıflandırma başlıyor', { records: rows.length, dry });

  let docTypeChanged = 0;
  let topicsChanged = 0;

  for (const row of rows) {
    const docType = classifyDocType({
      title: row.title,
      section: row.section,
      refType: row.ref_type,
    });
    const topics = classifyTopics({ title: row.title, docType });

    const current = await sql<Array<{ topic: string }>>`
      select topic from record_topics where record_id = ${Number(row.id)} order by topic
    `;
    const before = current.map((item) => item.topic).sort();
    const after = [...topics].sort();
    const sameTopics = before.length === after.length && before.every((t, i) => t === after[i]);

    if (docType !== row.doc_type) docTypeChanged += 1;
    if (!sameTopics) topicsChanged += 1;

    if (dry) continue;

    if (docType !== row.doc_type) {
      await sql`update records set doc_type = ${docType}, updated_at = now() where id = ${Number(row.id)}`;
    }

    if (!sameTopics) {
      /*
       * Deleting removed topics is ESSENTIAL. With inserts only, a record would
       * carry a topic it had once been given by mistake forever, and narrowing a
       * rule would have no effect at all.
       */
      await sql`delete from record_topics where record_id = ${Number(row.id)}`;
      for (const topic of topics) {
        await sql`
          insert into record_topics (record_id, topic) values (${Number(row.id)}, ${topic})
          on conflict do nothing
        `;
      }
    }
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
