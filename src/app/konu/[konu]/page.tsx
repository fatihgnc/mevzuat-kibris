import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TopicPage } from '@/components/topic-page';
import { parseTopicParams } from '@/lib/search/topic-params';
import { topicMetadata } from '@/components/topic-page/metadata';
import { TOPIC_SLUGS, isTopicSlug } from '@/lib/constants/topics';

/**
 * ISR + tag: revalidateTag('topic:{slug}') refreshes it after ingest (spec 11.1).
 *
 * ⚠️ THE REVALIDATE ABOVE NO LONGER APPLIES, and that was a knowing trade. The
 * route reads `searchParams` for the rail's date range and sort, and one
 * query-string read is enough to make a route render per request — which is
 * exactly why an earlier session moved the page number and the "acik" filter INTO
 * the path.
 *
 * ⚠️ DO NOT READ THE BUILD OUTPUT AND CONCLUDE OTHERWISE. It still prints this
 * route as `●`, with the nine slugs listed under it; the only visible difference
 * is that the Revalidate column went from `1h` to blank. What settles it is the
 * response, measured against `next start`:
 *
 *   /konu/munhal   Cache-Control: private, no-cache, no-store, must-revalidate
 *   /sayilar       x-nextjs-cache: HIT, s-maxage=86400
 *
 * Scope of the loss, measured before the change: 9 pages out of 8.264 — the topic
 * landing pages, the only `●` under /konu. Every other route here was already
 * `ƒ`. Build time did not move (8m00s -> 7m55s).
 *
 * If the trade is ever revisited, the way back is to move the range into the path
 * as `acik` did, not to drop the rail.
 *
 * `generateStaticParams` stays: it still tells Next the nine valid slugs.
 */
export const revalidate = 3600;

export function generateStaticParams() {
  return TOPIC_SLUGS.map((konu) => ({ konu }));
}

type Props = {
  params: Promise<{ konu: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return topicMetadata((await params).konu, 1);
}

export default async function Page({ params, searchParams }: Props) {
  const { konu } = await params;
  if (!isTopicSlug(konu)) notFound();

  const filters = parseTopicParams(await searchParams);

  return <TopicPage konu={konu} page={1} {...filters} />;
}
