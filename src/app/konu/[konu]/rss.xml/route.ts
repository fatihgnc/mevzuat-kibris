import { notFound } from 'next/navigation';

import { TOPICS, isTopicSlug } from '@/lib/constants/topics';
import { listRecords } from '@/lib/db/queries/records';
import { buildRssFeed, rssResponse } from '@/lib/rss';

export const revalidate = 3600;

export async function GET(_request: Request, context: { params: Promise<{ konu: string }> }) {
  const { konu } = await context.params;
  if (!isTopicSlug(konu)) notFound();

  const topic = TOPICS[konu];
  const records = await listRecords({ topic: konu, limit: 50 });

  return rssResponse(
    buildRssFeed({
      title: topic.name,
      description: topic.description,
      path: '/konu/' + konu + '/rss.xml',
      htmlPath: '/konu/' + konu,
      records,
    }),
  );
}
