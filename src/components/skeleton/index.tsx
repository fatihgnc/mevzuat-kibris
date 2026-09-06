import { cn } from '@/lib/utils';

/**
 * The placeholder shapes shown while a page is being rendered on the server.
 *
 * WHY THEY EXIST. Every page here is a server component that queries Postgres, so
 * Next holds the OLD page on screen until the new one is ready. Clicking a record
 * did nothing visible for a second or two, and a search left the previous results
 * up while the new ones were fetched — the user's own report, and the worst
 * possible feedback: it reads as a dead link, so people click again.
 *
 * A `loading.tsx` beside a page turns that dead time into an immediate paint. The
 * shapes below are what those files draw.
 *
 * THEY ARE DELIBERATELY DULL. No shimmer sweeping across the screen, no spinner
 * that spins for two seconds and then vanishes. `animate-pulse` on a flat block is
 * enough to say "this is not the content yet", and anything livelier competes with
 * the text that is about to replace it.
 *
 * `aria-hidden` throughout, with one `aria-busy` region at the top of each
 * loading file: a screen reader should hear "yükleniyor" once, not read out two
 * dozen empty boxes.
 */
export function SkeletonBlock({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded bg-surface-hover', className)} />;
}

/** One row of the record list — the 92px date column and the text beside it. */
export function SkeletonRow() {
  return (
    <div className="grid grid-cols-row items-start gap-[14px] border-b border-line-soft py-4 pl-3 pr-[10px] sm:gap-[18px]">
      <div className="flex flex-col gap-[6px] pt-0.5">
        <SkeletonBlock className="h-3.5 w-[72px]" />
        <SkeletonBlock className="h-3 w-[52px]" />
      </div>
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-4 w-[85%]" />
        <SkeletonBlock className="h-4 w-[55%]" />
        <SkeletonBlock className="mt-1 h-3 w-[35%]" />
      </div>
    </div>
  );
}

/**
 * A list of rows. Five, not twenty: the point is to show that something is
 * arriving, and a full page of grey boxes is its own kind of noise.
 */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

/** The filter rail's shape: a few headed groups of short lines. */
export function SkeletonRail() {
  return (
    <div className="flex flex-col gap-6">
      {[4, 6, 4].map((lines, group) => (
        <div key={group}>
          <SkeletonBlock className="mb-3 h-3 w-[64px]" />
          <div className="flex flex-col gap-[9px]">
            {Array.from({ length: lines }, (_, i) => (
              <SkeletonBlock key={i} className="h-3.5 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The follow / RSS column. */
export function SkeletonAside() {
  return (
    <div className="flex flex-col gap-[18px]">
      <SkeletonBlock className="h-[210px] w-full" />
      <SkeletonBlock className="h-[150px] w-full" />
    </div>
  );
}

/**
 * The one thing a screen reader is told. Everything else on a loading screen is
 * aria-hidden, so this is the whole announcement.
 */
export function SkeletonAnnounce() {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      Yükleniyor
    </p>
  );
}
