import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { FollowDialog } from '@/components/follow-dialog';
import { Pagination } from '@/components/pagination';
import { RecordList } from '@/components/record-list';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SortLinks } from '@/components/sort-links';
import { TopicFilters } from '@/components/topic-filters';
import { TOPICS, type DeadlineState, type TopicSlug } from '@/lib/constants/topics';
import { TOPIC_FAQ } from '@/lib/content/topic-faq';
import type { DocType } from '@/lib/constants/doc-types';
import { archiveCoverage, coverageRange } from '@/lib/db/queries/coverage';
import { countRecords, listRecords, searchFacets } from '@/lib/db/queries/records';
import { formatCount } from '@/lib/db/queries/shared';
import { DEFAULT_SORT, parseSearchParams, type SortOption } from '@/lib/search/build-query';
import { PAGE_SIZE } from '@/lib/seo/config';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/json-ld';
import { pageHref } from '@/lib/seo/pagination';
import { formatDateLong } from '@/lib/text/dates';

/**
 * The topic feed — one template behind four routes.
 *
 * THE PAGE NUMBER AND THE STATUS FILTER LIVE IN THE PATH; the date range and the
 * sort are a query string. The split is not arbitrary — a status and a page number
 * enumerate, so they can be route segments, and a date range cannot.
 *
 *   /konu/munhal                          page 1, unfiltered
 *   /konu/munhal/sayfa/2                  page 2, unfiltered
 *   /konu/munhal/acik                     page 1, applications still open
 *   /konu/munhal/kapali                   page 1, deadline passed
 *   /konu/munhal?baslangic=…&sirala=eski  filtered and reordered
 *
 * ⚠️ Reading a query string costs the route its static caching, and that is why
 * the first three were moved into the path in the first place. The rail brought
 * the cost back knowingly; the measurement and the way out are recorded in
 * app/konu/[konu]/page.tsx.
 *
 * `/konu/[konu]/acik` and `/konu/[konu]/kapali` win over `/konu/[konu]/[yil]`
 * because Next matches a static segment before a dynamic one, and `[yil]` would
 * have rejected either word anyway — parseYear only accepts a year inside the
 * archive's range.
 */

