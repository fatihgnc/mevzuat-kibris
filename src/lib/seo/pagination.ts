/**
 * Pagination lives in the path, not the query string — and the reason is that
 * Next.js will not prerender a route that reads `searchParams`.
 *
 * The production build showed this with no ambiguity, because the codebase held its
 * own control group: every route that read `searchParams` produced zero static
 * pages, every route that did not produced all of them.
 *
 *     /karar/[slug]    no searchParams  ->  3.127 files
 *     /rehber/[slug]   no searchParams  ->      8
 *     /sayilar/[yil]   no searchParams  ->      7
 *     /konu/[konu]     searchParams     ->      0
 *     /kurum/[slug]    searchParams     ->      0   after fetching 2.000 slugs
 *
 * So `?sayfa=2` was quietly costing every list page its `revalidate` window and
 * making `generateStaticParams` a build-time query that produced nothing. Moving
 * the page number into a segment gives each page its own address, which restores
 * prerendering AND removes the canonical conflict that came with it: a page with a
 * real URL can point its canonical at itself.
 *
 * Old `?sayfa=` links are redirected in next.config.ts, at the edge, before the
 * route renders — a redirect there does not reintroduce the dynamic read.
 */

/**
 * The pagination ceiling, matching the one `records.ts` already assumes when it
 * caps counting at 10.000 rows.
 */
export const MAX_PAGE = 500;

/**
 * Parses the `[n]` segment of a `…/sayfa/[n]` route.
 *
 * `/sayfa/1` is rejected rather than accepted: page 1 already has an address — the
 * bare path — and honouring both would publish the same list at two URLs, which is
 * the duplicate this whole change exists to avoid. Nothing links to it.
 */
export function parsePageSegment(value: string): number | null {
  if (!/^[1-9][0-9]{0,3}$/.test(value)) return null;

  const page = Number(value);
  if (page < 2 || page > MAX_PAGE) return null;

  return page;
}

/** The URL of a given page of a list — the one place the `/sayfa/` shape is written. */
export function pageHref(basePath: string, page: number): string {
  return page > 1 ? basePath + '/sayfa/' + page : basePath;
}
