import type { Metadata } from 'next';

import { TOPICS, isTopicSlug } from '@/lib/constants/topics';
import { buildMetadata } from '@/lib/seo/metadata';
import { topicHref } from '@/components/topic-page';

/**
 * Shared by all four topic routes so they cannot describe the same topic
 * differently. Only the path varies, and it comes from `topicHref`.
 */
export function topicMetadata(konu: string, page: number, openOnly: boolean): Metadata {
  if (!isTopicSlug(konu)) return { title: 'Konu bulunamadı' };

  const topic = TOPICS[konu];

  return buildMetadata({
    title: topic.name + ' — KKTC Resmî Gazete kayıtları',
    description: topic.description,
    path: topicHref(konu, { openOnly, page }),
    feedPath: '/konu/' + konu + '/rss.xml',
    page,
    /*
     * The "applications open" view is a filtered slice of the same feed, so it is
     * kept out of the index even on page 1 — otherwise the topic would compete with
     * itself for the same query. Its canonical points at itself, not at the
     * unfiltered page: a noindex page whose canonical names an indexable one can
     * hand its noindex to that page.
     */
    noindex: openOnly,
  });
}
