import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EntityIndex, entityIndexMetadata } from '@/components/entity-index';
import { parsePageSegment } from '@/lib/seo/pagination';

/**
 * Page 2 and beyond of the yer index.
 *
 * A NOTE ON THE PATH. `/yer/sayfa/2` is matched by this literal segment rather
 * than by `/yer/[slug]`, because Next resolves a static segment before a dynamic
 * one. The cost is that an entity whose slug is literally "sayfa" would be
 * unreachable — no such entity exists, and one would have to be named "Sayfa" for
 * it to arise.
 */
export const revalidate = 86400;
export const dynamicParams = true;

type Props = { params: Promise<{ n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = parsePageSegment((await params).n);
  if (page === null) return { title: 'Sayfa bulunamadı' };

  return entityIndexMetadata('place', page);
}

export default async function Page({ params }: Props) {
  const page = parsePageSegment((await params).n);
  if (page === null) notFound();

  return <EntityIndex kind="place" page={page} />;
}
