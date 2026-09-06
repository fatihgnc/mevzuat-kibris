import type { Metadata } from 'next';
import Link from 'next/link';

import { RecordList } from '@/components/record-list';
import { Pagination } from '@/components/pagination';
import { FilterSheet } from '@/components/filter-sheet';
import { ActiveFilterChips, SearchFilters, type PinNames } from '@/components/search-filters';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SortLinks } from '@/components/sort-links';
import { FollowCard } from '@/components/follow-card';
import { RssCard } from '@/components/rss-card';
import { TOPIC_LIST } from '@/lib/constants/topics';
import {
  countForQuery,
  logSearch,
  searchRecords,
  suggestSimilar,
} from '@/lib/db/queries/records';
import { archiveCoverage } from '@/lib/db/queries/coverage';
import { getEntity } from '@/lib/db/queries/entities';
import { formatCount } from '@/lib/db/queries/shared';
import {
  buildQuery,
  activeFilterCount,
  buildSearchHref,
  hasActiveFilters,
  parseSearchParams,
  searchParamsSchema,
  type SearchParams,
} from '@/lib/search/build-query';
import { PAGE_SIZE } from '@/lib/seo/config';

/** Arama dinamik; ISR yok (spec 11.1). */
export const dynamic = 'force-dynamic';

