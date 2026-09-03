import type { Metadata } from 'next';

import { TOPICS, isTopicSlug } from '@/lib/constants/topics';
import { buildMetadata } from '@/lib/seo/metadata';
import { pageHref } from '@/lib/seo/pagination';
import { parseTopicYear } from '@/components/topic-year-page';

/** Shared by /konu/[konu]/[yil] and its /sayfa/[n] sibling; only the path differs. */
export function topicYearMetadata(konu: string, yil: string, page: number): Metadata {
  const year = parseTopicYear(yil);
  if (!isTopicSlug(konu) || year === null) return { title: 'Sayfa bulunamadı' };

  const topic = TOPICS[konu];
  const name = topic.name.toLocaleLowerCase('tr');

  return buildMetadata({
    title: year + ' yılı ' + name + ' kayıtları',
    description:
      year +
      ' yılında Resmî Gazete’de yayımlanan ' +
      name +
      ' kayıtları, tarih sırasıyla. ' +
      topic.blurb +
      '.',
    path: pageHref('/konu/' + konu + '/' + year, page),
    page,
  });
}
