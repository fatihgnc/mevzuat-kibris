import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TextQualityBadge } from '@/components/text-quality-badge';
import { YearNav } from '@/components/year-nav';
import { listIssuesByYear, listYears, yearTextQuality } from '@/lib/db/queries/issues';
import { ARCHIVE_START_YEAR } from '@/lib/seo/config';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { formatDateLong } from '@/lib/text/dates';

export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
  const years = await listYears();
  return years.map((entry) => ({ yil: String(entry.year) }));
}

type Props = { params: Promise<{ yil: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { yil } = await params;
  return buildMetadata({
    title: yil + ' yılı Resmî Gazete sayıları',
    description:
      yil +
      ' yılında yayımlanan KKTC Resmî Gazete sayıları, numara sırasıyla. Her sayının içindekiler tablosu ve orijinal PDF bağlantısı.',
    path: '/sayilar/' + yil,
  });
}

export default async function IssueYearPage({ params }: Props) {
  const { yil } = await params;
  const year = Number(yil);
  if (!Number.isInteger(year) || year < ARCHIVE_START_YEAR) notFound();

  const [issues, allYears, quality] = await Promise.all([
    listIssuesByYear(year),
    listYears(),
    yearTextQuality(year),
  ]);

  if (!issues.length) notFound();

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: 'Sayılar', href: '/sayilar' },
    { name: String(year) },
  ];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          {year} yılı sayıları
        </h1>
        <p className="mt-3 text-base text-ink-muted">{issues.length} sayı</p>

        {/*
         * Bir yılın ortalama metin kalitesi 0.6'nın altındaysa kullanıcıya
         * söylüyoruz (spec 7.2). Sessizce kötü metin sunmak, yanlış sonuç
         * döndüren bir aramadan daha çok güven kaybettirir.
         */}
        {quality !== null && quality < 0.6 ? (
          <p className="mt-4 rounded border border-notice-border bg-notice px-3.5 py-2.5 text-base text-notice-ink">
            Bu yılın sayıları taranmış görüntüden okundu ve metin kalitesi düşük. Arama sonuçları
            eksik olabilir; kesin bilgi için resmî PDF&apos;e bakın.
          </p>
        ) : null}

        <ul className="mt-7 flex flex-col">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link
                href={'/sayilar/' + year + '/' + issue.number}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line-soft py-3.5 no-underline hover:bg-surface-hover hover:no-underline"
              >
                <span className="flex items-baseline gap-3">
                  <span className="text-lg font-semibold text-ink">Sayı {issue.number}</span>
                  <time dateTime={issue.publishedAt} className="text-base text-ink-muted">
                    {formatDateLong(issue.publishedAt)}
                  </time>
                </span>
                <span className="flex items-center gap-3 text-base text-ink-muted">
                  <span>{issue.recordCount} kayıt</span>
                  <TextQualityBadge status={issue.textStatus} quality={issue.textQuality} />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-9 border-t border-line pt-5">
          <h2 className="mb-3 text-md font-semibold text-ink">Diğer yıllar</h2>
          <YearNav
            years={allYears.map((entry) => entry.year)}
            current={year}
            hrefFor={(value) => '/sayilar/' + value}
          />
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
