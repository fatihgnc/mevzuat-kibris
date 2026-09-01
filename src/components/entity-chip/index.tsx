import Link from 'next/link';

import { ENTITY_PATH } from '@/types/entity';
import type { EntityKind } from '@/types/record';
import { cn } from '@/lib/utils';

interface EntityChipProps {
  kind: EntityKind;
  slug: string;
  name: string;
  className?: string;
}

/**
 * The "mentioned in this record" chip (artboards 1a/1g).
 *
 * On mobile the touch target grows to 44px; on desktop it is tighter. That is a
 * decision drawn separately on the design's mobile artboard.
 */
export function EntityChip({ kind, slug, name, className }: EntityChipProps) {
  return (
    <Link
      href={ENTITY_PATH[kind] + '/' + slug}
      className={cn(
        'inline-flex min-h-[44px] items-center rounded border border-line bg-surface px-3 py-2.5 text-base text-ink no-underline',
        'hover:border-accent hover:text-accent hover:no-underline',
        'sm:min-h-0 sm:px-[11px] sm:py-1.5 sm:text-base',
        className,
      )}
    >
      {name}
    </Link>
  );
}
