import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TOPIC_LIST } from '@/lib/constants/topics';
import { archiveCoverage, coverageSentence } from '@/lib/db/queries/coverage';
import { topicCounts } from '@/lib/db/queries/records';
import { formatCount } from '@/lib/db/queries/shared';
import { buildMetadata } from '@/lib/seo/metadata';

// Konu sayfalarıyla aynı ISR penceresi (spec 11.1).
export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: 'Konular',
  description:
    'Resmî Gazete kayıtları sekiz konuya ayrılıyor: münhal, ihale, şirket, gayrimenkul, marka, vergi ve mali, mevzuat, atama. Her konunun akışı kronolojik.',
  path: '/konu',
});

/**
 * Konu dizini.
 *
 * Başlıktaki "Konular" bağlantısı eskiden doğrudan `/konu/munhal`e gidiyordu:
 * çoğul bir etiket tek bir konuyu açıyordu, diğer yedi konuya buradan
 * ulaşılamıyordu ve münhal ile ilgilenmeyen kullanıcı yanlış sayfada
 * başlıyordu. Bu sayfa o boşluğu dolduruyor.
 *
 * Sayılar VERİDEN geliyor (spec 8.4): kayıt yoksa sayı yazılmıyor, sıfır
 * yazmak yerine hiç yazmamak tercih ediliyor — arkasında veri olmayan bir
 * iddia, iddia hiç yapmamaktan kötü.
 */
export default async function TopicsPage() {
  const [counts, coverage] = await Promise.all([topicCounts(), archiveCoverage()]);

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Konular' }]} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          Konular
        </h1>
        <p className="mt-3 text-xl leading-[1.6] text-ink-body">
          Her kayıt yayımlandığı bölüme ve başlığına göre sınıflandırılıyor. Bir kayıt birden fazla
          konuya girebilir. {coverageSentence(coverage)}
        </p>

        <ul className="mt-8 flex flex-col">
          {TOPIC_LIST.map((topic) => {
            const count = counts[topic.slug] ?? 0;

            return (
              <li key={topic.slug}>
                <Link
                  href={'/konu/' + topic.slug}
                  className="flex flex-col gap-1 border-b border-line-soft py-4 no-underline hover:bg-surface-hover hover:no-underline"
                >
                  <span className="flex items-baseline gap-2.5">
                    <span className="text-xl font-medium leading-[1.38] text-ink">{topic.name}</span>
                    {count > 0 ? (
                      <span className="text-base text-ink-fainter">{formatCount(count)} kayıt</span>
                    ) : null}
                  </span>
                  <span className="text-base leading-[1.5] text-ink-muted">{topic.blurb}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>

      <SiteFooter />
    </>
  );
}
