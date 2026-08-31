import { listRecords } from '@/lib/db/queries/records';
import { buildRssFeed, rssResponse } from '@/lib/rss';
import { SITE_TAGLINE } from '@/lib/seo/config';

export const revalidate = 3600;

export async function GET() {
  const records = await listRecords({ limit: 50 });

  return rssResponse(
    buildRssFeed({
      title: 'Tüm kayıtlar',
      description: SITE_TAGLINE + ' — son yayımlanan kayıtlar.',
      path: '/rss.xml',
      htmlPath: '/',
      records,
    }),
  );
}
