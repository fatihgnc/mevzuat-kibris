import { recordSlug } from '../../src/lib/text/slugify';
import { normalizeForSearch } from '../../src/lib/text/turkish-lower';
import { truncateBytes } from '../../src/lib/text/truncate';
import { extractEntities } from '../extract-entities/extractor';
import { extractPdfText } from '../extract-text';
import { extractDeadline, findWindowEnds } from '../shared/deadline';
import { sql } from '../shared/db';
import { log } from '../shared/logger';

import { buildSummary, buildTitle, circularPattern, kindOfCategory, parseCircular, parseTurkishDate, type Circular } from './circular';
import { crawlYear, type KhkRow } from './crawl';

/**
 * Vacancy circulars from khk.gov.ct.tr as records.
 *
 * The gazette carries only some of them. Each listing row is matched against the
 * records we already hold; the rest become records of their own, with no gazette
 * issue (migration 0026).
 */

export type Status = 'have' | 'missing' | 'ambiguous' | 'imported' | 'skipped';

export interface Candidate {
  row: KhkRow;
  circular: Circular;
  title: string;
  /** The listing's department name, "(İPTAL)" removed. */
  department: string;
  /** The PDF address without the cache-busting `?ver=`. */
  sourceUrl: string;
  listingDeadline: string | null;
  /** The listing marks the department "(İPTAL)": the circular was withdrawn. */
  cancelled: boolean;
  status: Status;
  matchIds: number[];
}

interface Known {
  id: number;
  refType: string | null;
  refNumber: string | null;
  sourceUrl: string | null;
  deadlineAt: string | null;
  head: string;
}

/** Only these categories are vacancies; the language-exam page lists exam announcements. */
const VACANCY_CATEGORY = /[iİ]lk-[aA]tama|[yY]ükselme|[öÖ]ğretmenlik/;

async function loadKnown(): Promise<Known[]> {
  const rows = await sql<
    Array<{ id: string; ref_type: string | null; ref_number: string | null; source_url: string | null; deadline_at: Date | null; head: string }>
  >`
    select r.id, r.ref_type, r.ref_number, r.source_url, r.deadline_at,
           r.title || ' ' || left(coalesce(r.body_markdown, r.body_text, ''), 1800) as head
      from records r
     where r.source_url is not null
        or r.ref_type in ('mia', 'khkmt', 'khko', 'genelgey')
        or exists (select 1 from record_topics rt where rt.record_id = r.id and rt.topic = 'munhal')
  `;

  return rows.map((row) => ({
    id: Number(row.id),
    refType: row.ref_type,
    refNumber: row.ref_number,
    sourceUrl: row.source_url,
    deadlineAt: row.deadline_at ? row.deadline_at.toISOString().slice(0, 10) : null,
    head: row.head,
  }));
}

export function classifyRows(rows: KhkRow[], known: Known[]): Candidate[] {
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (const row of rows) {
    const circular = parseCircular(row.circular);
    const sourceUrl = row.pdfUrl?.split('?')[0] ?? null;
    if (!circular || !circular.refType || !sourceUrl || !VACANCY_CATEGORY.test(row.category)) continue;
    if (!row.department) continue;

    // The same circular can be listed twice (a re-published row); take it once.
    const key = circular.label;
    if (seen.has(key)) continue;
    seen.add(key);

    const cancelled = /\(\s*[İIi]ptal\s*\)/i.test(row.department);
    const department = row.department.replace(/\(\s*[İIi]ptal\s*\)/i, '').trim();
    const title = buildTitle(circular, department, row.category);
    if (!title) continue;

    const already = known.find((record) => record.sourceUrl === sourceUrl);
    const pattern = circularPattern(circular);
    const matches = already
      ? [already]
      : known.filter(
          (record) =>
            (record.refType === circular.refType && record.refNumber === circular.refNumber) ||
            pattern.test(record.head),
        );

    candidates.push({
      row,
      circular,
      title,
      department,
      sourceUrl,
      listingDeadline: parseTurkishDate(row.deadlineText),
      cancelled,
      status: already ? 'imported' : matches.length === 0 ? 'missing' : matches.length === 1 ? 'have' : 'ambiguous',
      matchIds: matches.map((record) => record.id),
    });
  }

  return candidates;
}

export async function plan(years: number[]): Promise<{ candidates: Candidate[]; known: Known[] }> {
  const rows: KhkRow[] = [];
  for (const year of years) rows.push(...(await crawlYear(year)));

  const known = await loadKnown();
  return { candidates: classifyRows(rows, known), known };
}

const MONTH_NAMES = 'Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık';

/** The circular's date, printed in the letterhead ("Sayı : KHK.0.00-001/07-26/E.5154   6 Ekim 2026"). */
export function letterheadDate(text: string): string | null {
  const head = text.split('\n').slice(0, 25).join('\n');
  const match = head.match(new RegExp(`(\\d{1,2})\\s+(${MONTH_NAMES})\\s+(\\d{4})`));
  return match ? parseTurkishDate(match[0]) : null;
}

