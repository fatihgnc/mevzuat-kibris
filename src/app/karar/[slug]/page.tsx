import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { RecordDetail } from '@/components/record-detail';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TOPICS } from '@/lib/constants/topics';
import { getRecordBySlug, recentRecordSlugs } from '@/lib/db/queries/records';
import { breadcrumbJsonLd, recordJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata, recordTitle } from '@/lib/seo/metadata';
import { truncateAtSentence } from '@/lib/text/truncate';

/** ISR, 30 gün. RG kaydı yayımlandıktan sonra değişmiyor (spec 11.1). */
export const revalidate = 2592000;
export const dynamicParams = true;

/**
 * generateStaticParams yalnızca son 12 ayı döndürüyor (spec 11.1).
 * 100 bin sayfayı build time'da üretmek Vercel build süresini kabul edilemez
 * hale getirir; gerisi ilk istekte on-demand üretilip cache'leniyor.
 */
export async function generateStaticParams() {
  const slugs = await recentRecordSlugs(12);
  return slugs.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const record = await getRecordBySlug(slug);
  if (!record) return { title: 'Kayıt bulunamadı' };

  const heading = record.summary ?? record.title;

  return buildMetadata({
    title: recordTitle(heading, record.issue.number, record.issue.year),
    description: truncateAtSentence(record.subject ?? record.bodyText ?? record.title, 155),
    path: '/karar/' + record.slug,
    type: 'article',
    publishedTime: record.publishedAt,
  });
}

export default async function RecordPage({ params }: Props) {
  const { slug } = await params;
  const record = await getRecordBySlug(slug);

  // İnce kayıtların kendi sayfası yok (spec 8.2 madde 2); slug'ları da yayımlanmıyor.
  if (!record || !record.hasOwnPage) notFound();

  const topic = record.topics[0] ? TOPICS[record.topics[0]] : null;

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    ...(topic ? [{ name: topic.name, href: '/konu/' + topic.slug }] : []),
    {
      name: String(record.issue.year),
      href: topic ? '/konu/' + topic.slug + '/' + record.issue.year : '/sayilar/' + record.issue.year,
    },
    { name: record.refNumber ?? 'Kayıt' },
  ];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-9 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />
        <RecordDetail record={record} />
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recordJsonLd(record)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}
