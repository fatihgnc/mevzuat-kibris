import { docTypeLabel, formatRef } from '@/lib/constants/doc-types';
import { formatCount } from '@/lib/db/queries/shared';
import { SOURCE_NAME } from '@/lib/seo/config';
import { formatDateLong } from '@/lib/text/dates';
import type { RecordDetail } from '@/types/record';

/**
 * ONE SENTENCE THAT STANDS ON ITS OWN.
 *
 * Every fact in it was already on the page — the date, the reference number, the
 * issue, the document type, the institution — but each sat in its own cell of a
 * metadata bar. That is fine for a person scanning, and useless to anything that
 * quotes: a generative answer engine lifts PROSE, and a table of labelled values
 * carries no subject, verb or context to lift. Split across five cells, "A.E.
 * 817" is a string; in a sentence it is a decision, made on a date, by a body,
 * published in a numbered gazette.
 *
 * It is also the sentence a human needs first. A visitor arriving from a search
 * result knows nothing about A.E. numbers or issue numbering, and the heading
 * alone does not say when this happened or who did it.
 *
 * NOTHING HERE IS GENERATED OR INFERRED. Every clause is a stored field and any
 * field that is missing simply drops out, so the sentence is shorter rather than
 * padded with a guess. That matters more than usual here: the summary in the h1
 * is ours and is labelled as ours, and this line must not be mistaken for more
 * of the same.
 */
export function recordLede(record: RecordDetail): string {
  const ref = record.refType && record.refNumber ? formatRef(record.refType, record.refNumber) : null;
  const institution = record.entities.find((entity) => entity.kind === 'institution');

  /*
   * The subject of the sentence. With a reference number: "A.E. 817 sayılı
   * Rekabet Kurulu kararı". Without one, the document type alone carries it —
   * "Rekabet Kurulu kararı" — because "sayılı" with nothing before it is broken
   * Turkish, not a shorter sentence.
   */
  const type = docTypeLabel(record.docType);
  const subject = ref ? ref + ' sayılı ' + type : type;

  /*
   * The institution is dropped when the document type already names it.
   * "Rekabet Kurulu kararı Rekabet Kurulu tarafından ... yayımlandı" is what the
   * naive join produces, and roughly a third of the archive's types are named
   * after the body that issues them. Same rule as the list row's `showTur`, in
   * the other direction.
   */
  const names = institution
    ? !type.toLocaleLowerCase('tr').includes(institution.name.toLocaleLowerCase('tr'))
    : false;

  const rest = [
    names && institution ? institution.name + ' tarafından' : null,
    formatDateLong(record.publishedAt) + ' tarihli',
    SOURCE_NAME + "'nin " + record.issue.number + '. sayısında yayımlandı',
  ].filter(Boolean);

  /* The comma after the subject; without it the clauses run together. */
  return subject + ', ' + rest.join(' ') + '.';
}

/**
 * The same idea for an entity page: what this page is, in numbers, in prose.
 *
 * "Bakanlar Kurulu adına 2020'den bugüne 12.803 kayıt yayımlandı; en yenisi 4
 * Eylül 2026." The count and the latest date were both on the page already, as a
 * bare number and as the first row's timestamp.
 */
export function entityLede(name: string, total: number, latestPublishedAt?: string): string {
  const head = name + ' ile ilgili arşivde ' + formatCount(total) + ' kayıt var';
  if (!latestPublishedAt) return head + '.';
  return head + '; en yenisi ' + formatDateLong(latestPublishedAt) + ' tarihinde yayımlandı.';
}
