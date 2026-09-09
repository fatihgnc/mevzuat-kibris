import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TopicPage } from '@/components/topic-page';
import { parseTopicParams } from '@/lib/search/topic-params';
import { topicMetadata } from '@/components/topic-page/metadata';
import { isTopicSlug } from '@/lib/constants/topics';

/**
 * The "deadline has passed" view — the other half of the rail's status filter.
 *
 * It is not the complement of `/acik`. A record with no extracted deadline is in
 * neither view, and in münhal that is very nearly all of them, so the three rail
 * counts do not add up to the total and are not meant to.
 *
 * Like `/acik`, the route exists for every topic even though only münhal and
 * ihale render the filter: TopicPage already refuses to apply a status where a
 * deadline is not a property of the document, and a 404 on a link the UI never
 * renders is not worth a special case.
 */
export const revalidate = 3600;
export const dynamicParams = true;

type Props = {
  params: Promise<{ konu: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return topicMetadata((await params).konu, 1, 'kapali');
}

export default async function Page({ params, searchParams }: Props) {
  const { konu } = await params;
  if (!isTopicSlug(konu)) notFound();

  const filters = parseTopicParams(await searchParams);

  return <TopicPage konu={konu} page={1} durum="kapali" {...filters} />;
}
