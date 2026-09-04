import { z } from 'zod';

import { DOC_TYPES } from '@/lib/constants/doc-types';
import { TOPIC_SLUGS } from '@/lib/constants/topics';
import { PAGE_SIZE } from '@/lib/seo/config';
import { normalizeForSearch } from '@/lib/text/turkish-lower';

/**
 * The search query pipeline — spec 5.4.
 *
 *   1. normalise        trim, tr-lowercase, collapse whitespace
 *   2. quote detection  "hizmet alımı" -> phraseto_tsquery
 *   3. synonyms         the search_synonyms table (inside mk_tsquery)
 *   4. build tsquery    mk_tsquery(q) — including prefix matching
 *   5. order            ts_rank_cd * recency_boost
 *   6. highlight        ts_headline
 *   7. on 0 results     trigram suggestion
 *
 * 1-2 happen here, 3-7 on the SQL side (0007-search-functions.sql).
 */

/**
 * Sort options. The first is the default.
 *
 * "Most relevant" (ts_rank_cd) was REMOVED by the product owner's decision. The
 * consequence was accepted knowingly: text search is now also ordered by date, so
 * a search for "ihale" puts the newest first rather than the most relevant. For a
 * gazette that is defensible — users mostly ask "what happened most recently". If
 * it is wanted back, the rank branch in `orderBy` and the option here return.
 */
export const SORT_OPTIONS = ['yeni', 'eski'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: SortOption = 'yeni';

export const SORT_LABELS: Record<SortOption, string> = {
  yeni: 'En yeni',
  eski: 'En eski',
};

/**
 * URL query parameters. All of them short and in Turkish so links stay shareable
 * (spec 5.5). An unknown value is dropped silently rather than erroring — a
 * shared link containing an old filter must still open the page.
 */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(200).catch(''),
  konu: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray)
    .pipe(z.array(z.enum(TOPIC_SLUGS)).max(8))
    .catch([]),
  tur: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray)
    .pipe(z.array(z.enum(DOC_TYPES)).max(DOC_TYPES.length))
    .catch([]),
  kurum: z.string().trim().max(120).optional().catch(undefined),
  yer: z.string().trim().max(120).optional().catch(undefined),
  yil: z.coerce.number().int().min(1900).max(2200).optional().catch(undefined),
  baslangic: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  bitis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  sirala: z.enum(SORT_OPTIONS).catch(DEFAULT_SORT),
  sayfa: z.coerce.number().int().min(1).max(500).catch(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : value.split(',');
  return raw.map((item) => item.trim()).filter(Boolean);
}

/**
 * Flattens raw searchParams before handing them to the schema.
 *
 * Next.js gives an array when a key repeats (`?q=a&q=b`). Because the schema
 * expects a single string, that turned the search page into a 500 on a broken
 * shared link. With multiple values the first is taken; fields that do expect an
 * array (konu, tur) already handle arrays in their own transform.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchParams {
  const flattened: Record<string, string | string[] | undefined> = { ...raw };

  for (const key of ['q', 'kurum', 'yer', 'yil', 'baslangic', 'bitis', 'sirala', 'sayfa']) {
    const value = flattened[key];
    if (Array.isArray(value)) flattened[key] = value[0];
  }

  return searchParamsSchema.parse(flattened);
}

export interface BuiltQuery {
  /** As the user typed it — shown in the UI. */
  raw: string;
  /** The normalised form — for trigram suggestions and logging. */
  normalized: string;
  /**
   * The tsquery expression sent to Postgres. If empty (no query), only filters
   * apply and ordering falls back to date.
   */
  tsquery: string | null;
  /** Whether an exact phrase was searched in quotes — for the "exact match" badge. */
  hasPhrase: boolean;
  offset: number;
  limit: number;
}

const QUOTED = /"([^"]+)"/g;

/**
 * Ham sorgu doğrudan mk_tsquery() fonksiyonuna gidiyor; o da
 * websearch_to_tsquery ile kullanıcı sözdizimini (tırnak, OR, eksi) güvenle
 * ayrıştırıp önek ve eşanlamlı genişletmesini uyguluyor.
 */