export interface NewRecordInput {
  candidate: Candidate;
  publishedAt: string;
  deadlineAt: string | null;
  deadlineNote?: string | null;
  bodyText?: string | null;
  bodyMarkdown?: string | null;
  flags?: string[];
}

/** Writes one record. Returns its slug, or null when the source URL is already imported. */
export async function insertRecord(input: NewRecordInput): Promise<string | null> {
  const { candidate } = input;
  const { circular, title } = candidate;

  const body = input.bodyMarkdown ?? input.bodyText ?? null;
  const bodyText = input.bodyText ? truncateBytes(input.bodyText) : body ? truncateBytes(body) : null;
  const year = Number(input.publishedAt.slice(0, 4));

  const slug = recordSlug({ year, refType: circular.refType, refNumber: circular.refNumber, title });
  const summaryText = buildSummary(candidate.department, candidate.row.category);
  const entities = extractEntities({ title, bodyText });

  const rows = await sql<Array<{ id: string }>>`
    insert into records (
      issue_id, source_url, slug, section, doc_type, ref_type, ref_number,
      title, title_normalized, body_text, body_markdown,
      summary, summary_source, deadline_at, deadline_note, issuer, munhal_kind,
      published_at, has_personal_data, has_own_page, review_flags, review_flagged_at
    ) values (
      null, ${candidate.sourceUrl}, ${slug}, 'MAIN', 'genelge', ${circular.refType}, ${circular.refNumber},
      ${title}, ${normalizeForSearch(title)}, ${bodyText}, ${input.bodyMarkdown ?? null},
      ${summaryText}, ${summaryText ? 'rule' : null}, ${input.deadlineAt}, ${input.deadlineNote ?? null}, 'khk', ${kindOfCategory(candidate.row.category)},
      ${input.publishedAt}, false, true,
      ${input.flags?.length ? input.flags : null}, ${input.flags?.length ? sql`now()` : null}
    )
    on conflict do nothing
    returning id
  `;

  const id = rows[0]?.id;
  if (!id) return null;

  await sql`insert into record_topics (record_id, topic) values (${Number(id)}, 'munhal') on conflict do nothing`;

  for (const entity of entities) {
    const entityRows = await sql<Array<{ id: string }>>`
      insert into entities (kind, slug, name, name_normalized, district)
      values (${entity.kind}, ${entity.slug}, ${entity.name}, ${entity.nameNormalized}, ${entity.district})
      on conflict (slug) do update set name = excluded.name
      returning id
    `;
    await sql`
      insert into record_entities (record_id, entity_id, confidence)
      values (${Number(id)}, ${Number(entityRows[0]!.id)}, ${entity.confidence})
      on conflict (record_id, entity_id) do update set confidence = excluded.confidence
    `;
  }

  return slug;
}

export interface AutoResult {
  written: string[];
  skipped: string[];
}

/**
 * The unattended path, run by the daily ingest: every circular on the site that
 * we hold nowhere is read from its PDF's text layer and stored.
 *
 * The text layer of these PDFs is clean prose but its tables (the vacancy list
 * at the top) come out jumbled, so each record is flagged `khk_auto` for a
 * hand-transcription pass. The deadline comes from the listing, which a person
 * maintains, and is cross-checked against the PDF's own wording; a mismatch is
 * flagged `khk_deadline`.
 */
export async function syncAuto(years: number[]): Promise<AutoResult> {
  const { candidates } = await plan(years);
  const result: AutoResult = { written: [], skipped: [] };

  for (const candidate of candidates.filter((item) => item.status === 'missing')) {
    const label = candidate.circular.label;

    try {
      const extraction = await extractPdfText(encodeURI(candidate.sourceUrl));
      const text = extraction.text.trim();
      if (extraction.status === 'failed' || text.length < 400) {
        log.warn('khk pdf has no usable text, left for a manual pass', { label, status: extraction.status });
        result.skipped.push(label);
        continue;
      }

      const publishedAt = letterheadDate(text);
      if (!publishedAt) {
        log.warn('khk pdf has no readable date, skipped', { label });
        result.skipped.push(label);
        continue;
      }

      /*
       * The PDF decides, not the listing: a circular with several application
       * windows (one per kadro) is listed under its FIRST window's end, while
       * applications stay open until the last. The latest window end wins; the
       * single-cue extractor is the fallback, the listing the last resort.
       */
      const fromPdf = extractDeadline(text);
      const windowEnds = [...findWindowEnds(text)].sort();
      const pdfDate = windowEnds.at(-1) ?? fromPdf.deadlineAt?.slice(0, 10) ?? null;
      const deadlineAt = pdfDate ?? candidate.listingDeadline;
      const flags = ['khk_auto'];
      if (deadlineAt !== candidate.listingDeadline) flags.push('khk_deadline');

      const slug = await insertRecord({
        candidate,
        publishedAt,
        deadlineAt,
        deadlineNote: fromPdf.note,
        bodyText: text,
        flags,
      });

      if (slug) result.written.push(slug);
    } catch (error) {
      log.error('khk circular failed', { label, message: String(error) });
      result.skipped.push(label);
    }
  }

  return result;
}
