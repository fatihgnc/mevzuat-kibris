import { SkeletonAnnounce, SkeletonAside, SkeletonBlock, SkeletonList } from '@/components/skeleton';
import { SiteHeader } from '@/components/site-header';

/**
 * The home page's loading state — and the app's last resort.
 *
 * A loading.tsx at the root serves its own route and stands in for any
 * descendant that has none. Every route that queries the database has its own by
 * now, so in practice this is the home page; what is left over is the static
 * prose (rehber, hakkında, gizlilik, kullanım koşulları), which is prerendered
 * and arrives without a round trip, so this shape should never be seen there.
 *
 * That is worth stating because a wrong-shaped fallback is a real cost: it makes
 * the layout jump when the content lands. It is here as the safety net for a
 * route added later and forgotten, which is the failure this file is really for.
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
