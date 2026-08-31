import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { archiveCoverage, coverageShort } from '@/lib/db/queries/coverage';
import { listYears } from '@/lib/db/queries/issues';
import { formatCount } from '@/lib/db/queries/shared';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: 'Resmî Gazete sayıları',
  description:
    'KKTC Resmî Gazete sayılarının yıl yıl dizini. Her sayının içindekiler tablosu okunabilir hâlde, orijinal PDF bağlantısıyla.',
  path: '/sayilar',
});

export default async function IssuesIndexPage() {
  const [years, coverage] = await Promise.all([listYears(), archiveCoverage()]);

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Sayılar' }]} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          Resmî Gazete sayıları
        </h1>
        <p className="mt-3 text-xl leading-[1.6] text-ink-body">
          Her sayının içindekiler tablosunu bölüm bölüm okunabilir hâle getiriyoruz. Kayıtların
          tamamı orijinal PDF&apos;in ilgili sayfasına bağlı. {coverageShort(coverage)}.
        </p>

        {years.length ? (
          <ul className="mt-8 grid gap-[1px] bg-line-soft sm:grid-cols-2">
            {years.map((entry) => (
              <li key={entry.year}>
                <Link
                  href={'/sayilar/' + entry.year}
                  className="flex items-baseline justify-between gap-3 bg-surface px-4 py-3.5 no-underline hover:bg-surface-hover hover:no-underline"
                >
                  <span className="text-3xl font-semibold text-ink">{entry.year}</span>
                  <span className="text-base text-ink-muted">
                    {entry.issueCount} sayı · {formatCount(entry.recordCount)} kayıt
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-md text-ink-muted">Henüz sayı işlenmedi.</p>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
