import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { FollowCard } from '@/components/follow-card';
import { RssCard } from '@/components/rss-card';
import { Pagination } from '@/components/pagination';
import { RecordList } from '@/components/record-list';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SortLinks } from '@/components/sort-links';
import { TopicFilters } from '@/components/topic-filters';
import { TOPICS, type TopicSlug } from '@/lib/constants/topics';
import type { DocType } from '@/lib/constants/doc-types';
import { archiveCoverage, coverageRange } from '@/lib/db/queries/coverage';
import { countRecords, listRecords, searchFacets } from '@/lib/db/queries/records';
import { formatCount } from '@/lib/db/queries/shared';
import { DEFAULT_SORT, parseSearchParams, type SortOption } from '@/lib/search/build-query';
import { PAGE_SIZE } from '@/lib/seo/config';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageHref } from '@/lib/seo/pagination';
import { formatDateLong } from '@/lib/text/dates';
import { cn } from '@/lib/utils';

/**
 * The topic feed — one template behind four routes.
 *
 * THE PAGE NUMBER AND THE "acik" FILTER LIVE IN THE PATH; the date range and the
 * sort are a query string. The split is not arbitrary — `acik` and a page number
 * enumerate, so they can be route segments, and a date range cannot.
 *
 *   /konu/munhal                          page 1, unfiltered
 *   /konu/munhal/sayfa/2                  page 2, unfiltered
 *   /konu/munhal/acik                     page 1, open only
 *   /konu/munhal?baslangic=…&sirala=eski  filtered and reordered
 *
 * ⚠️ Reading a query string costs the route its static caching, and that is why
 * the first three were moved into the path in the first place. The rail brought
 * the cost back knowingly; the measurement and the way out are recorded in
 * app/konu/[konu]/page.tsx.
 *
 * `/konu/[konu]/acik` wins over `/konu/[konu]/[yil]` because Next matches a static
 * segment before a dynamic one, and `[yil]` would have rejected "acik" anyway —
 * parseYear only accepts a year inside the archive's range.
 */

/** The one place the topic URL shape is written. */
export function topicHref(
  konu: string,
  options: {
    openOnly?: boolean;
    page?: number;
    baslangic?: string;
    bitis?: string;
    tur?: readonly DocType[];
    sirala?: SortOption;
  } = {},
): string {
  const base = '/konu/' + konu + (options.openOnly ? '/acik' : '');
  const path = pageHref(base, options.page ?? 1);

  /*
   * The page number and the "acik" filter stay in the PATH; the range and the
   * sort are a query string. They have to be — a date range does not enumerate,
   * so it could never have been a route segment the way `acik` is.
   *
   * The default sort is left OUT rather than written as `?sirala=yeni`. One list
   * must have one address: emitting the default would give the unfiltered feed
   * two spellings, and Google would have to be told which of them is canonical.
   */
  const search = new URLSearchParams();
  if (options.baslangic) search.set('baslangic', options.baslangic);
  if (options.bitis) search.set('bitis', options.bitis);
  /*
   * Repeated, not comma-joined. The schema accepts either, but a repeated key is
   * what the rail's own checkboxes submit, so the address a link builds and the
   * address the form builds are the same string for the same selection.
   */
  for (const type of options.tur ?? []) search.append('tur', type);
  if (options.sirala && options.sirala !== DEFAULT_SORT) search.set('sirala', options.sirala);

  const qs = search.toString();
  return qs ? path + '?' + qs : path;
}

