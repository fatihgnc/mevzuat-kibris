import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ad-slot";
import { IssueCard } from "@/components/issue-card";
import { RecordCard } from "@/components/record-card";
import { RecentVacanciesCard } from "@/components/vacancy-card";
import { SearchBox } from "@/components/search-box";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusBar } from "@/components/status-bar";
import { TopSearchCard } from "@/components/top-search-card";
import { TopicStrip } from "@/components/topic-strip";
import {
  listRecords,
  popularQueries,
  siteStatus,
  topicCounts,
} from "@/lib/db/queries/records";
import { topEntities } from "@/lib/db/queries/entities";
import { archiveCoverage, coverageShort } from "@/lib/db/queries/coverage";
import { RSS_ALTERNATE } from "@/lib/seo/metadata";
import { ARCHIVE_START_YEAR, SITE_NAME } from "@/lib/seo/config";
import { formatCount } from "@/lib/db/queries/shared";
import { googleTopRecords } from "@/lib/gsc/top-records";

/**
 * THE HOME PAGE'S OWN TITLE AND DESCRIPTION — and why they are not the site-wide
 * defaults any more.
 *
 * Measured on production, 9 Eylül 2026: Google was throwing the meta description
 * away and building the snippet out of the FOOTER instead — the "resmî bir kurum
 * değildir" disclaimer, then "Tamamen ücretsiz", then a run of navigation labels.
 * That happens when the description does not describe. The old one was a list of
 * instructions ("arama yapın", "takibi kurun") and said nothing about what is in
 * the archive, so there was nothing in it worth showing and the crawler went
 * looking for prose of its own.
 *
 * So the description now states the thing itself: how far back it goes, how many
 * records, what kinds, and what each one links to. The count is read live rather
 * than typed in — a number in a snippet is the first thing to rot, and this one
 * moves every week. `archiveCoverage` is cached and the page already calls it, so
 * generateMetadata costs no extra query.
 *
 * The title leads with "KKTC Resmi Gazete", unaccented, because that is the
 * highest-volume query in the niche and the form people actually type. It is the
 * one place on this page that spells it that way; the description keeps the
 * correct "Resmî", which is also the house style everywhere else.
 *
 * `absolute` because the root layout's template would otherwise append the brand
 * a second time to a title that already ends in it.
 *
 * NONE OF THIS FORCES GOOGLE'S HAND. It picks the snippet, and for a brand query
 * it may still quote the page. A description that describes is what makes it
 * likely to use ours; it is not a guarantee, and the way to tell is the CTR on
 * the home page's own impressions a few weeks from now.
 *
 * The canonical below used to be declared in the root layout, where every page
 * without an `alternates` block inherited it (see the note there). `types` is
 * restated because Next replaces `alternates` wholesale rather than merging into
 * it — declaring only the canonical here would drop the feed link from the one
 * page that still has it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const coverage = await archiveCoverage();

  const scope =
    coverage.totalRecords && coverage.earliestYear
      ? coverage.earliestYear + "'den bugüne " + formatCount(coverage.totalRecords) + ' kaydı'
      : 'kayıtları';

  return {
    title: { absolute: 'KKTC Resmi Gazete arşivi ve arama — ' + SITE_NAME },
    description:
      "KKTC Resmî Gazete'nin " +
      scope +
      ': yasa, tüzük, münhal, ihale, şirket. Tamamı aranabilir metin, her kayıtta orijinal PDF bağlantısı.',
    alternates: { canonical: '/', types: RSS_ALTERNATE },
  };
}

// ISR + tag: when ingest finishes, revalidateTag('latest') refreshes this page (spec 11.1).
export const revalidate = 3600;

/** The phone's quick-access row under the search box. */
const QUICK_LINKS = [
  { href: '/konu/munhal', label: 'Münhal' },
  { href: '/konu/ihale', label: 'İhale' },
  { href: '/yasa', label: 'Yasalar' },
  { href: '/tuzuk', label: 'Tüzükler' },
  { href: '/konu/sirket', label: 'Şirket' },
  { href: '/konu/atama', label: 'Atama' },
];

