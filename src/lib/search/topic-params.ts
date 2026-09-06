import type { DocType } from '@/lib/constants/doc-types';
import { searchParamsSchema, DEFAULT_SORT, type SortOption } from './build-query';

/**
 * The slice of the query string the topic feed reads.
 *
 * It borrows the SEARCH schema's fields rather than declaring its own, so the two
 * rails cannot drift on what a valid date or sort value is. Anything unrecognised
 * is dropped instead of erroring — a shared link carrying an old parameter still
 * has to open the page.
 */
export interface TopicParams {
  baslangic?: string;
  bitis?: string;
  /**
   * Document types. A topic is not one kind of document: "Münhal" holds vacancy
   * notices, exam results and circulars side by side, and until this existed the
   * topic rail could only narrow a feed by date.
   */
  tur: DocType[];
  sirala: SortOption;
}

export function parseTopicParams(
  raw: Record<string, string | string[] | undefined> | undefined,
): TopicParams {
  const flat: Record<string, string | string[] | undefined> = {};
  for (const key of ['baslangic', 'bitis', 'sirala']) {
    const value = raw?.[key];
    flat[key] = Array.isArray(value) ? value[0] : value;
  }

  /*
   * `tur` is NOT flattened to its first value — it is the one repeatable field
   * here, and the schema's own transform already accepts both `?tur=a&tur=b` and
   * `?tur=a,b`.
   */
  flat.tur = raw?.tur;

  const parsed = searchParamsSchema
    .pick({ baslangic: true, bitis: true, tur: true, sirala: true })
    .parse(flat);

  return {
    baslangic: parsed.baslangic,
    bitis: parsed.bitis,
    tur: parsed.tur,
    sirala: parsed.sirala ?? DEFAULT_SORT,
  };
}