export function buildQuery(params: SearchParams): BuiltQuery {
  const raw = params.q.trim();
  const normalized = normalizeForSearch(raw);
  const page = Math.max(1, params.sayfa);

  const base: BuiltQuery = {
    raw,
    normalized,
    tsquery: null,
    hasPhrase: false,
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  };

  if (!raw) return base;

  QUOTED.lastIndex = 0;
  const hasPhrase = QUOTED.test(raw);

  /*
   * Eşanlamlı genişletme ve önek eşleşmesi veritabanındaki mk_tsquery()
   * fonksiyonunda (supabase/migrations/0007). Burada yapılmıyor: alarm
   * eşleştirmesi de aynı fonksiyondan geçiyor ve ikisinin birebir aynı
   * sorguyu görmesi gerekiyor (spec 10.2).
   */
  const tsquery = raw;

  return { ...base, tsquery, hasPhrase };
}

/** Whether any filter is active — drives whether the "clear filters" link is shown. */
export function hasActiveFilters(params: SearchParams): boolean {
  return Boolean(
    params.konu.length ||
      params.tur.length ||
      params.kurum ||
      params.yer ||
      params.yil ||
      params.baslangic ||
      params.bitis,
  );
}

/** Açık filtrelerin insan okunur listesi — artboard 1f'deki çipler. */
export interface ActiveFilterChip {
  key: string;
  label: string;
  /** Bu filtreyi kaldıran URL */
  href: string;
}

export function buildSearchHref(
  params: Partial<SearchParams> & { q?: string },
  overrides: Partial<Record<keyof SearchParams, unknown>> = {},
  basePath = '/ara',
): string {
  const merged = { ...params, ...overrides } as Record<string, unknown>;
  const search = new URLSearchParams();

  const push = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
      return;
    }
    search.set(key, String(value));
  };

  push('q', merged.q);
  push('konu', merged.konu);
  push('tur', merged.tur);
  push('kurum', merged.kurum);
  push('yer', merged.yer);
  push('yil', merged.yil);
  push('baslangic', merged.baslangic);
  push('bitis', merged.bitis);
  if (merged.sirala && merged.sirala !== DEFAULT_SORT) push('sirala', merged.sirala);
  if (typeof merged.sayfa === 'number' && merged.sayfa > 1) push('sayfa', merged.sayfa);

  const qs = search.toString();
  return qs ? basePath + '?' + qs : basePath;
}

export interface YearOption {
  key: string;
  label: string;
  /** undefined = "Tümü", yani yıl filtresi yok. */
  yil?: number;
}

/**
 * Date filter options — the list in artboard 1b's left rail.
 *
 * By the product owner's decision the years are listed INDIVIDUALLY, with no
 * ranges. It used to be "Son 12 ay / 2025 / 2020 – 2024 / Tümü". That has two
 * consequences:
 *
 * 1. "Son 12 ay" was removed. Being a range on its own it did not fit a list of
 *    single years, and because it required `baslangic`/`bitis` it blocked reducing
 *    the filter to one parameter (`yil`). Having one parameter is what made the
 *    form with its "Filtrele" button solvable with a radio group.
 * 2. The years come FROM THE DATA, not from the calendar. Today is 2026 but the
 *    archive holds only 2025; generated from the calendar, a 2026 option would
 *    appear and whoever clicked it would get nothing. Spec 8.4's coverage rule:
 *    do not claim a year you have no data for.
 *
 * The `baslangic`/`bitis` parameters REMAIN in the schema so that old shared links
 * keep working. Only the UI no longer produces them.
 */
export function yearOptions(
  coverage?: { earliestYear: number | null; latestYear: number | null } | null,
): YearOption[] {
  const options: YearOption[] = [];

  const latest = coverage?.latestYear ?? null;
  const earliest = coverage?.earliestYear ?? null;

  if (latest !== null && earliest !== null) {
    for (let year = latest; year >= earliest; year -= 1) {
      options.push({ key: String(year), label: String(year), yil: year });
    }
  }

  /*
   * Sade "Tümü". Eskiden kapsam aralığı da yazıyordu ("Tümü, 2025") ama
   * yıllar zaten hemen üstünde tek tek listelendiği için tekrar oluyordu;
   * kapsam iddiası sayfanın kendi kapsam cümlesinde duruyor (spec 8.4).
   */
  options.push({ key: 'tumu', label: 'Tümü' });

  return options;
}