export default async function HomePage() {
  /*
   * Son 1 hafta (home page "son eklenen münhal ilanları" card). Filtered by
   * TOPIC, not doc_type='munhal_ilani' — a Kamu Hizmeti Komisyonu circular
   * (doc_type 'genelge', ref type 'mia') announcing a vacancy is exactly as
   * much a "münhal ilanı" to a reader as the ones filed under that doc type
   * itself; the topic classifier already groups them together (rules.ts'
   * TOPIC_KEYWORDS), which is why the topic strip's own "Münhal" count is in
   * the thousands while the doc-type facet is in the dozens.
   */
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [status, recent, counts, institutions, popular, coverage, recentVacancies, googleTop] =
    await Promise.all([
      siteStatus(),
      listRecords({ limit: 6 }),
      topicCounts(),
      topEntities("institution", 20),
      popularQueries(3),
      archiveCoverage(),
      listRecords({ topic: "munhal", baslangic: sevenDaysAgo, limit: 10 }),
      googleTopRecords(5),
    ]);

  return (
    <>
      <SiteHeader />

      <main
        id="icerik"
        className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-8 sm:pt-12 lg:px-10"
      >
        <div className="grid gap-10 lg:grid-cols-page">
          <div className="min-w-0">
            <h1 className="m-0 mb-2.5 max-w-[22em] text-4xl font-semibold leading-[1.25] tracking-tightest text-ink sm:text-5xl">
              Resmî Gazete&apos;de aradığınız bilgiye hızlıca ulaşın
            </h1>
            {/*
              * Phone: one sentence. The full paragraph ran to eight lines there
              * and pushed the search box — the thing people came to use — down to
              * 418px. It stays in the page for everything wider, and in the
              * markup for crawlers.
              */}
            <p className="mb-[18px] text-lg leading-[1.5] text-ink-muted sm:hidden">
              KKTC Resmî Gazete&apos;nin {coverage.earliestYear ?? ARCHIVE_START_YEAR}&apos;den bugüne
              tüm sayıları aradığınızı kolayca bulabileceğiniz şekilde elinizde.
            </p>
            <p className="mb-[22px] hidden max-w-lede text-xl leading-[1.55] text-ink-muted sm:block">
              KKTC&apos;de Resmî Gazete, yalnızca PDF olarak yayımlanıyor ve hiçbir
              filtreleme, sınıflandırma veya arama gibi sizi aradığınız bilgiye
              hızlıca ulaştıracak özellikleri barındırmıyor. Biz her sayıyı indirip
              metne çeviriyor, yer, tür, kurum gibi bir çok başlığa göre
              sınıflandırıyor, aranabilir hale getiriyoruz.{' '}
              {coverage.earliestYear ?? ARCHIVE_START_YEAR}&apos;den bugüne kadar
              yayımlanan sayıların yanı sıra, eklenen her yeni sayı sitemizde anlık
              olarak listeleniyor.
            </p>

            <SearchBox />

            {/*
              * Phone: one tap to the sections most visits are for, without
              * scrolling. A single row that scrolls sideways rather than wraps,
              * so it costs one line of height however many there are.
              */}
            <nav
              aria-label="Hızlı erişim"
              className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
            >
              {QUICK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 rounded-pill border border-line-strong bg-surface px-3.5 py-1.5 text-base font-medium text-ink no-underline transition-colors hover:border-accent hover:text-link hover:no-underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {popular.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base text-ink-muted">
                <span>Sık aranan:</span>
                {popular.map((query) => (
                  <Link key={query} href={"/ara?q=" + encodeURIComponent(query)}>
                    {query}
                  </Link>
                ))}
              </div>
            ) : null}

            {/*
              * Phone: the vacancies card up here rather than in the side column,
              * which on a phone comes after everything else — it used to start
              * 2972px down, three and a half screens in. The copy in the aside
              * is hidden below lg, so each screen shows exactly one.
              */}
            <RecentVacanciesCard records={recentVacancies.slice(0, 5)} className="mt-8 lg:hidden" />

            <section className="mt-11">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <h2 className="m-0">
                  <StatusBar initialCount={status.todayCount} />
                </h2>
                <Link href="/ara?sirala=yeni" className="text-base">
                  Tümü
                </Link>
              </div>
              <div className="flex flex-col">
                {recent.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    variant="compact"
                  />
                ))}
              </div>
            </section>

            {/* Phone: before the topics, for the same reason as the vacancies card above. */}
            <TopSearchCard items={googleTop} className="mt-9 lg:hidden" />

            <section className="mt-9">
              <h2 className="border-b border-line pb-3 text-md font-semibold text-ink">
                Konular
              </h2>
              {/*
                The grid used to overflow its container by 16px via `-mx-4`; the
                cells' `px-4` padding pulled the text back in, so the text stayed
                aligned but the cell BACKGROUND hung outside. On hover that overhang
                became visible: the highlighted ground started to the left of the
                "Konular" heading and of the page's edge line.

                The overflow was removed — the grid now starts on the same line as
                the container. The text sits inset by the cell padding (16px); that
                is less jarring than a background spilling outside the layout.
              */}
              <TopicStrip counts={counts} />
            </section>

            <AdSlot
              kind="in-article"
              slotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_HOME}
              className="mt-10"
            />
          </div>

          {/*
            The side column is NOT sticky. It was — pinned under the header with a
            height cap and its own scroll — but three cards stacked are taller than
            most windows, so the last one was cut off and only reachable by
            scrolling inside the column, which nothing on screen suggested (the
            scrollbar was hidden). Left in normal flow it simply scrolls with the
            page and every card is reachable.
          */}
          <aside>
            <div className="flex flex-col gap-[18px]">
              {status.latestIssue ? (
                <IssueCard
                  year={status.latestIssue.year}
                  number={status.latestIssue.number}
                  publishedAt={status.latestIssue.publishedAt}
                  recordCount={status.latestIssue.recordCount}
                  pdfUrl={status.latestIssue.pdfUrl}
                />
              ) : null}

              <RecentVacanciesCard records={recentVacancies} className="hidden lg:block" />

              <TopSearchCard items={googleTop} className="hidden lg:block" />

              <div className="hidden flex-col gap-2.5 border-t border-line pt-4 text-sm leading-[1.5] text-ink-muted lg:flex">
                <span>
                  Kayıtlar Resmî Gazete kaynaklarından otomatik çıkarılır, hata payı vardır.
                </span>
                <span>Tamamen ücretsiz.</span>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter
        institutions={institutions}
        coverage={coverageShort(coverage)}
      />
    </>
  );
}