export async function TopicPage({
  konu,
  page,
  openOnly,
  baslangic,
  bitis,
  tur = [],
  sirala = DEFAULT_SORT,
}: {
  konu: TopicSlug;
  page: number;
  openOnly: boolean;
  /** The rail's custom range; absent on the prerendered address. */
  baslangic?: string;
  bitis?: string;
  tur?: DocType[];
  sirala?: SortOption;
}) {
  const topic = TOPICS[konu];

  /*
   * The "applications open" filter is only meaningful for topics that carry a
   * deadline (spec 3.9): vacancies and tenders. It is not shown at all for other
   * topics, because a filter that will always return zero results misleads the user.
   */
  const supportsDeadline = konu === 'munhal' || konu === 'ihale';

  /*
   * The rail's document-type counts, scoped to this topic and its date range but
   * NOT to the type selection — the same "exclude its own filter" rule the search
   * rail follows, without which ticking one type would leave that type as the
   * only option and there would be no way to add a second.
   */
  const [records, total, openCount, coverage, facets] = await Promise.all([
    listRecords({
      topic: konu,
      openDeadlineOnly: supportsDeadline && openOnly,
      baslangic,
      bitis,
      tur,
      sirala,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countRecords({
      topic: konu,
      openDeadlineOnly: supportsDeadline && openOnly,
      baslangic,
      bitis,
      tur,
    }),
    supportsDeadline ? countRecords({ topic: konu, openDeadlineOnly: true }) : Promise.resolve(0),
    archiveCoverage(konu),
    searchFacets(parseSearchParams({ konu, baslangic, bitis })),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const latest = records[0];
  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    // '/konu', not '/' — pointing both crumbs at the home page put two ListItems
    // with the same URL into the BreadcrumbList and wasted the link to the hub.
    { name: 'Konular', href: '/konu' },
    { name: topic.name },
  ];

  const hrefFor = (nextPage: number) =>
    topicHref(konu, { openOnly, page: nextPage, baslangic, bitis, tur, sirala });

  /*
   * Changing the sort returns to page 1 — page 4 of "newest first" has nothing to
   * do with page 4 of "oldest first", and landing there would look like the list
   * jumped. The date range is carried across, because it is a different question.
   */
  const sortHref = (option: SortOption) =>
    topicHref(konu, { openOnly, baslangic, bitis, tur, sirala: option });

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <div className="grid items-start gap-10 lg:grid-cols-topic">
          {/*
            * The rail comes FIRST in the source as well as on screen, so tab order
            * and reading order agree with the layout.
            */}
          <TopicFilters
            action={topicHref(konu, { openOnly })}
            baslangic={baslangic}
            bitis={bitis}
            tur={tur}
            docTypes={facets.docTypes}
            coverage={coverage}
          />

          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
                {topic.name}
              </h1>
            </div>

            {/* The original topic description — so the page is not thin content (spec 8.2, 14.5). */}
            <p className="mt-3 max-w-prose text-xl leading-[1.6] text-ink-body">
              {topic.description}
            </p>

            {/*
              * Count on the left, sort on the right — the shape the search results
              * use. The sort joins THIS line rather than getting a strip of its
              * own: this line already states the count, and a second one below it
              * printed the same number twice in consecutive rows.
              */}
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-[18px] gap-y-2 border-b border-line pb-3.5 text-base text-ink-muted">
              <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
                <span>
                  <span className="font-semibold text-ink">{formatCount(total)} kayıt</span>
                  {coverageRange(coverage) ? ', ' + coverageRange(coverage) : null}
                </span>
                {latest ? (
                  <>
                    <span aria-hidden className="h-3 w-px bg-line" />
                    <span>Son kayıt {formatDateLong(latest.publishedAt)}</span>
                  </>
                ) : null}
              </div>
              <SortLinks active={sirala} hrefFor={sortHref} />
            </div>

            {/*
              Showing a filter button with a count of zero is pointless: clicking it
              returns an empty list. A deadline can only be extracted from the BODY of
              a vacancy/tender record (extractDeadline); it cannot be extracted from a
              record with no body, and right now the archive holds exactly one record
              with a date — so the button said "0" almost every time.

              The openOnly condition keeps the button from disappearing WHILE the
              filter is on — otherwise the user is stranded on an empty list with no
              button to go back.
            */}
            {supportsDeadline && (openCount > 0 || openOnly) ? (
              <div className="mb-1 mt-[26px] flex flex-wrap items-center gap-2 border-b border-line pb-3.5">
                <Link
                  href={topicHref(konu, { openOnly: true })}
                  className={cn(
                    'rounded-pill px-3.5 py-1.5 text-base no-underline hover:no-underline',
                    openOnly
                      ? 'bg-ink font-semibold text-surface hover:text-surface'
                      : 'border border-line text-ink-body hover:border-accent hover:text-accent',
                  )}
                >
                  Başvurusu açık, {openCount}
                </Link>
                <Link
                  href={topicHref(konu, { openOnly: false })}
                  className={cn(
                    'rounded-pill px-3.5 py-1.5 text-base no-underline hover:no-underline',
                    !openOnly
                      ? 'bg-ink font-semibold text-surface hover:text-surface'
                      : 'border border-line text-ink-body hover:border-accent hover:text-accent',
                  )}
                >
                  Tüm kayıtlar
                </Link>
              </div>
            ) : null}

            <RecordList
              records={records}
              hideTopic
              showDeadline={supportsDeadline}
              adSlotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED}
              emptyMessage={
                openOnly
                  ? 'Şu anda başvurusu açık kayıt yok. Tüm kayıtlara bakın.'
                  : 'Bu konuda henüz kayıt yok.'
              }
            />

            <Pagination className="mt-[22px]" page={page} totalPages={totalPages} hrefFor={hrefFor} />

          </div>

          <aside className="flex flex-col gap-[18px]">
            <FollowCard
              title="Bu konuyu takip et"
              description={'Yeni ' + topic.name.toLocaleLowerCase('tr') + ' kaydı yayımlandığı gün haber veririz.'}
              subject={{ label: topic.name, topic: konu }}
            />

            <RssCard href={'/konu/' + konu + '/rss.xml'} />

            {supportsDeadline && openCount > 0 ? (
              <p className="border-t border-line pt-4 text-sm leading-[1.55] text-ink-muted">
                Başvuru tarihleri kayıt metninden çıkarılmıştır. Kesin tarih için resmî PDF&apos;e
                bakın.
              </p>
            ) : null}
          </aside>
        </div>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}
