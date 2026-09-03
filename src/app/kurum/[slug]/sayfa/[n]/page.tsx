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
export const revalidate = 604800;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string; n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n } = await params;
  const page = parsePageSegment(n);
  if (page === null) return { title: 'Sayfa bulunamadı' };

  return entityMetadata('institution', slug, page);
}

export default async function Page({ params }: Props) {
  const { slug, n } = await params;
  const page = parsePageSegment(n);
  if (page === null) notFound();

  return <EntityPage kind="institution" slug={slug} page={page} />;
}
