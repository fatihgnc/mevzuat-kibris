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

/**
 * The site-wide feed declaration.
 *
 * It lives here rather than inline in the root layout because Next merges metadata
 * SHALLOWLY: a page that defines `alternates` at all replaces the parent's whole
 * object, `types` included. The home page has to restate this to keep its canonical
 * and its feed link at the same time, so the two must read from one constant or
 * they will drift.
 */
export const RSS_ALTERNATE = {
  'application/rss+xml': [{ url: '/rss.xml', title: 'Tüm kayıtlar' }],
};

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
  /**
   * This page's own RSS feed, e.g. `/konu/munhal/rss.xml`.
   *
   * Needed because Next merges metadata shallowly: declaring `alternates` here
   * replaces the root layout's whole object, `types` included. Every page built by
   * this function was therefore dropping the feed declaration — including the topic
   * and entity pages, which are exactly the ones that HAVE their own feed. Without
   * it a reader's browser and feed reader cannot discover the feed from the page.
   */
  feedPath?: string;
  type?: 'website' | 'article';
  publishedTime?: string;
}

/**
 * THE CANONICAL IS ALWAYS THE PAGE'S OWN PATH — and that is only true because
 * pagination and filtering live in the path rather than the query string.
 *
 * It did not used to. Page 2 carried `noindex` while its canonical named page 1,
 * which is a contradiction rather than two independent settings: a canonical
 * declares two URLs to be THE SAME DOCUMENT, so once Google merges them the
 * `noindex` becomes a property of the merged document and can carry over to the
 * target. The page at risk was page 1 — the one page of each list that has to stay
 * indexed.
 *
 * Moving `?sayfa=` and `?filtre=` into route segments removed the conflict at its
 * source instead of patching around it: every view now has its own address, so a
 * self-referencing canonical is simply `input.path` and there is nothing left to
 * reconcile. `noindex, follow` still applies from page 2 on (spec 8.2 rule 4), and
 * `follow` is what keeps the crawler walking through to the record pages.
 */
export function buildMetadata(input: PageMetaInput): Metadata {
  const title = truncateTitle(input.title, 70);
  const description = truncateAtSentence(input.description, 155);
  const noindex = input.noindex || (input.page !== undefined && input.page > 1);

  return {
    title,
    description,
    alternates: {
      canonical: input.path,
      ...(input.feedPath
        ? { types: { 'application/rss+xml': [{ url: input.feedPath, title: input.title }] } }
        : {}),
    },
    robots: noindex ? NOINDEX : ROBOTS_DEFAULT,
    openGraph: {
      title,
      description,
      // og:url tracks the canonical; a share card should name the page it came from.
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
