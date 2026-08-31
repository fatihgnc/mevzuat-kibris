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

import { extractBody, parseIndexCell } from './parser';

/**
 * Aşama 4-7 — bir sayıyı uçtan uca işler.
 *
 * Idempotent: kayıt slug'ı deterministik ve ON CONFLICT ile güncelleniyor.
 * Slug bir kez üretildikten sonra değişmiyor (spec 8.1) — başlık düzeltilse
 * bile mevcut slug korunuyor, çünkü çakışmada slug'a dokunmuyoruz.
 */

/** Kendi sayfasını hak etmeyen ince kayıt kuralı — spec 8.2 madde 2. */
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

  const parsed = parseIndexCell(stripHtml(issue.rawIndexHtml ?? ''));
  if (!parsed.length) {
    log.warn('içindekiler hücresinden kayıt çıkmadı', { year: issue.year, number: issue.number });
  }

  // PDF metni — indirilir, kullanılır, silinir (spec 3.6).
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

  for (let i = 0; i < parsed.length; i += 1) {
    const record = parsed[i]!;
    const refLabel = formatRef(record.refType, record.refNumber);
    const nextRefLabel = (() => {
      const next = parsed[i + 1];
      return next ? formatRef(next.refType, next.refNumber) : null;
    })();

    const { body, pageFrom } = extractBody(pdfText, refLabel, nextRefLabel);
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
     * İnce içerik kuralı (spec 8.2 madde 2): gövdesi 200 karakterden kısa ve
     * varlık bağlantısı olmayan kayıt kendi sayfasını almıyor. Kayıt yine
     * saklanıyor ve sayı sayfasında listeleniyor; yalnızca ayrı URL almıyor.
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
 * Aynı konunun hem EK III'te A.E. hem EK IV BÖLÜM I'de Ü(K-I) numarasıyla
 * görünmesi (spec 3.3). İkisi ayrı kayıt olarak duruyor, burada bağlanıyor.
 * Eşleştirme normalize edilmiş başlık üzerinden; aynı sayı içinde iki farklı
 * referans tipiyle aynı başlık pratikte hep bu ikili demek.
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

  // DÜZELTME kayıtlarını kaynak kayda bağla (spec 3.3).
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

/** İÇERİK hücresi HTML olabiliyor; etiketleri satır sonuna çeviriyoruz. */
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
