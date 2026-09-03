import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { TopicYearPage, parseTopicYear } from '@/components/topic-year-page';
import { topicYearMetadata } from '@/components/topic-year-page/metadata';
import { isTopicSlug } from '@/lib/constants/topics';
import { parsePageSegment } from '@/lib/seo/pagination';

export const revalidate = 3600;
export const dynamicParams = true;

type Props = { params: Promise<{ konu: string; yil: string; n: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { konu, yil, n } = await params;
  const page = parsePageSegment(n);
  if (page === null) return { title: 'Sayfa bulunamadı' };

  return topicYearMetadata(konu, yil, page);
}

export default async function Page({ params }: Props) {
  const { konu, yil, n } = await params;
  const page = parsePageSegment(n);
  const year = parseTopicYear(yil);
  if (page === null || year === null || !isTopicSlug(konu)) notFound();

  return <TopicYearPage konu={konu} year={year} page={page} />;
}
