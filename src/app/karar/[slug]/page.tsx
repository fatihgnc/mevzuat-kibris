import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { RecordDetail } from '@/components/record-detail';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { formatRef } from '@/lib/constants/doc-types';
import { TOPICS } from '@/lib/constants/topics';
import { getRecordBySlug, recentRecordSlugs } from '@/lib/db/queries/records';
import { recordHref } from '@/lib/db/queries/shared';
import { breadcrumbJsonLd, recordJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata, recordTitle } from '@/lib/seo/metadata';
import { truncateAtSentence } from '@/lib/text/truncate';

/** ISR, 30 days. A gazette record does not change once published (spec 11.1). */
export const revalidate = 2592000;
export const dynamicParams = true;

/**
 * generateStaticParams returns only the last 12 months (spec 11.1).
 * Building 100k pages at build time would make Vercel build times unacceptable; the
 * rest are generated on demand on first request and cached.
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

  if (!record) notFound();

  /*
   * The record exists but is too thin for a page of its own (spec 8.2 rule 2) —
   * send the reader to where it IS published rather than to a 404.
   *
   * This used to call notFound(), and the result read as a broken link: the tab
   * title showed the record's own heading (generateMetadata finds it) while the
   * body said "this page does not exist". The content was never missing; it sits
   * in full on the issue page, which is exactly where `recordHref` sends every
   * other link to a thin record.
   *
   * 307, NOT 308. `has_own_page` is derived from the body, and the body can
   * arrive later: the retry queue extracts text on a second pass (spec 7.2), and
   * a parser fix can do it in bulk — one landed this week and gave 1,123 records
   * a page they did not have. A permanent redirect would be cached by browsers
   * and search engines long after the page came into existence.
   */
  if (!record.hasOwnPage) {
    redirect(
      recordHref({
        slug: record.slug,
        hasOwnPage: false,
        issueYear: record.issue.year,
        issueNumber: record.issue.number,
        refLabel: formatRef(record.refType, record.refNumber),
      }),
    );
  }

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
