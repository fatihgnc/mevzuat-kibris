import {
  SkeletonAnnounce,
  SkeletonAside,
  SkeletonBlock,
  SkeletonList,
  SkeletonRail,
} from '@/components/skeleton';
import { SiteHeader } from '@/components/site-header';

/**
 * Shown while a topic feed is being queried — and beneath it, every filtered
 * and paginated version of one, all of which are dynamic.
 *
 * One file per area rather than one per route: a `loading.tsx` covers its whole
 * subtree, so this also serves the paginated and filtered addresses beneath it.
 *
 * The header is drawn here too — it lives in the page, not in the root layout, so
 * omitting it would take the header off screen for the length of the query and
 * put it back, a flash worse than the wait it replaces.
 */
export default function Loading() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <SkeletonAnnounce />

        <SkeletonBlock className="h-3 w-[220px]" />

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-topic">
          <div className="hidden lg:block">
            <SkeletonRail />
          </div>

          <div className="min-w-0">
            <SkeletonBlock className="h-9 w-[240px]" />
            <SkeletonBlock className="mt-4 h-4 w-full max-w-prose" />
            <SkeletonBlock className="mt-2 h-4 w-[75%] max-w-prose" />

            <div className="mt-5 flex items-baseline justify-between border-b border-line pb-3.5">
              <SkeletonBlock className="h-4 w-[210px]" />
              <SkeletonBlock className="h-4 w-[110px]" />
            </div>

            <SkeletonList rows={6} />
          </div>

          <SkeletonAside />
        </div>
      </main>
    </>
  );
}
