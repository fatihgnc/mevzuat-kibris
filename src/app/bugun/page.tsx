import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { IssueSections } from '@/components/issue-sections';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getIssueSections, issuesOnDate, latestIssueDay } from '@/lib/db/queries/issues';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { formatDateLong } from '@/lib/text/dates';
import { formatIssueNumbers } from '@/lib/text/issue-numbers';

/**
 * /bugun — "today's gazette".
 *
 * Search Console, 28 days to 7 Ekim 2026: "kktc resmi gazete bugün" was the
 * biggest query in the niche (111 impressions, more than "kktc resmi gazete"
 * itself), and it was landing on the home page at position 6 with zero clicks.
 * Nothing on the site answered it: the latest issue was a small card in the home
 * page's side column, under a heading that did not say "bugün". This page is the
 * answer — every issue of the most recent publication day, in full, under a title
 * that carries the date.
 *
 * 15 minutes, not the home page's hour: whether the latest issue is TODAY's is
 * decided at render time, so a page cached the evening before would still say
 * "bugün" the next morning. Ingest also revalidates this path on every run (see
 * api/revalidate), so a new issue shows up without waiting for the timer.
 */
export const revalidate = 900;

const WEEKDAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'UTC' });

/** Today's date in Cyprus, as YYYY-MM-DD — the server runs on UTC, the gazette does not. */
function todayInCyprus(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Nicosia' }).format(new Date());
}

function weekday(date: string): string {
  return WEEKDAY.format(new Date(date + 'T00:00:00Z'));
}

export async function generateMetadata(): Promise<Metadata> {
  const day = await latestIssueDay();
  if (!day) {
    return buildMetadata({
      title: 'KKTC Resmi Gazete Bugün',
      description: 'Bugünkü KKTC Resmî Gazete sayıları ve içindekiler.',
      path: '/bugun',
    });
  }

  const numbers = formatIssueNumbers(day.issues.map((issue) => issue.number));
  const records = day.issues.reduce((sum, issue) => sum + issue.recordCount, 0);

  return buildMetadata({
    title: 'KKTC Resmi Gazete Bugün — ' + formatDateLong(day.date) + ', ' + numbers,
    description:
      formatDateLong(day.date) +
      ' ' +
      weekday(day.date) +
      ' tarihli KKTC Resmî Gazete (' +
      numbers +
      '): ' +
      records +
      ' kayıt. Yayımlanan yasa, karar, münhal ve ilanlar, PDF bağlantısıyla.',
    path: '/bugun',
  });
}

export default async function TodayPage() {
  const day = await latestIssueDay();

  const [sectionsByIssue, previousIssues] = day
    ? await Promise.all([
        Promise.all(day.issues.map((issue) => getIssueSections(issue.id))),
        day.previousDate ? issuesOnDate(day.previousDate) : Promise.resolve([]),
      ])
    : [[], []];

  const isToday = day?.date === todayInCyprus();

  const crumbs = [{ name: 'Ana sayfa', href: '/' }, { name: 'Bugünkü Resmî Gazete' }];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          Bugünkü KKTC Resmî Gazete
        </h1>

        {day ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-ink-muted">
              <time dateTime={day.date} className="font-semibold text-ink">
                {formatDateLong(day.date)} {weekday(day.date)}
              </time>
              <span aria-hidden className="h-3 w-px bg-line" />
              <span>{formatIssueNumbers(day.issues.map((issue) => issue.number))}</span>
            </div>

            <p className="mt-4 max-w-lede text-lg leading-[1.55] text-ink-muted">
              {isToday
                ? 'KKTC Resmî Gazete bugün yayımlandı. '
                : 'Bugün henüz yeni bir Resmî Gazete sayısı yayımlanmadı; aşağıda en son yayımlanan sayı var. '}
              Sayıdaki yasa, karar, münhal ve ilanların tamamı bölüm bölüm aşağıda; her
              kayıt aranabilir metniyle açılır, orijinal PDF&apos;e de buradan ulaşabilirsiniz.
            </p>

            {day.issues.map((issue, index) => (
              <section key={issue.id} className="mt-10 border-t border-line pt-6">
                <h2 className="m-0 text-3xl font-semibold text-ink">
                  <Link href={'/sayilar/' + issue.year + '/' + issue.number}>
                    Sayı {issue.number}
                  </Link>
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-ink-muted">
                  <span>{issue.recordCount} kayıt</span>
                  {issue.pageCount ? (
                    <>
                      <span aria-hidden className="h-3 w-px bg-line" />
                      <span>{issue.pageCount} sayfa</span>
                    </>
                  ) : null}
                  <span aria-hidden className="h-3 w-px bg-line" />
                  <a href={issue.pdfUrl} target="_blank" rel="noopener noreferrer">
                    Orijinal PDF
                  </a>
                </div>

                {sectionsByIssue[index]?.length ? (
                  <IssueSections sections={sectionsByIssue[index]!} headingLevel="h3" withAnchors={false} />
                ) : (
                  <p className="mt-5 text-base text-ink-muted">
                    Bu sayının kayıtları henüz işleniyor. O zamana kadar orijinal PDF&apos;e
                    yukarıdaki bağlantıdan ulaşabilirsiniz.
                  </p>
                )}
              </section>
            ))}

            <nav className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-base">
              {day.previousDate && previousIssues.length ? (
                <Link
                  href={'/sayilar/' + previousIssues[0]!.year + '/' + previousIssues[0]!.number}
                  rel="prev"
                >
                  ← Önceki sayı: {formatDateLong(day.previousDate)} (
                  {formatIssueNumbers(previousIssues.map((issue) => issue.number))})
                </Link>
              ) : (
                <span />
              )}
              <Link href="/sayilar">Tüm Resmî Gazete sayıları →</Link>
            </nav>
          </>
        ) : (
          <p className="mt-4 text-lg text-ink-muted">Henüz hiçbir sayı yüklenmedi.</p>
        )}
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}
