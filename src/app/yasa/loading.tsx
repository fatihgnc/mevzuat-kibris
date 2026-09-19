import { SiteHeader } from '@/components/site-header';
import { SkeletonAnnounce, SkeletonBlock } from '@/components/skeleton';

/** Shown while a law or the law index is being read; one file covers the route and its children. */
export default function Loading() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <SkeletonAnnounce />

        <SkeletonBlock className="h-3 w-[180px]" />
        <SkeletonBlock className="mt-6 h-10 w-[60%]" />
        <SkeletonBlock className="mt-8 h-[320px] w-full" />
      </main>
    </>
  );
}
