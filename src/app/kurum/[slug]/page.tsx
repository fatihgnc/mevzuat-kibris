import type { Metadata } from 'next';

import { EntityPage, entityMetadata } from '@/components/entity-page';
import { entitySlugs } from '@/lib/db/queries/entities';

/**
 * ISR 7 days (spec 11.1) — and it is real again.
 *
 * This route used to read `searchParams` for `?sayfa=N`, which opted it out of
 * prerendering entirely: the build fetched 2.000 slugs below and wrote no HTML at
 * all. Pagination now lives at ./sayfa/[n], so nothing here touches the query
 * string and both this window and `generateStaticParams` do what they say.
 */
export const revalidate = 604800;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await entitySlugs('institution');
  return slugs.slice(0, 2000).map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return entityMetadata('institution', slug, 1);
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <EntityPage kind="institution" slug={slug} page={1} />;
}
