import { formatRef } from '../../src/lib/constants/doc-types';
import { recordSlug } from '../../src/lib/text/slugify';
import { normalizeForSearch } from '../../src/lib/text/turkish-lower';
import { truncateBytes } from '../../src/lib/text/truncate';
import { classifyDocType, classifyTopics, detectPersonalData } from '../classify/rules';
import { extractEntities } from '../extract-entities/extractor';
import { extractPdfText } from '../extract-text';
import { extractDeadline } from '../shared/deadline';
import { sql } from '../shared/db';
import { log } from '../shared/logger';
import { summarize } from '../summarize/rules';

import { extractBody, parseIndexCell, parseIndexTable } from './parser';

/**
 * Stages 4-7 — processes one issue end to end.
 *
 * Idempotent: the record slug is deterministic and updated via ON CONFLICT. Once
 * generated, a slug never changes (spec 8.1) — even if the title is corrected
 * the existing slug is preserved, because we do not touch it on conflict.
 */

/** The thin-record rule: too slight to deserve its own page — spec 8.2 rule 2. */
const THIN_BODY_LIMIT = 200;

export interface ProcessResult {
  recordsWritten: number;
  topics: Set<string>;
  entities: Set<string>;
  textStatus: string;
}

export async function processIssue(issue: {
  id: number;
  year: number;
  number: number;
  publishedAt: string;
  pdfUrl: string;
  rawIndexHtml: string | null;
}): Promise<ProcessResult> {
  const touchedTopics = new Set<string>();
  const touchedEntities = new Set<string>();

  /*
   * Read from the structure; fall back to text.
   *
   * In the real archive the İÇERİK cell is a columnar inner table, not a flat
   * text dump (see parseIndexTable). The table path splits records correctly
   * because it takes the reference from its own cell; the text path treated
   * every cell as a separate line and split each record in two.
   *
   * The text path still exists: across four years of crawling, a small minority
   * of issues arrive with no İÇERİK table (2 of 262 in 2025, 1 of 194 in 2018).
   * For those, text is the only option.
   */
  const rawIndex = issue.rawIndexHtml ?? '';
  const fromTable = parseIndexTable(rawIndex);
  const parsed = fromTable?.length ? fromTable : parseIndexCell(stripHtml(rawIndex));

  if (!parsed.length) {
    log.warn('içindekiler hücresinden kayıt çıkmadı', { year: issue.year, number: issue.number });
  }

  // PDF text — downloaded, used, deleted (spec 3.6).
  let pdfText = '';
  let textStatus = 'failed';
  let quality: number | null = null;
  let pageCount: number | null = null;

  try {
    const extraction = await extractPdfText(issue.pdfUrl);
    pdfText = extraction.text;
    textStatus = extraction.status;
    quality = extraction.quality;
    pageCount = extraction.pageCount;
  } catch (error) {
    log.warn('metin çıkarma başarısız', {
      year: issue.year,
      number: issue.number,
      message: String(error),
    });
  }

  await sql`
    update issues
       set text_status = ${textStatus},
           text_quality = ${quality},
           page_count = ${pageCount},
           retry_count = case when ${textStatus} in ('failed','needs_review')
                              then retry_count + 1 else retry_count end,
           updated_at = now()
     where id = ${issue.id}
  `;

  let written = 0;

  /*
   * Every reference label in this issue. `extractBody` uses them to decide where
   * a body ends: the NEAREST other reference after its own start. Looking only
   * at the next record's label was not enough — the gazette's physical order need
   * not match the contents order, and when the label was not found the body ran
   * to the end of the PDF.
   */
  const allRefLabels = parsed
    .map((item) => formatRef(item.refType, item.refNumber))
    .filter((label): label is string => Boolean(label));

  for (let i = 0; i < parsed.length; i += 1) {
    const record = parsed[i]!;
    const refLabel = formatRef(record.refType, record.refNumber);
    const otherLabels = allRefLabels.filter((label) => label !== refLabel);

    const { body, pageFrom } = extractBody(pdfText, refLabel, otherLabels);
    const bodyText = body ? truncateBytes(body) : null;

    const docType = classifyDocType({
      title: record.title,
      section: record.section,
      refType: record.refType,
    });
    const topics = classifyTopics({ title: record.title, docType });
    const hasPersonalData = detectPersonalData({ title: record.title, docType });

    const summaryResult = summarize({
      title: record.title,
      section: record.section,
      refType: record.refType,
    });

    const deadline =
      docType === 'munhal_ilani' || docType === 'sinav_sonucu' || topics.includes('ihale')
        ? extractDeadline(bodyText)
        : { deadlineAt: null, note: null };

    const entities = extractEntities({ title: record.title, bodyText });

    /*
     * Thin content rule (spec 8.2 rule 2): a record with a body shorter than 200
     * characters and no entity links does not get its own page. The record is
     * still stored and listed on the issue page; it just gets no separate URL.
     */
    const hasOwnPage = (bodyText?.length ?? 0) >= THIN_BODY_LIMIT || entities.length > 0;

    const slug = recordSlug({
      year: issue.year,
      refType: record.refType,
      refNumber: record.refNumber,
      title: summaryResult?.summary ?? record.title,
      fallbackKey: issue.number + '-' + record.ordinal,
    });

    const rows = await sql<Array<{ id: string }>>`
      insert into records (
        issue_id, slug, section, doc_type, ref_type, ref_number,
        title, title_normalized, subject, body_text,
        summary, summary_source, deadline_at, deadline_note,
        page_from, published_at, has_personal_data, has_own_page
      ) values (
        ${issue.id}, ${slug}, ${record.section}, ${docType},
        ${record.refType}, ${record.refNumber},
        ${record.title}, ${normalizeForSearch(record.title)}, ${record.subject}, ${bodyText},
        ${summaryResult?.summary ?? null}, ${summaryResult ? 'rule' : null},
        ${deadline.deadlineAt}, ${deadline.note},
        ${pageFrom}, ${issue.publishedAt}, ${hasPersonalData}, ${hasOwnPage}
      )
      on conflict (slug) do update set
        -- slug DEĞİŞMİYOR (spec 8.1). Gövde ve türetilmiş alanlar tazeleniyor:
        -- yeniden deneme kuyruğu metni sonradan çıkarabiliyor (spec 7.2).
        body_text      = coalesce(excluded.body_text, records.body_text),
        subject        = coalesce(excluded.subject, records.subject),
        summary        = coalesce(records.summary, excluded.summary),
        summary_source = coalesce(records.summary_source, excluded.summary_source),
        deadline_at    = coalesce(excluded.deadline_at, records.deadline_at),
        deadline_note  = coalesce(excluded.deadline_note, records.deadline_note),
        page_from      = coalesce(excluded.page_from, records.page_from),
        has_own_page   = excluded.has_own_page
      returning id
    `;

    const recordId = Number(rows[0]!.id);
    written += 1;

    for (const topic of topics) {
      await sql`
        insert into record_topics (record_id, topic) values (${recordId}, ${topic})
        on conflict do nothing
      `;
      touchedTopics.add(topic);
    }

    for (const entity of entities) {
      const entityRows = await sql<Array<{ id: string }>>`
        insert into entities (kind, slug, name, name_normalized, district)
        values (${entity.kind}, ${entity.slug}, ${entity.name}, ${entity.nameNormalized}, ${entity.district})
        on conflict (slug) do update set name = excluded.name
        returning id
      `;
      const entityId = Number(entityRows[0]!.id);

      await sql`
        insert into record_entities (record_id, entity_id, confidence)
        values (${recordId}, ${entityId}, ${entity.confidence})
        on conflict (record_id, entity_id) do update set confidence = excluded.confidence
      `;
      touchedEntities.add(entity.slug);
    }
  }

  await linkRelatedRecords(issue.id);
  await sql`select refresh_entity_counts(null)`;

  return { recordsWritten: written, topics: touchedTopics, entities: touchedEntities, textStatus };
}

/**
 * The same subject can appear both in EK III under an A.E. number and in EK IV
 * BÖLÜM I under a Ü(K-I) number (spec 3.3). The two stay as separate records and
 * are linked here. Matching is on the normalised title; within one issue, the
 * same title under two different reference types in practice always means this
 * pairing.
 */
async function linkRelatedRecords(issueId: number): Promise<void> {
  await sql`
    update records a
       set related_record_id = b.id
      from records b
     where a.issue_id = ${issueId}
       and b.issue_id = a.issue_id
       and a.id <> b.id
       and a.ref_type = 'ae'
       and b.ref_type in ('uki','ukii')
       and a.title_normalized = b.title_normalized
       and a.related_record_id is null
  `;

  // Link DÜZELTME (correction) records to the record they correct (spec 3.3).
  await sql`
    update records d
       set corrects_id = src.id
      from records src
     where d.issue_id = ${issueId}
       and d.title ilike 'DÜZELTME%'
       and src.id <> d.id
       and src.ref_type = d.ref_type
       and src.ref_number = d.ref_number
       and src.published_at < d.published_at
       and d.corrects_id is null
  `;
}

/** The İÇERİK cell may be HTML; we turn its tags into line breaks. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|td)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
