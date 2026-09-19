import type { Metadata } from 'next';

import { LegislationDetailPage, legislationDetailMetadata } from '@/components/legislation-pages';

/**
 * Each page is rendered on its first request and then cached (ISR); none is
 * prerendered at build time. The empty `generateStaticParams` is what makes Next
 * cache them: a dynamic route without it is rendered again on EVERY request and is
 * sent with no-cache headers, which would leave the heaviest pages (the Ceza Yasası
 * is 3 MB of HTML before compression) rebuilt for every crawler visit and out of
 * Cloudflare's reach. (The BUILD still reads the legislation table, for the
 * sitemap.)
 */
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return legislationDetailMetadata('yasa', (await params).slug);
}

export default async function Page({ params }: Props) {
  return <LegislationDetailPage kind="yasa" slug={(await params).slug} />;
}
