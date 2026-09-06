import {
  SkeletonAnnounce,
  SkeletonBlock,
  SkeletonList,
  SkeletonRail,
} from '@/components/skeleton';
import { SiteHeader } from '@/components/site-header';

/**
 * Shown while a search is running.
 *
 * THE HEADER IS RENDERED HERE TOO. It lives in the page, not in the root layout,
 * so a loading file that omitted it would take the header off screen for the
 * length of the query and put it back — a flash worse than the wait it replaces.
 * It is drawn without the query, which is correct: the box in the rail is what
 * carries the query, and the rail is what is being replaced.
 *
 * This is the case the user described most precisely: type a term, press Ara, and
 * the previous results stay up for a second or two before anything moves. Next
 * holds the old page until the server component resolves; without a Suspense
 * boundary there is nothing to show in between.
 */
export default function Loading() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-8 lg:px-8">
        <SkeletonAnnounce />

        <div className="grid gap-8 lg:grid-cols-search">
          <div className="min-w-0">
            {/* Matches the rail's two presentations: a column at lg, a button below. */}
            <div className="hidden lg:block">
              <SkeletonRail />
            </div>
            <SkeletonBlock className="h-[44px] w-full lg:hidden" />
          </div>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between border-b border-line pb-3.5">
              <SkeletonBlock className="h-4 w-[150px]" />
              <SkeletonBlock className="h-4 w-[110px]" />
            </div>
            <SkeletonList rows={6} />
          </div>
        </div>
      </main>
    </>
  );
}
