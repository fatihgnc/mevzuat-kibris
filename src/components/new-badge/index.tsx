import { cn } from '@/lib/utils';

/**
 * The "YENİ" pill next to a recently added tool, inside menus and lists.
 * Marked `aria-hidden` with a visually hidden twin so a screen reader hears
 * "yeni" once, as part of the link name, rather than spelled-out capitals.
 */
export function NewBadge({ className }: { className?: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'inline-block shrink-0 rounded-pill bg-accent px-2 py-1 align-middle text-xs font-semibold uppercase leading-none tracking-wide text-accent-ink',
          className,
        )}
      >
        YENİ
      </span>
      <span className="sr-only"> (yeni)</span>
    </>
  );
}

/**
 * A pulsing dot that flags new content on a closed menu, where a text badge
 * would crowd the header row. The ring stops for readers who ask for reduced
 * motion; the dot itself stays.
 */
export function PulseDot({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn('relative inline-flex h-2 w-2 shrink-0', className)}>
      <span className="absolute inline-flex h-full w-full rounded-full bg-link opacity-75 motion-safe:animate-ping" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-link" />
    </span>
  );
}
