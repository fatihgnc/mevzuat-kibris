import { sql } from 'drizzle-orm';
import { docTypeLabel, formatRef } from '@/lib/constants/doc-types';
import { TOPICS, isTopicSlug, type TopicSlug } from '@/lib/constants/topics';
import { overlayMatches, parseHeadline } from '@/lib/search/highlight';
import { maskTitle } from '@/lib/search/mask-title';
import type { RecordListItem } from '@/types/record';

/**
 * drizzle'ın db.execute jeneriği Record<string, unknown> kısıtı koyuyor.
 * Ham satır arayüzlerini bu kısıtı sağlayacak şekilde sarmalıyoruz; alan
 * tipleri korunuyor, yalnızca indeks imzası ekleniyor.
 */
export type Row<T> = T & Record<string, unknown>;

/**
 * JS dizilerini SQL'e taşımanın güvenli yolu.
 *
 * drizzle'ın sql şablonu parametreleri postgres-js'e konumsal olarak veriyor ve
 * bu yolda postgres-js'in dizi serileştirmesi DEVREYE GİRMİYOR: `= any(${dizi})`
 * ifadesinde Postgres parametreyi düz metin olarak alıp "malformed array literal"
 * ile patlıyor. ::text[] cast'i de kurtarmıyor, çünkü sorun taşımada.
 *
 * Karşılaştırma için `in (...)`, saklama için `array[...]` kullanıyoruz; ikisi de
 * her değeri ayrı parametre olarak geçirdiği için dizi serileştirmesine hiç
 * ihtiyaç duymuyor ve SQL enjeksiyonuna kapalı kalıyor.
 */
export function inList(values: readonly (string | number)[]) {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}

export function arrayParam(values: readonly (string | number)[], cast: string) {
  if (!values.length) return sql.raw("'{}'::" + cast);
  return sql`array[${inList(values)}]::${sql.raw(cast)}`;
}

/** Liste sorgularının ortak SELECT gövdesi — tek yerde dursun ki alanlar ayrışmasın. */
export const LIST_COLUMNS = `
  r.id,
  r.slug,
  r.has_own_page,
  r.title,
  r.summary,
  r.doc_type,
  r.ref_type,
  r.ref_number,
  r.published_at,
  r.deadline_at,
  i.year   as issue_year,
  i.number as issue_number,
  coalesce(tp.slugs, '{}') as topics,
  inst.name as institution,
  (r.body_text is not null and length(r.body_text) > 0) as has_body
`;

/**
 * Konu listesi ve birincil kurum lateral join ile geliyor. Lateral, kayıt başına
 * en fazla birkaç satır okuyor; GROUP BY ile yapılsaydı sayfalama öncesi tüm
 * sonuç kümesi gruplanmak zorunda kalırdı.
 */
export const LIST_JOINS = `
  join issues i on i.id = r.issue_id
  left join lateral (
    select array_agg(rt.topic order by rt.topic) as slugs
      from record_topics rt
     where rt.record_id = r.id
  ) tp on true
  left join lateral (
    select e.name
      from record_entities re
      join entities e on e.id = re.entity_id
     where re.record_id = r.id and e.kind = 'institution'
     order by re.confidence desc, e.record_count desc
     limit 1
  ) inst on true
`;

export interface RawListRow {
  id: string | number;
  slug: string;
  has_own_page: boolean;
  title: string;
  summary: string | null;
  doc_type: string;
  ref_type: string | null;
  ref_number: string | null;
  published_at: string | Date;
  deadline_at: string | Date | null;
  issue_year: number;
  issue_number: number;
  topics: string[] | null;
  institution: string | null;
  has_body: boolean;
  snippet?: string | null;
}

function toDateString(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

/**
 * Birincil konu — satırdaki renkli noktayı belirler. Kayıt birden çok konuya
 * ait olabiliyor (spec 3.5); tasarımda tek nokta var, o yüzden konu sırasına
 * göre en öndeki seçiliyor. Sıra sabit olduğu için aynı kayıt her listede aynı
 * rengi alır.
 */
function pickPrimaryTopic(topics: TopicSlug[]): TopicSlug | null {
  if (!topics.length) return null;
  return [...topics].sort((a, b) => TOPICS[a].sortOrder - TOPICS[b].sortOrder)[0] ?? null;
}

/**
 * Ham satırı liste öğesine çevirir; maskeleme ve vurgulama burada yapılır.
 *
 * `query` verilirse hem başlık maskesine hem snippet'e eşleşme bindirilir.
 * ts_headline zaten kendi ayraçlarını koyuyor ama başlık ts_headline'dan
 * geçmiyor (maskelenmiş hâli lazım), o yüzden vurgu uygulama tarafında.
 */
export function mapListItem(row: RawListRow, query = ''): RecordListItem {
  const topics = (row.topics ?? []).filter(isTopicSlug);
  const titleTokens = maskTitle(row.title);
  const snippet = parseHeadline(row.snippet);

  return {
    id: Number(row.id),
    slug: row.slug,
    hasOwnPage: row.has_own_page,
    issueYear: row.issue_year,
    issueNumber: row.issue_number,
    publishedAt: toDateString(row.published_at)!,
    refLabel: formatRef(row.ref_type, row.ref_number),
    title: row.title,
    titleTokens: query ? overlayMatches(titleTokens, query) : titleTokens,
    summary: row.summary,
    docType: row.doc_type as RecordListItem['docType'],
    docTypeLabel: docTypeLabel(row.doc_type),
    topics,
    primaryTopic: pickPrimaryTopic(topics),
    institution: row.institution,
    hasBody: row.has_body,
    snippet,
    deadlineAt: toDateString(row.deadline_at),
  };
}

/**
 * Kayıt bağlantısı — ince kayıtlar kendi sayfasını almaz (spec 8.2 madde 2),
 * sayı sayfasındaki anchor'a gider.
 */
export function recordHref(item: Pick<RecordListItem, 'slug' | 'hasOwnPage' | 'issueYear' | 'issueNumber' | 'refLabel'>): string {
  if (item.hasOwnPage) return '/karar/' + item.slug;
  const anchor = item.refLabel ? '#karar-' + encodeURIComponent(item.refLabel) : '';
  return '/sayilar/' + item.issueYear + '/' + item.issueNumber + anchor;
}

/** Sayı listelemelerinde kullanılan biçim: "1.280" */
export function formatCount(value: number): string {
  return value.toLocaleString('tr-TR');
}
