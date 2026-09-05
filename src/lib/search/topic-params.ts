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
  sirala: SortOption;
}

export function parseTopicParams(
  raw: Record<string, string | string[] | undefined> | undefined,
): TopicParams {
  const flat: Record<string, string | undefined> = {};
  for (const key of ['baslangic', 'bitis', 'sirala']) {
    const value = raw?.[key];
    flat[key] = Array.isArray(value) ? value[0] : value;
  }

  const parsed = searchParamsSchema.pick({ baslangic: true, bitis: true, sirala: true }).parse(flat);

  return {
    baslangic: parsed.baslangic,
    bitis: parsed.bitis,
    sirala: parsed.sirala ?? DEFAULT_SORT,
  };
}
