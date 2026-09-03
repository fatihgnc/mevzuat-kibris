import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { FollowCard } from '@/components/follow-card';
import { Pagination } from '@/components/pagination';
import { RecordList } from '@/components/record-list';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { YearNav } from '@/components/year-nav';
import { TOPICS, type TopicSlug } from '@/lib/constants/topics';
import { archiveCoverage, coverageRange } from '@/lib/db/queries/coverage';
import { countRecords, listRecords } from '@/lib/db/queries/records';
import { formatCount } from '@/lib/db/queries/shared';
import { ARCHIVE_START_YEAR, PAGE_SIZE, SITE_URL } from '@/lib/seo/config';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { pageHref } from '@/lib/seo/pagination';
import { formatDateLong } from '@/lib/text/dates';
import { cn } from '@/lib/utils';

/**
 * The topic feed — one template behind four routes.
 *
 * BOTH THE PAGE NUMBER AND THE FILTER LIVE IN THE PATH, and they have to. A route
 * that reads `searchParams` cannot be prerendered, so while this page took
 * `?sayfa=` and `?filtre=` from the query string it was rendered from scratch on
 * every request — despite the `revalidate` above it and `generateStaticParams`
 * listing all nine topics. Moving only the page number would not have been enough:
 * one remaining query read keeps the whole route dynamic.
 *
 *   /konu/munhal                  page 1, unfiltered   <- prerendered
 *   /konu/munhal/sayfa/2          page 2, unfiltered
 *   /konu/munhal/acik             page 1, open only
 *   /konu/munhal/acik/sayfa/2     page 2, open only
 *
 * `/konu/[konu]/acik` wins over `/konu/[konu]/[yil]` because Next matches a static
 * segment before a dynamic one, and `[yil]` would have rejected "acik" anyway —
 * parseYear only accepts a year inside the archive's range.
 */

/** The one place the topic URL shape is written. */
export function topicHref(
  konu: string,
  options: { openOnly?: boolean; page?: number } = {},
): string {
  const base = '/konu/' + konu + (options.openOnly ? '/acik' : '');
  return pageHref(base, options.page ?? 1);
}

export async function TopicPage({
  konu,
  page,
  openOnly,
}: {
  konu: TopicSlug;
  page: number;
  openOnly: boolean;
}) {
  const topic = TOPICS[konu];

  /*
   * The "applications open" filter is only meaningful for topics that carry a
   * deadline (spec 3.9): vacancies and tenders. It is not shown at all for other
   * topics, because a filter that will always return zero results misleads the user.
   */
  const supportsDeadline = konu === 'munhal' || konu === 'ihale';

  const [records, total, openCount, coverage] = await Promise.all([
    listRecords({
      topic: konu,
      openDeadlineOnly: supportsDeadline && openOnly,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countRecords({ topic: konu, openDeadlineOnly: supportsDeadline && openOnly }),
    supportsDeadline ? countRecords({ topic: konu, openDeadlineOnly: true }) : Promise.resolve(0),
    archiveCoverage(konu),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const latest = records[0];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, index) => currentYear - index).filter(
    (year) => year >= ARCHIVE_START_YEAR,
  );

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    // '/konu', not '/' — pointing both crumbs at the home page put two ListItems
    // with the same URL into the BreadcrumbList and wasted the link to the hub.
    { name: 'Konular', href: '/konu' },
    { name: topic.name },
  ];

  const hrefFor = (nextPage: number) => topicHref(konu, { openOnly, page: nextPage });

  return (
    <>
      <SiteHeader variant="search" searchActive={false} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <div className="grid items-start gap-10 lg:grid-cols-page">
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

            <div className="mt-4 flex flex-wrap items-center gap-x-[18px] gap-y-2 text-base text-ink-muted">
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

            <div className="mt-8 border-t border-line pt-5">
              <h2 className="mb-3 text-md font-semibold text-ink">Yıla göre</h2>
              <YearNav
                years={years}
                hrefFor={(year) => '/konu/' + konu + '/' + year}
                allHref={'/konu/' + konu}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-[18px]">
            <FollowCard
              title="Bu konuyu takip et"
              description={'Yeni ' + topic.name.toLocaleLowerCase('tr') + ' kaydı yayımlandığı gün haber veririz.'}
              subject={{ label: topic.name, topic: konu }}
            />

            <div className="rounded-md border border-line bg-surface-muted p-[18px]">
              <div className="mb-1.5 text-md font-semibold text-ink">RSS</div>
              <p className="mb-3 text-sm leading-[1.5] text-ink-muted">
                E-posta vermek istemiyorsanız akışı okuyucunuza ekleyin. Aynı kayıtlar, aynı sırada.
              </p>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap rounded border border-line-strong bg-surface px-[11px] py-2.5 text-sm text-ink-body">
                {SITE_URL.replace(/^https?:\/\//, '')}/konu/{konu}/rss.xml
              </div>
              <div className="mt-2 text-sm">
                <Link href={'/konu/' + konu + '/rss.xml'}>Akışı aç</Link>
              </div>
            </div>

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