/** The one place the topic URL shape is written. */
export function topicHref(
  konu: string,
  options: {
    durum?: DeadlineState;
    page?: number;
    baslangic?: string;
    bitis?: string;
    tur?: readonly DocType[];
    sirala?: SortOption;
  } = {},
): string {
  const base = '/konu/' + konu + (options.durum ? '/' + options.durum : '');
  const path = pageHref(base, options.page ?? 1);

  /*
   * The page number and the status filter stay in the PATH; the range and the
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
  durum,
  baslangic,
  bitis,
  tur = [],
  sirala = DEFAULT_SORT,
}: {
  konu: TopicSlug;
  page: number;
  /** The applied application status, or undefined for the unfiltered feed. */
  durum?: DeadlineState;
  /** The rail's custom range; absent on the prerendered address. */
  baslangic?: string;
  bitis?: string;
  tur?: DocType[];
  sirala?: SortOption;
}) {
  const topic = TOPICS[konu];
  const faq = TOPIC_FAQ[konu] ?? [];

  /*
   * The status filter is only meaningful for topics that carry a deadline (spec
   * 3.9): vacancies and tenders. Elsewhere the rail does not show it at all —
   * there a deadline is not merely absent, it is not a property of the document.
   */
  const supportsDeadline = konu === 'munhal' || konu === 'ihale';
  const applied = supportsDeadline ? durum : undefined;

  /*
   * The rail's document-type counts, scoped to this topic and its date range but
   * NOT to the type selection — the same "exclude its own filter" rule the search
   * rail follows, without which ticking one type would leave that type as the
   * only option and there would be no way to add a second.
   */
  const [records, total, openCount, closedCount, allCount, coverage, facets] = await Promise.all([
    listRecords({
      topic: konu,
      deadlineState: applied,
      baslangic,
      bitis,
      tur,
      sirala,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countRecords({ topic: konu, deadlineState: applied, baslangic, bitis, tur }),
    /*
     * THE THREE RAIL COUNTS IGNORE THE STATUS THAT IS APPLIED but keep the rest
     * of the rail's narrowing — the same "exclude its own filter" rule the
     * document-type facets follow. Counting them under the applied status would
     * make every option but the active one read zero, which is the one number
     * that cannot help anyone choose.
     */
    supportsDeadline
      ? countRecords({ topic: konu, deadlineState: 'acik', baslangic, bitis, tur })
      : Promise.resolve(0),
    supportsDeadline
      ? countRecords({ topic: konu, deadlineState: 'kapali', baslangic, bitis, tur })
      : Promise.resolve(0),
    supportsDeadline
      ? countRecords({ topic: konu, baslangic, bitis, tur })
      : Promise.resolve(0),
    archiveCoverage(konu),
    searchFacets(parseSearchParams({ konu, baslangic, bitis })),
  ]);

  /*
   * The rail's status rows. Built here rather than in the rail because only this
   * component knows the topic, the counts and how a topic address is spelled;
   * TopicFilters stays a renderer of what it is handed.
   *
   * "Tümü" carries the unfiltered total, so the three numbers do not add up —
   * and should not. A record with no deadline at all is in neither of the other
   * two rows, and in münhal that is almost every record.
   */
  const statusOptions = supportsDeadline
    ? [
        { key: 'tumu', label: 'Tümü', n: allCount, href: topicHref(konu, { baslangic, bitis, tur, sirala }), active: !applied },
        { key: 'acik', label: 'Başvurusu açık', n: openCount, href: topicHref(konu, { durum: 'acik', baslangic, bitis, tur, sirala }), active: applied === 'acik' },
        { key: 'kapali', label: 'Süresi dolmuş', n: closedCount, href: topicHref(konu, { durum: 'kapali', baslangic, bitis, tur, sirala }), active: applied === 'kapali' },
      ]
    : [];

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
    topicHref(konu, { durum: applied, page: nextPage, baslangic, bitis, tur, sirala });

  /*
   * Changing the sort returns to page 1 — page 4 of "newest first" has nothing to
   * do with page 4 of "oldest first", and landing there would look like the list
   * jumped. The date range is carried across, because it is a different question.
   */
  const sortHref = (option: SortOption) =>
    topicHref(konu, { durum: applied, baslangic, bitis, tur, sirala: option });

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <div className="grid items-start gap-10 lg:grid-cols-feed">
          {/*
            * The rail comes FIRST in the source as well as on screen, so tab order
            * and reading order agree with the layout.
            */}
          <TopicFilters
            action={topicHref(konu, { durum: applied })}
            clearHref={topicHref(konu)}
            statusOptions={statusOptions}
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
              {/*
                * "Takip et" joins the count line rather than getting a block of
                * its own. It is one line at the top of the feed instead of a card
                * at the bottom nobody scrolls to, or a column pinned beside the
                * reading — see components/follow-dialog for how it got here.
                */}
              <div className="flex items-baseline gap-x-[18px]">
                <FollowDialog
                  label="Bu konuyu takip et"
                  title="Bu konuyu takip et"
                  description={
                    'Yeni ' +
                    topic.name.toLocaleLowerCase('tr') +
                    ' kaydı yayımlandığı gün haber veririz.'
                  }
                  subject={{ label: topic.name, topic: konu }}
                  rssHref={'/konu/' + konu + '/rss.xml'}
                />
                <SortLinks active={sirala} hrefFor={sortHref} />
              </div>
            </div>

            {/*
              THE STATUS FILTER ITSELF NOW LIVES IN THE RAIL, with the document
              types and the date range, because that is what it is — a way of
              narrowing the list, not a mode the page is in. What stays here is
              only the explanation, and only while "açık" is empty.

              It has to stay even at zero, and the reason is the measurement.
              Münhal holds 1.527 records and 19 of them have body text (9 Eylül
              2026); the deadline is read from that text, so the count cannot rise
              until the text does. Without this note a visitor reads the empty
              list as "no vacancy is open" when the truth is "we cannot read the
              vacancies" — and only the second answer sends them to the PDF, which
              1.440 of those records already link to.

              Worded to hold for both topics: münhal's dates are unreadable,
              ihale's have simply passed, and the sentence claims only the
              mechanism, which is true of each.
            */}
            {supportsDeadline && openCount === 0 ? (
              <p className="m-0 mt-[26px] max-w-lede rounded border border-notice-border bg-notice px-3.5 py-2.5 text-sm leading-[1.6] text-notice-ink">
                Başvuru tarihini kaydın gövde metninden okuyoruz; metni taranmış görüntü
                olarak yayımlanan ilanlarda bu tarih çıkmıyor. &ldquo;Başvurusu açık&rdquo;
                boş diye süresi açık ilan yok demek değil — ilanın kendisi ve orijinal{' '}
                <Link href="/sayilar">gazete PDF&apos;i</Link> her kaydın sayfasında duruyor.
              </p>
            ) : null}

            <RecordList
              records={records}
              hideTopic
              showDeadline={supportsDeadline}
              adSlotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED}
              emptyMessage={
                applied === 'acik'
                  ? 'Başvurusu açık kayıt yok.'
                  : applied === 'kapali'
                    ? 'Başvuru süresi dolmuş kayıt yok.'
                    : 'Bu konuda henüz kayıt yok.'
              }
            />

            <Pagination className="mt-[22px]" page={page} totalPages={totalPages} hrefFor={hrefFor} />

            {/*
              * The questions people actually arrive with, ON PAGE ONE ONLY.
              *
              * Repeating them under every page of a paginated feed would put the
              * same FAQPage block at a dozen addresses, which is duplicate content
              * and, worse, a dozen machine-readable copies of one answer. Page one
              * is the address the sitemap carries and the one crawlers land on.
              *
              * They sit BELOW the records: the feed is what the page is for, and a
              * visitor who came for the newest kayıt should not have to scroll past
              * explanations to reach it.
              */}
            {page === 1 && faq.length ? (
              <section className="mt-10 border-t border-line pt-6">
                <h2 className="m-0 text-3xl font-semibold text-ink">Sık sorulanlar</h2>
                <dl className="mt-4 flex max-w-prose flex-col gap-5">
                  {faq.map((item) => (
                    <div key={item.question}>
                      <dt className="text-md font-semibold text-ink">{item.question}</dt>
                      <dd className="m-0 mt-1.5 text-base leading-[1.6] text-ink-body">
                        {item.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}


            {supportsDeadline && openCount > 0 ? (
              <p className="mt-8 border-t border-line pt-4 text-sm leading-[1.55] text-ink-muted">
                Başvuru tarihleri kayıt metninden çıkarılmıştır. Kesin tarih için resmî
                PDF&apos;e bakın.
              </p>
            ) : null}
          </div>

          {/*
            * The follow and RSS cards travel with the scroll, the way the home
            * page's side column does. They are the page's two actions and the
            * feed above them is hundreds of rows long; anchored at the top they
            * were only reachable by scrolling back.
            *
            * TWO ELEMENTS, DELIBERATELY. The <aside> is the tall one and the div
            * inside it is what sticks — a sticky element can only move inside its
            * own containing block, and this grid is `items-start`, which shrinks
            * the cell to its content and leaves nothing to move in. `lg:h-full`
            * resolves against the grid area, so the cell takes the row's height
            * whatever the alignment says. Same trap as the filter rail's, written
            * up in /ara/page.tsx.
            *
            * The height cap plus its own scroller is for short windows: the two
            * cards are around 500px and a pinned column taller than the viewport
            * would hide its own bottom with no way to reach it.
            */}
        </div>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      {/* Emitted only where the questions are actually rendered — see above. */}
      {page === 1 && faq.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faq)) }}
        />
      ) : null}
    </>
  );
}
