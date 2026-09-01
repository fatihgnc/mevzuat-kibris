import type { Metadata } from 'next';

import { truncateAtSentence, truncateTitle } from '@/lib/text/truncate';

import { IS_PRODUCTION_DEPLOY, SITE_NAME, SITE_TAGLINE } from './config';

/**
 * Metadata rules — spec 8.4.
 *
 * No page builds its own canonical by hand: `metadataBase` is set once in the root
 * layout and `alternates.canonical` here supplies a relative path. Next.js
 * combines the two into an absolute URL. This prevents a repeat of the bug on
 * kesintimivar.com where the canonical escaped to *.vercel.app.
 */

const NOINDEX: Metadata['robots'] = { index: false, follow: true };

/** Preview deployment'larda her sayfa noindex (spec 8.4). */
export const ROBOTS_DEFAULT: Metadata['robots'] = IS_PRODUCTION_DEPLOY
  ? { index: true, follow: true }
  : { index: false, follow: false };

export interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  /** Search results, follow and account pages are not indexed. */
  noindex?: boolean;
  /** From page 2 onward, list pages are noindex, follow (spec 8.2 rule 4). */
  page?: number;
  type?: 'website' | 'article';
  publishedTime?: string;
}

export function buildMetadata(input: PageMetaInput): Metadata {
  const title = truncateTitle(input.title, 70);
  const description = truncateAtSentence(input.description, 155);
  const noindex = input.noindex || (input.page !== undefined && input.page > 1);

  return {
    title,
    description,
    alternates: { canonical: input.path },
    robots: noindex ? NOINDEX : ROBOTS_DEFAULT,
    openGraph: {
      title,
      description,
      url: input.path,
      siteName: SITE_NAME,
      locale: 'tr_TR',
      type: input.type ?? 'website',
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** Record page title: "{title} — RG {issue}/{year} | Mevzuat Kıbrıs" */
export function recordTitle(summaryOrTitle: string, issueNumber: number, year: number): string {
  return truncateTitle(summaryOrTitle, 60) + ' — RG ' + issueNumber + '/' + year;
}

export const DEFAULT_METADATA: Metadata = {
  title: {
    default: SITE_NAME + ' — ' + SITE_TAGLINE,
    template: '%s | ' + SITE_NAME,
  },
  description:
    'KKTC Resmî Gazete kayıtlarında arama yapın, konu ve kurum takibi kurun. Her kayıt orijinal PDF sayfasına bağlıdır.',
  applicationName: SITE_NAME,
  robots: ROBOTS_DEFAULT,
  formatDetection: { telephone: false, address: false, email: false },
};
