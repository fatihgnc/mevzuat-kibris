import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TopicPage } from '@/components/topic-page';
import { parseTopicParams } from '@/lib/search/topic-params';
import { topicMetadata } from '@/components/topic-page/metadata';
import { isTopicSlug } from '@/lib/constants/topics';
import { parsePageSegment } from '@/lib/seo/pagination';

export const revalidate = 3600;
export const dynamicParams = true;

type Props = {
  params: Promise<{ konu: string; n: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { konu, n } = await params;
  const page = parsePageSegment(n);
  if (page === null) return { title: 'Sayfa bulunamadı' };

  return topicMetadata(konu, page, true);
}

export default async function Page({ params, searchParams }: Props) {
  const { konu, n } = await params;
  const page = parsePageSegment(n);
  if (page === null || !isTopicSlug(konu)) notFound();

  const filters = parseTopicParams(await searchParams);

  return <TopicPage konu={konu} page={page} openOnly {...filters} />;
}
