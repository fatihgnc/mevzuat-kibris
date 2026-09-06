import { SkeletonAnnounce, SkeletonBlock } from '@/components/skeleton';
import { SiteHeader } from '@/components/site-header';

/**
 * The guides are prose and they are prerendered, so this should rarely be seen.
 * It exists because the root loading.tsx would otherwise stand in, and that one
 * is shaped like the home page — a hero, a search box and a list of records,
 * none of which is about to appear here. A fallback of the wrong shape makes the
 * layout jump when the content lands, which is worse than a plain one.
 *
 * Covers the index and every guide beneath it.
 */
export default function Loading() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <SkeletonAnnounce />

        <SkeletonBlock className="h-3 w-[180px]" />
        <SkeletonBlock className="mt-6 h-9 w-[70%] max-w-title" />

        <div className="mt-7 flex max-w-prose flex-col gap-3">
          {['w-full', 'w-[95%]', 'w-[88%]', 'w-[60%]'].map((width, i) => (
            <SkeletonBlock key={i} className={'h-4 ' + width} />
          ))}
        </div>

        <div className="mt-9 flex max-w-prose flex-col gap-3">
          {['w-[40%]', 'w-full', 'w-[92%]', 'w-[75%]'].map((width, i) => (
            <SkeletonBlock key={i} className={'h-4 ' + width} />
          ))}
        </div>
      </main>
    </>
  );
}
