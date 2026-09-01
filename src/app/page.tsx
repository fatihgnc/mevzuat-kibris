import Link from "next/link";

import { AdSlot } from "@/components/ad-slot";
import { FollowCard } from "@/components/follow-card";
import { IssueCard } from "@/components/issue-card";
import { RecordCard } from "@/components/record-card";
import { SearchBox } from "@/components/search-box";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusBar } from "@/components/status-bar";
import { TopicStrip } from "@/components/topic-strip";
import {
  listRecords,
  popularQueries,
  siteStatus,
  topicCounts,
} from "@/lib/db/queries/records";
import { topEntities } from "@/lib/db/queries/entities";
import {
  archiveCoverage,
  coverageSentence,
  coverageShort,
} from "@/lib/db/queries/coverage";

// ISR + tag: when ingest finishes, revalidateTag('latest') refreshes this page (spec 11.1).
export const revalidate = 3600;

export default async function HomePage() {
  const [status, recent, counts, institutions, popular, coverage] =
    await Promise.all([
      siteStatus(),
      listRecords({ limit: 6 }),
      topicCounts(),
      topEntities("institution", 20),
      popularQueries(3),
      archiveCoverage(),
    ]);

  return (
    <>
      <SiteHeader />

      <main
        id="icerik"
        className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-8 sm:pt-12 lg:px-10"
      >
        <h1 className="m-0 mb-2.5 max-w-[22em] text-4xl font-semibold leading-[1.25] tracking-tightest text-ink sm:text-5xl">
          Resmî Gazete&apos;de ne yayımlandığını arayın
        </h1>
        <p className="mb-[22px] max-w-lede text-xl leading-[1.55] text-ink-muted">
          KKTC Resmî Gazete&apos;si yalnızca PDF olarak yayımlanıyor. Biz her
          sayıyı indirip metne çeviriyor, kararlara ayırıyor ve aranabilir hale
          getiriyoruz. {coverageSentence(coverage)}
        </p>

        <SearchBox />

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

        <div className="mt-11 grid gap-10 lg:grid-cols-page">
          <div className="min-w-0">
            <section>
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
            The side column is sticky. The sticky element CANNOT BE THE ASIDE
            ITSELF: the aside is a grid cell and the cell stretches to the row
            height, so the element and its container end up the same size and there
            is no room to scroll. The stickiness therefore lives on an inner wrapper;
            the aside stays as the stretched container and the block inside moves
            within it.

            The height limit plus its own scrolling has the same rationale as the
            filter rail: if the content is taller than the window, its lower part
            would become unreachable.
          */}
          <aside>
            <div className="flex flex-col gap-[18px] lg:sticky lg:top-[var(--sticky-top)] lg:max-h-[calc(100vh-var(--sticky-top)-1rem)] lg:overflow-y-auto">
              {status.latestIssue ? (
                <IssueCard
                  year={status.latestIssue.year}
                  number={status.latestIssue.number}
                  publishedAt={status.latestIssue.publishedAt}
                  recordCount={status.latestIssue.recordCount}
                  pdfUrl={status.latestIssue.pdfUrl}
                />
              ) : null}

              <FollowCard
                title="Bir konuyu takibe al"
                description="Seçtiğiniz konuda ya da kelimede yeni kayıt yayımlanırsa e-posta göndeririz."
                subject={{ label: "Tüm kayıtlar" }}
                rssHref="/rss.xml"
              />

              <div className="flex flex-col gap-2.5 border-t border-line pt-4 text-sm leading-[1.5] text-ink-muted">
                <span>
                  Kayıtlar Resmî Gazete PDF&apos;lerinden otomatik çıkarılır.
                  Eski sayılarda metin taramadan okunur, hata payı vardır.
                </span>
                <span>
                  Mevzuat Kıbrıs resmî bir kurum değildir. Bağlayıcı olan,
                  gazetede yayımlanan resmî metindir.
                </span>
                <span>Ücretsiz, gelir reklamdan.</span>
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
