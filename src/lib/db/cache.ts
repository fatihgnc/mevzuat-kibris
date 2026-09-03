import 'server-only';

import { unstable_cache } from 'next/cache';

/**
 * The data cache — spec 11.2, and the half of it that was never built.
 *
 * TWO FACTS THAT ONLY MAKE SENSE TOGETHER.
 *
 * First: five route families read `searchParams` to get `?sayfa=N`, and in Next 15
 * a route that touches `searchParams` cannot be prerendered — the query string is
 * unbounded, so there is nothing to bake. The production build proves it cleanly,
 * because the codebase contains its own control group:
 *
 *     /karar/[slug]    no searchParams   ->  3.127 HTML files on disk
 *     /rehber/[slug]   no searchParams   ->      8
 *     /sayilar/[yil]   no searchParams   ->      7
 *     /konu/[konu]     searchParams      ->      0
 *     /kurum/[slug]    searchParams      ->      0   (after fetching 2.000 slugs)
 *     /sirket/[slug]   searchParams      ->      0
 *     /yer/[slug]      searchParams      ->      0
 *
 * So the `revalidate = 604800` on those files buys nothing: every request renders
 * from scratch and every render goes to Postgres. That matters here more than it
 * would elsewhere — `next.config.ts` limits build workers because the session
 * pooler has a client ceiling, and a query round-trip to Frankfurt is ~107 ms.
 *
 * Second: `/api/revalidate` has been calling `revalidateTag('latest')`,
 * `revalidateTag('topic:…')` and `revalidateTag('entity:…')` after every ingest —
 * and NOTHING IN THE CODEBASE EVER REGISTERED THOSE TAGS. They matched no cache
 * entry, so all three calls were no-ops; only the `revalidatePath` calls beside
 * them did any work.
 *
 * This module joins the two. Wrapping the list queries in `unstable_cache` under
 * exactly those tag names means a dynamic route stops paying for Postgres on every
 * request, and the invalidation that ingest already triggers starts landing on
 * something. Page HTML is still rendered per request; the database round-trip,
 * which is the part that is metered, is not.
 *
 * SINCE THEN, `?sayfa=` HAS ALSO MOVED INTO THE PATH (see lib/seo/pagination.ts),
 * so those routes prerender again and the control-group table above is history
 * rather than current behaviour. This cache is still what these queries want: the
 * ISR windows are long, ingest fires the tags the moment new records land, and the
 * on-demand renders behind `dynamicParams` still have to fetch from somewhere.
 */

/** The tag vocabulary. It must keep matching src/app/api/revalidate/route.ts. */
export const TAG = {
  /** Anything that changes when new records land. */
  latest: 'latest',
  topic: (slug: string) => 'topic:' + slug,
  entity: (slug: string) => 'entity:' + slug,
};

/**
 * The ISR window for cached queries when no tag fires.
 *
 * An hour rather than the seven days some route files ask for: ingest triggers the
 * tags on a good day, and this is only the floor under a day when the revalidate
 * call fails — which `scripts/revalidate` logs and deliberately does not treat as
 * fatal.
 */
const DEFAULT_TTL = 3600;

/**
 * `keyParts` MUST identify the query completely.
 *
 * Two different queries sharing a key would serve one's rows for the other — a
 * silent, hard-to-see bug. Callers build the key from the query's own arguments in
 * a fixed order rather than from an object literal, because object key order is
 * insertion order and two call sites spelling the same options differently would
 * otherwise miss each other's cache entries.
 */
export function cachedQuery<T>(
  keyParts: string[],
  tags: string[],
  query: () => Promise<T>,
  revalidate: number = DEFAULT_TTL,
): Promise<T> {
  return unstable_cache(query, keyParts, { tags, revalidate })();
}
