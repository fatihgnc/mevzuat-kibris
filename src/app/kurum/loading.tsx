import { SkeletonAnnounce, SkeletonBlock } from '@/components/skeleton';
import { SiteHeader } from '@/components/site-header';

/**
 * Shown while the institution index is being queried.
 *
 * An index page is fast when it is warm and a database round trip when it is
 * not, and the difference is invisible from the outside — so it gets the same
 * treatment as everything else. One file covers this route and the paginated
 * ones beneath it.
 */
export default function Loading() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <SkeletonAnnounce />

        <SkeletonBlock className="h-3 w-[180px]" />
        <SkeletonBlock className="mt-6 h-9 w-[220px]" />
        <SkeletonBlock className="mt-4 h-4 w-full max-w-prose" />

        <ul className="mt-8 flex flex-col border-t border-line-soft">
          {Array.from({ length: 12 }, (_, i) => (
            <li key={i} className="flex items-center justify-between border-b border-line-soft py-3.5">
              <SkeletonBlock className="h-4 w-[46%]" />
              <SkeletonBlock className="h-3.5 w-[48px]" />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
