import type { Metadata } from 'next';

import { LegislationDetailPage, legislationDetailMetadata } from '@/components/legislation-pages';

// Same reasoning as /yasa/[slug], including why generateStaticParams is declared and empty.
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return legislationDetailMetadata('tuzuk', (await params).slug);
}

export default async function Page({ params }: Props) {
  return <LegislationDetailPage kind="tuzuk" slug={(await params).slug} />;
}
