import { notFound } from 'next/navigation';

import { getEntity } from '@/lib/db/queries/entities';
import { listRecords } from '@/lib/db/queries/records';
import { buildRssFeed, rssResponse } from '@/lib/rss';

export const revalidate = 3600;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const entity = await getEntity('institution', slug);
  if (!entity) notFound();

  const records = await listRecords({ entitySlug: slug, limit: 50 });

  return rssResponse(
    buildRssFeed({
      title: entity.name,
      description: entity.name + ' ile ilgili Resmî Gazete kayıtları.',
      path: '/kurum/' + slug + '/rss.xml',
      htmlPath: '/kurum/' + slug,
      records,
    }),
  );
}
