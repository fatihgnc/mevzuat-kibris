import type { Metadata } from 'next';

import { EntityPage } from '@/components/entity-page';
import { entitySlugs, getEntity } from '@/lib/db/queries/entities';
import { buildMetadata } from '@/lib/seo/metadata';

/** ISR 7 gün (spec 11.1). */
export const revalidate = 604800;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await entitySlugs('institution');
  return slugs.slice(0, 2000).map((slug) => ({ slug }));
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getEntity('institution', slug);
  if (!entity) return { title: 'Kurum bulunamadı' };

  const page = Number((await searchParams).sayfa ?? 1);

  return buildMetadata({
    title: entity.name + ' — Resmî Gazete kayıtları',
    description:
      entity.name +
      ' adının geçtiği KKTC Resmî Gazete kayıtları, tarih sırasıyla. Her kayıt orijinal PDF sayfasına bağlı.',
    path: '/kurum/' + slug,
    page,
  });
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).sayfa ?? 1) || 1);

  return <EntityPage kind="institution" slug={slug} page={page} />;
}
