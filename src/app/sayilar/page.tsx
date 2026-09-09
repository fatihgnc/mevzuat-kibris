import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { archiveCoverage, coverageShort } from '@/lib/db/queries/coverage';
import { listYears } from '@/lib/db/queries/issues';
import { formatCount } from '@/lib/db/queries/shared';
import { buildMetadata } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

export const revalidate = 86400;

export const metadata: Metadata = buildMetadata({
  title: 'Resmî Gazete sayıları',
  // The unaccented "Resmi" appears once on purpose — see DEFAULT_METADATA.
  description:
    'KKTC Resmi Gazete arşivi. Resmî Gazete sayılarının yıl yıl dizini; her sayının içindekiler tablosu okunabilir hâlde, orijinal PDF bağlantısıyla.',
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

        {/*
          * The hairlines are BORDERS, not a background showing through a 1px gap.
          * With the gap trick an odd number of years leaves the last grid cell
          * empty, and that empty cell painted the container's colour — a filled
          * box sitting after 2020 with nothing in it. Borders draw only where an
          * item actually is.
          */}
        {years.length ? (
          <ul className="mt-8 grid border-t border-line-soft sm:grid-cols-2">
            {years.map((entry, index) => (
              <li
                key={entry.year}
                className={cn(
                  'border-b border-line-soft',
                  index % 2 === 0 && 'sm:border-r sm:border-line-soft',
                )}
              >
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
