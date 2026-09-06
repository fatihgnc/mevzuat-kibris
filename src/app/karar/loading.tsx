import { SkeletonAnnounce, SkeletonAside, SkeletonBlock } from '@/components/skeleton';
import { SiteHeader } from '@/components/site-header';

/**
 * Shown while a record page is being fetched.
 *
 * It sits at /karar rather than at /karar/[slug] so one file covers the whole
 * area. This is the navigation the user reported first: only the last 24 months
 * are prerendered, so a click into the older archive waits on a database round
 * trip and a render, and nothing on screen moved in the meantime.
 *
 * The shapes follow the real page's order — meta line, heading, the gazette's own
 * title in its box, the metadata bar, then body — so the layout does not jump when
 * the content arrives.
 */
export default function Loading() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <SkeletonAnnounce />

        <SkeletonBlock className="h-3 w-[220px]" />

        <div className="mt-7 max-w-title">
          <SkeletonBlock className="h-3.5 w-[260px]" />
          <SkeletonBlock className="mt-4 h-8 w-full" />
          <SkeletonBlock className="mt-2.5 h-8 w-[70%]" />
        </div>

        <SkeletonBlock className="mt-5 h-4 w-[80%] max-w-prose" />

        <SkeletonBlock className="mt-6 h-[74px] w-full" />

        <div className="mt-7 grid gap-6 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <SkeletonBlock className="h-3 w-[56px]" />
              <SkeletonBlock className="h-4 w-[88px]" />
            </div>
          ))}
        </div>

        <SkeletonBlock className="mt-7 h-[42px] w-[180px]" />

        <div className="mt-9 grid gap-10 lg:grid-cols-record">
          <div className="flex min-w-0 flex-col gap-[18px]">
            {/* Uneven widths, so the block reads as prose rather than a table. */}
            {['w-full', 'w-[92%]', 'w-[97%]', 'w-[70%]', 'w-[88%]', 'w-[55%]'].map((width, i) => (
              <SkeletonBlock key={i} className={'h-4 ' + width} />
            ))}
          </div>
          <SkeletonAside />
        </div>
      </main>
    </>
  );
}
