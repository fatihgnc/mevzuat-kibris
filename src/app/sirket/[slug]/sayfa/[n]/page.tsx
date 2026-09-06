import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EntityPage, entityMetadata } from '@/components/entity-page';
import { parsePageSegment } from '@/lib/seo/pagination';

/**
 * Page 2 and beyond of one entity's record list.
 *
 * No `generateStaticParams`: how many pages an entity has depends on its record
 * count, and enumerating that for 610 companies at build time would cost more than
 * it saves. `dynamicParams` renders each on first request and ISR keeps it.
 */
/**
 * ISR, 30 days — raised from 7 for the reason recorded on /karar/[slug]: the
 * window was a re-write schedule, not a freshness claim. An entity page changes
 * only when a record naming that entity is published, and ingest already
 * revalidates `entity:<slug>` when that happens.
 */
export const revalidate = 2592000;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string; n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n } = await params;
  const page = parsePageSegment(n);
  if (page === null) return { title: 'Sayfa bulunamadı' };

  return entityMetadata('company', slug, page);
}

export default async function Page({ params }: Props) {
  const { slug, n } = await params;
  const page = parsePageSegment(n);
  if (page === null) notFound();

  return <EntityPage kind="company" slug={slug} page={page} />;
}
