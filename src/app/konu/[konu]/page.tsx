import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TopicPage } from '@/components/topic-page';
import { topicMetadata } from '@/components/topic-page/metadata';
import { TOPIC_SLUGS, isTopicSlug } from '@/lib/constants/topics';

/**
 * ISR + tag: revalidateTag('topic:{slug}') refreshes it after ingest (spec 11.1).
 * Prerendered for real now — this route reads no query string; see topic-page.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return TOPIC_SLUGS.map((konu) => ({ konu }));
}

type Props = { params: Promise<{ konu: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return topicMetadata((await params).konu, 1, false);
}

export default async function Page({ params }: Props) {
  const { konu } = await params;
  if (!isTopicSlug(konu)) notFound();

  return <TopicPage konu={konu} page={1} openOnly={false} />;
}
