import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TopicPage } from '@/components/topic-page';
import { topicMetadata } from '@/components/topic-page/metadata';
import { isTopicSlug } from '@/lib/constants/topics';

/**
 * The "applications still open" view — what `?filtre=acik` used to be.
 *
 * Only münhal and ihale carry a deadline, so only they show the filter; the route
 * exists for every topic because TopicPage already refuses to apply the filter
 * where it is meaningless, and a 404 on a link the UI never renders is not worth a
 * special case.
 */
export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ konu: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return topicMetadata((await params).konu, 1, true);
}

export default async function Page({ params }: Props) {
  const { konu } = await params;
  if (!isTopicSlug(konu)) notFound();

  return <TopicPage konu={konu} page={1} openOnly />;
}
