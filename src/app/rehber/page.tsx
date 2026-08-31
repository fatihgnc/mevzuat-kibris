import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { GUIDES } from '@/lib/content/guides';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Rehber',
  description:
    'Resmî Gazete nasıl okunur, referans numaraları ne demek, kamu işine nasıl başvurulur. Elle yazılmış açıklayıcı rehberler.',
  path: '/rehber',
});

export default function GuidesPage() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Rehber' }]} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">Rehber</h1>
        <p className="mt-3 text-xl leading-[1.6] text-ink-body">
          Resmî Gazete kendi kullanım kılavuzunu yayımlamıyor. Bu sayfalar, gazeteyi ilk kez açan
          birinin takıldığı yerleri anlatıyor.
        </p>

        <ul className="mt-8 flex flex-col">
          {GUIDES.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={'/rehber/' + guide.slug}
                className="flex flex-col gap-1 border-b border-line-soft py-4 no-underline hover:bg-surface-hover hover:no-underline"
              >
                <span className="text-xl font-medium leading-[1.38] text-ink">{guide.title}</span>
                <span className="text-base leading-[1.5] text-ink-muted">{guide.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </>
  );
}
