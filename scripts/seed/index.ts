import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { formatRef } from '../../src/lib/constants/doc-types';
import { TOPIC_LIST } from '../../src/lib/constants/topics';
import { recordSlug } from '../../src/lib/text/slugify';
import { normalizeForSearch } from '../../src/lib/text/turkish-lower';
import { classifyDocType, classifyTopics, detectPersonalData } from '../classify/rules';
import { extractEntities } from '../extract-entities/extractor';
import { parseIndexCell } from '../parse-records/parser';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';
import { summarize } from '../summarize/rules';

/**
 * Seed data for local development and the CI smoke test.
 *
 * It downloads no PDFs; it uses the real table-of-contents dumps under
 * fixtures/. That lets the database schema, the search configuration and the UI
 * be exercised end to end without network access.
 */

const FIXTURES = join(process.cwd(), 'fixtures', 'issues');

/** A short sample text in place of the body, so search can be seen working. */
function sampleBody(title: string): string {
  return [
    title,
    '',
    'Bu metin yerel geliştirme için üretilmiş örnek gövdedir. Karar, ilgili dairenin',
    'Lefkoşa merkez binasında yapılan toplantıda görüşülmüş ve karara bağlanmıştır.',
    'Başvurular 26 Ocak 2026 tarihine kadar Komisyonun Lefkoşa merkez binasına elden',
    'ya da posta yoluyla yapılır. Yazılı sınav 14 Şubat 2026 tarihinde yapılacaktır.',
  ].join('\n');
}

async function main() {
  await sql`
    insert into topics (slug, name, description, sort_order)
    select * from unnest(
      ${TOPIC_LIST.map((topic) => topic.slug)}::text[],
      ${TOPIC_LIST.map((topic) => topic.name)}::text[],
      ${TOPIC_LIST.map((topic) => topic.description)}::text[],
      ${TOPIC_LIST.map((topic) => topic.sortOrder)}::smallint[]
    )
    on conflict (slug) do update
      set name = excluded.name,
          description = excluded.description,
          sort_order = excluded.sort_order
  `;

  const files = readdirSync(FIXTURES).filter((name) => name.endsWith('.txt'));
  let records = 0;

  for (const file of files) {
    const [yearPart, numberPart] = file.replace(/\.txt$/, '').split('-');
    const year = Number(yearPart);
    const number = Number(numberPart);
    const publishedAt = year + '-12-' + String(31 - files.indexOf(file)).padStart(2, '0');

    const issueRows = await sql<Array<{ id: string }>>`
      insert into issues (year, number, published_at, pdf_url, page_count, text_status, text_quality)
      values (
        ${year}, ${number}, ${publishedAt},
        ${'https://basimevi.gov.ct.tr/ornek/' + year + '-' + number + '.pdf'},
        40, 'extracted', 0.93
      )
      on conflict (year, number) do update set published_at = excluded.published_at
      returning id
    `;
    const issueId = Number(issueRows[0]!.id);

    const parsed = parseIndexCell(readFileSync(join(FIXTURES, file), 'utf8'));

    for (const record of parsed) {
      const docType = classifyDocType({
        title: record.title,
        section: record.section,
        refType: record.refType,
      });
      const topics = classifyTopics({ title: record.title, docType });
      const summary = summarize({
        title: record.title,
        section: record.section,
        refType: record.refType,
      });
      const body = sampleBody(record.title);
      const entities = extractEntities({ title: record.title, bodyText: body });

      const slug = recordSlug({
        year,
        refType: record.refType,
        refNumber: record.refNumber,
        title: summary?.summary ?? record.title,
        fallbackKey: number + '-' + record.ordinal,
      });

      const rows = await sql<Array<{ id: string }>>`
        insert into records (
          issue_id, slug, section, doc_type, ref_type, ref_number,
          title, title_normalized, body_text, summary, summary_source,
          deadline_at, page_from, published_at, has_personal_data, has_own_page
        ) values (
          ${issueId}, ${slug}, ${record.section}, ${docType},
          ${record.refType}, ${record.refNumber},
          ${record.title}, ${normalizeForSearch(record.title)}, ${body},
          ${summary?.summary ?? null}, ${summary ? 'rule' : null},
          ${docType === 'munhal_ilani' ? year + 1 + '-01-26' : null},
          14, ${publishedAt}, ${detectPersonalData({ title: record.title, docType })}, true
        )
        on conflict (slug) do update set body_text = excluded.body_text
        returning id
      `;
      const recordId = Number(rows[0]!.id);
      records += 1;

      for (const topic of topics) {
        await sql`insert into record_topics (record_id, topic) values (${recordId}, ${topic}) on conflict do nothing`;
      }

      for (const entity of entities) {
        const entityRows = await sql<Array<{ id: string }>>`
          insert into entities (kind, slug, name, name_normalized, district)
          values (${entity.kind}, ${entity.slug}, ${entity.name}, ${entity.nameNormalized}, ${entity.district})
          on conflict (slug) do update set name = excluded.name
          returning id
        `;
        await sql`
          insert into record_entities (record_id, entity_id, confidence)
          values (${recordId}, ${Number(entityRows[0]!.id)}, ${entity.confidence})
          on conflict (record_id, entity_id) do update set confidence = excluded.confidence
        `;
      }

      log.info('kayıt', { slug, docType, topics: topics.join(','), summary: summary?.summary });
    }
  }

  await sql`select refresh_entity_counts(null)`;
  log.info('tohumlama bitti', { issues: files.length, records });
}

main()
  .catch((error) => {
    log.error('seed başarısız', { message: String(error) });
    process.exitCode = 1;
  })
  .finally(() => closeDb());
