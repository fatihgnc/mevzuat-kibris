import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { IssueSections } from '@/components/issue-sections';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { adjacentIssues, getIssue, getIssueSections } from '@/lib/db/queries/issues';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { formatDateLong } from '@/lib/text/dates';

/** ISR 30 days — a published issue does not change (spec 11.1). */
export const revalidate = 2592000;
export const dynamicParams = true;

type Props = { params: Promise<{ yil: string; sayi: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { yil, sayi } = await params;
  const issue = await getIssue(Number(yil), Number(sayi));
  if (!issue) return { title: 'Sayı bulunamadı' };

  /*
   * The date leads, and "KKTC Resmi Gazete" is spelled unaccented, because that is
   * how people search for a day's gazette ("resmi gazete 9 ekim 2026"). The old
   * title, "Resmî Gazete sayı 200/2026", carried neither the date nor KKTC, and
   * nobody searches by issue number.
   */
  return buildMetadata({
    title: 'KKTC Resmi Gazete ' + formatDateLong(issue.publishedAt) + ' — Sayı ' + issue.number,
    description:
      formatDateLong(issue.publishedAt) +
      ' tarihli KKTC Resmî Gazete sayı ' +
      issue.number +
      ' içindekiler: ' +
      issue.recordCount +
      ' kayıt, bölüm bölüm okunabilir hâlde.',
    path: '/sayilar/' + issue.year + '/' + issue.number,
  });
}

export default async function IssuePage({ params }: Props) {
  const { yil, sayi } = await params;
  const year = Number(yil);
  const number = Number(sayi);
  if (!Number.isInteger(year) || !Number.isInteger(number)) notFound();

  const issue = await getIssue(year, number);
  if (!issue) notFound();

  const [sections, adjacent] = await Promise.all([
    getIssueSections(issue.id),
    adjacentIssues(year, number),
  ]);

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: 'Sayılar', href: '/sayilar' },
    { name: String(year), href: '/sayilar/' + year },
    { name: number + '. sayı' },
  ];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          {formatDateLong(issue.publishedAt)} tarihli Resmî Gazete, sayı {number}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-ink-muted">
          <time dateTime={issue.publishedAt}>{formatDateLong(issue.publishedAt)}</time>
          <span aria-hidden className="h-3 w-px bg-line" />
          <span>{issue.recordCount} kayıt</span>
          {issue.pageCount ? (
            <>
              <span aria-hidden className="h-3 w-px bg-line" />
              <span>{issue.pageCount} sayfa</span>
            </>
          ) : null}
        </div>

        <div className="mt-5">
          <a
            href={issue.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded border border-ink bg-surface px-[18px] py-2.5 text-md font-semibold text-ink no-underline transition-colors hover:bg-ink hover:text-surface hover:no-underline"
          >
            Kaynağa git
          </a>
        </div>

        <IssueSections sections={sections} />

        <nav className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5 text-base">
          {adjacent.prev ? (
            <Link href={'/sayilar/' + adjacent.prev.year + '/' + adjacent.prev.number} rel="prev">
              ← {adjacent.prev.number}. sayı
            </Link>
          ) : (
            <span />
          )}
          {adjacent.next ? (
            <Link href={'/sayilar/' + adjacent.next.year + '/' + adjacent.next.number} rel="next">
              {adjacent.next.number}. sayı →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}