/** The results page is noindex, follow (spec 8.1). */
export const metadata: Metadata = {
  title: 'Arama',
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const params = parseSearchParams(raw);
  const built = buildQuery(params);

  const [result, coverage, pinNames] = await Promise.all([
    searchRecords(params, built),
    archiveCoverage(),
    resolvePinNames(params),
  ]);

  /*
   * The search log exists to measure the empty-result rate (spec 16's risk: if
   * Postgres search quality proves insufficient, we move to Meilisearch at a 15%
   * threshold). We do not await it; writing the log must not enter the page's
   * response time.
   */
  if (built.raw) void logSearch(built.raw, result.total);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const empty = built.raw.length > 0 && result.total === 0;

  return (
    <>
      <SiteHeader query={built.raw} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-8 lg:px-8">
        {/*
          The page had no h1 at all. It is `sr-only` rather than visible because the
          design deliberately gives this page no title block — the filled search box
          in the header is what says where you are, and a heading repeating it would
          push the results down. A screen reader still needs the page named, and a
          document whose outline starts at h2 is broken regardless of who is reading.
        */}
        <h1 className="sr-only">
          {built.raw ? '“' + built.raw + '” için arama sonuçları' : 'Arama'}
        </h1>

        <div className="grid gap-8 lg:grid-cols-search">
          {/*
            DO NOT USE `self-start`. Intuition says otherwise, but for sticky to work
            the cell has to be STRETCHED: a sticky element can only move within its
            own container's box. `self-start` shrinks the cell to the form's height
            (632px), and once the two are equal there is no room to scroll and
            `position: sticky` has no effect at all — the element just flows away
            with the page.

            Measured: with self-start the cell is 632px, without it 3172px; in the
            first the form tracks scrolling exactly, in the second it pins at 72px.
          */}
          {/*
            * Two presentations of one rail.
            *
            * On a wide screen it is the column it has always been. On a narrow one
            * the grid collapses and the full rail — nine topics, eight document
            * types, seven years, a date range — used to stand between the search
            * box and the results, so a search pushed its own answers off screen.
            * There it becomes a button, a sheet, and a row of chips for whatever
            * is applied.
            *
            * Both copies are in the DOM at once, which is why they take a `scope`:
            * the date inputs carry ids and two elements cannot share one.
            */}
          <div className="min-w-0">
            {/*
              * `lg:h-full` — the sticky rail's CONTAINING BLOCK, and it has to be
              * the tall one.
              *
              * The grid cell is stretched to the results' height, but this
              * wrapper is a plain block that shrinks to the form inside it. A
              * sticky element can only move within its own container's box, so
              * with the two the same height there was nowhere to move and the
              * rail scrolled away with the page. It is the same failure the note
              * above describes about `self-start`, arriving through a different
              * door: the wrapper was added to hold the wide/narrow split and
              * quietly became the container.
              *
              * Measured before the fix: cell 781px, form 781px, and the rail's
              * top went 95px → -1105px over a 1200px scroll instead of pinning.
              */}
            <div className="hidden lg:block lg:h-full">
              {empty ? (
                <ActiveFilterChips params={params} pinNames={pinNames} />
              ) : (
                <SearchFilters
                  params={params}
                  facets={result.facets}
                  coverage={coverage}
                  scope="rail"
                />
              )}
            </div>

            <div className="flex flex-col gap-3.5 lg:hidden">
              <FilterSheet activeCount={activeFilterCount(params)}>
                <SearchFilters
                  params={params}
                  facets={result.facets}
                  coverage={coverage}
                  scope="sheet"
                />
              </FilterSheet>
              {/*
                * Outside the sheet, so what is applied is readable without opening
                * anything — and each chip's × removes that one filter and applies
                * the result straight away.
                */}
              <ActiveFilterChips params={params} pinNames={pinNames} />
            </div>
          </div>

          <div className="min-w-0">
            {empty ? (
              <EmptyResults query={built.raw} normalized={built.normalized} params={params} />
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3.5">
                  {/*
                    * The words are NAMED here, not only chipped.
                    *
                    * With the query moved into the rail — and the rail behind a
                    * button on a phone — the count line was the only sentence at
                    * the top of the results, and "785 kayıt bulundu" does not say
                    * what for. The chip above can be removed; this cannot, so it
                    * is the one place the page always states what it answered.
                    */}
                  <p className="m-0 text-base text-ink-muted">
                    {built.raw ? <span className="text-ink">“{built.raw}” için </span> : null}
                    <span className="font-semibold text-ink">
                      {formatCount(result.total)}
                      {result.capped ? '+' : ''} kayıt
                    </span>{' '}
                    bulundu
                  </p>
                  <SortLinks
                    active={params.sirala}
                    hrefFor={(option) => buildSearchHref(params, { sirala: option, sayfa: 1 })}
                  />
                </div>

                <RecordList
                  records={result.items}
                  adSlotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED}
                  emptyMessage="Bu filtrelerle kayıt yok. Filtreleri gevşetmeyi deneyin."
                />

                <div className="mt-[22px] flex flex-col items-center gap-3.5">
                  <Pagination
                    className="justify-center"
                    page={params.sayfa}
                    totalPages={Math.min(totalPages, 500)}
                    hrefFor={(page) => buildSearchHref(params, { sayfa: page })}
                  />
                  {built.raw ? (
                    <Link href="/takip" className="text-base">
                      Bu aramayı takibe al
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Turns the entity slugs in the URL into the names a chip can print.
 *
 * These arrive when an entity page's rail is submitted — the rail hands its
 * filters to this screen with the entity still pinned. All three lookups are
 * cached by slug, and none of them runs unless the pin is actually there.
 */
async function resolvePinNames(params: SearchParams): Promise<PinNames> {
  const [kurum, sirket, yer] = await Promise.all([
    params.kurum ? getEntity('institution', params.kurum) : null,
    params.sirket ? getEntity('company', params.sirket) : null,
    params.yer ? getEntity('place', params.yer) : null,
  ]);

  return { kurum: kurum?.name, sirket: sirket?.name, yer: yer?.name };
}

/**
 * Empty results — artboard 1f.
 *
 * The design's decision: rather than stop at "no results found", offer four ways
 * out. In order: a spelling suggestion (trigram), clearing filters, entering by
 * topic, searching by reference number. At the bottom, turning the search into an
 * alert.
 */
async function EmptyResults({
  query,
  normalized,
  params,
}: {
  query: string;
  normalized: string;
  params: Awaited<ReturnType<typeof searchParamsSchema.parse>>;
}) {
  const suggestion = await suggestSimilar(normalized);
  const suggestionCount = suggestion ? await countForQuery(suggestion.title) : 0;
  const filtersOpen = hasActiveFilters(params);

  return (
    <div>
      <p className="m-0 border-b border-line pb-[18px] text-md text-ink-muted">
        <span className="font-semibold text-ink">{query}</span> için kayıt yok.
      </p>

      {suggestion ? (
        <p className="mt-[22px] text-3xl leading-[1.4] text-ink">
          Bunu mu demek istediniz:{' '}
          <Link
            href={buildSearchHref({ q: suggestion.summary ?? suggestion.title })}
            className="font-semibold"
          >
            {suggestion.summary ?? suggestion.title}
          </Link>
          {suggestionCount > 0 ? (
            <span className="text-md text-ink-muted"> — {formatCount(suggestionCount)} kayıt</span>
          ) : null}
        </p>
      ) : null}

      <section className="mt-[26px]">
        <h2 className="mb-3 text-md font-semibold text-ink">Başka yollar</h2>
        <ul className="flex flex-col gap-2.5 text-md leading-[1.5] text-ink-body">
          {filtersOpen ? (
            <li>
              Filtreleri kaldırın:{' '}
              <Link href={buildSearchHref({ q: query })}>hepsini temizle</Link>
              <span className="text-ink-muted"> — açık filtreler aramayı daraltıyor.</span>
            </li>
          ) : null}
          <li>
            Konudan girin:{' '}
            {TOPIC_LIST.slice(0, 3).map((topic, index) => (
              <span key={topic.slug}>
                {index > 0 ? ', ' : ''}
                <Link href={'/konu/' + topic.slug}>{topic.name}</Link>
              </span>
            ))}
            <span className="text-ink-muted"> akışları kronolojik.</span>
          </li>
          <li>
            Referans numarası biliyorsanız doğrudan yazın, örnek{' '}
            <span className="font-semibold">A.E. 1064</span>.
          </li>
          <li>
            Yer ya da kurum adıyla deneyin — kayıtların çoğu bir köy, kurum ya da şirket adıyla
            yayımlanıyor.
          </li>
        </ul>
      </section>

      <FollowCard
        className="mt-[30px]"
        title="Bu aramayı takibe alın"
        description="Bugün kayıt yok, yarın olabilir. Bu arama için yeni kayıt yayımlandığında haber veririz."
        subject={{ label: query, query }}
      />

      <RssCard className="mt-[18px]" href="/rss.xml" />
    </div>
  );
}
