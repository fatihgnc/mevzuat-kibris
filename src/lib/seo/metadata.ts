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

/**
 * The title budget, matching the cap buildMetadata applies. Kept as a constant so
 * the two cannot drift: recordTitle composes right up to this length and
 * buildMetadata's own truncation then has nothing left to do.
 */
const RECORD_TITLE_MAX = 70;

/**
 * Record page title: "A.E. 21196 — {başlık} — RG {sayı}/{yıl} | Mevzuat Kıbrıs".
 *
 * THE REFERENCE NUMBER LEADS. People search for the number itself — Search
 * Console has `ai21196` taking impressions and no clicks — and a result whose
 * title does not show the number they typed does not look like the record they
 * asked for, whatever it ranks at. It goes in front rather than at the end
 * because Google truncates the tail.
 *
 * THE BUDGET IS COMPUTED, NOT ASSUMED. The heading used to be cut at a flat 60
 * and the issue suffix appended after, which put the result at 74 characters —
 * past buildMetadata's own 70-character cap, so for any long heading the "RG
 * 145/2026" was itself trimmed away. Here the fixed parts are measured first and
 * the heading gets what is left, so nothing composed by this function is ever cut
 * again. The floor of 24 is a guard for a hypothetical very long prefix; no
 * formatRef branch comes close to needing it.
 */
export function recordTitle(
  summaryOrTitle: string,
  issueNumber: number,
  year: number,
  refLabel?: string | null,
): string {
  const prefix = refLabel ? refLabel + ' — ' : '';
  const suffix = ' — RG ' + issueNumber + '/' + year;
  const room = Math.max(RECORD_TITLE_MAX - prefix.length - suffix.length, 24);

  return prefix + truncateTitle(summaryOrTitle, room) + suffix;
}

export const DEFAULT_METADATA: Metadata = {
  title: {
    default: SITE_NAME + ' — ' + SITE_TAGLINE,
    template: '%s | ' + SITE_NAME,
  },
  /*
   * "Resmi" WITHOUT THE CIRCUMFLEX IS DELIBERATE, ONCE, HERE.
   *
   * The site writes "Resmî Gazete" in all 79 places it says it, which is the
   * correct spelling and stays the house style. Almost nobody types the
   * circumflex into a search box, though, and this description is what the home
   * page shows for the highest-volume query in the niche. Carrying both forms
   * costs one sentence and settles the question rather than relying on the
   * search engine to fold the letter for us.
   *
   * Do not sweep the rest of the site to match this. One natural occurrence on
   * the pages that target the term is the whole point; a global find-and-replace
   * would just misspell the site.
   */
  description:
    'KKTC Resmi Gazete arşivinde arama yapın: Resmî Gazete kayıtları, konu ve kurum takibi. Her kayıt orijinal PDF sayfasına bağlıdır.',
  applicationName: SITE_NAME,
  robots: ROBOTS_DEFAULT,
  formatDetection: { telephone: false, address: false, email: false },
};
