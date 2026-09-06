import { SkeletonAnnounce, SkeletonAside, SkeletonBlock, SkeletonList } from '@/components/skeleton';
import { SiteHeader } from '@/components/site-header';

/**
 * The home page's loading state.
 *
 * IT LIVES IN A ROUTE GROUP, and that is the point. At the root it was also the
 * fallback for every descendant without one, so every page on the site streamed
 * this home-shaped skeleton — hero, search box, list of records — before its own
 * content resolved. A fallback of the wrong shape is worse than none: it paints,
 * then the layout jumps when the real page lands. `(home)` is not part of the
 * URL, so this still serves `/` and nothing else.
 *
 * The cost is that there is no longer a net for a route added later without a
 * loading file. That is the right trade: a missing skeleton is a page that feels
 * like it did last week, while a wrong one is a page that flickers.
 */
export default function Loading() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-8 lg:px-10">
        <SkeletonAnnounce />

        <SkeletonBlock className="h-9 w-full max-w-[22em]" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-lede" />
        <SkeletonBlock className="mt-2 h-4 w-[70%] max-w-lede" />

        {/* The hero search box. */}
        <SkeletonBlock className="mt-7 h-[52px] w-full max-w-[44em]" />

        <div className="mt-11 grid gap-10 lg:grid-cols-page">
          <div className="min-w-0">
            <div className="flex items-baseline justify-between border-b border-line pb-3.5">
              <SkeletonBlock className="h-4 w-[160px]" />
              <SkeletonBlock className="h-4 w-[48px]" />
            </div>
            <SkeletonList rows={6} />
          </div>

          <SkeletonAside />
        </div>
      </main>
    </>
  );
}
