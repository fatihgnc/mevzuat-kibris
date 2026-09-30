/**
 * Records taken down on request. Parsing an issue again would otherwise insert
 * them anew, because the row is gone and nothing else remembers it.
 *
 * Keyed by issue (year/number) and the record's own reference, which is stable
 * across title corrections. Keep one line of context per entry.
 */
const REMOVED_RECORDS: ReadonlyArray<{
  year: number;
  issueNumber: number;
  refType: string;
  refNumber: string;
}> = [
  // Erkiş Bilişim Hizmetleri Ltd. free-zone deregistration notice; requested by the company, 2026-10-01.
  { year: 2023, issueNumber: 159, refType: 'ae', refNumber: '595' },
];

export function isRemovedRecord(
  issue: { year: number; number: number },
  record: { refType: string | null; refNumber: string | null },
): boolean {
  return REMOVED_RECORDS.some(
    (r) =>
      r.year === issue.year &&
      r.issueNumber === issue.number &&
      r.refType === record.refType &&
      r.refNumber === record.refNumber,
  );
}
