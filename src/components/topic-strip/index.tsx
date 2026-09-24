import Link from 'next/link';

import { TOPIC_LIST } from '@/lib/constants/topics';
import { formatCount } from '@/lib/db/queries/shared';
import { cn } from '@/lib/utils';

/**
 * The home page topic grid — artboard 1d.
 *
 * Two columns (three from lg), a 1px gap between them and the line colour behind: the cells are
 * white and the gap is grey, so the grid draws its own border. Using a gap instead
 * of a border keeps the text inside the cells aligned.
 *
 * The cost of that technique: when the last row is incomplete the gap grows to the
 * size of a cell and the grid's backing shows as one large block. With eight topics
 * (an even number) it went unnoticed; adding a ninth exposed it. Filler cells in
 * the surface colour cover the empties.
 *
 * Because the column count changes with the breakpoint (2 -> 3), the number of
 * missing cells changes too: nine topics leave one gap in two columns and none in
 * three. The fillers are therefore not fixed but computed separately for each
 * layout and shown only at the breakpoint that needs them. It stays correct on its
 * own when the topic count changes.
 *
 * Ordering is by record count: the user sees the topic with the most content first.
 */
/** How many cells are missing to complete the last row at a given column count. */
function missingCells(count: number, columns: number): number {
  return (columns - (count % columns)) % columns;
}

export function TopicStrip({ counts }: { counts: Record<string, number> }) {
  const topics = [...TOPIC_LIST].sort(
    (a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0) || a.sortOrder - b.sortOrder,
  );

  const twoCol = missingCells(topics.length, 2);
  const threeCol = missingCells(topics.length, 3);

  const fillers = Array.from({ length: Math.max(twoCol, threeCol) }, (_, index) => {
    const inTwo = index < twoCol;
    const inThree = index < threeCol;
    if (inTwo && inThree) return 'block';
    if (inTwo) return 'block lg:hidden';
    return 'lg:block';
  });

  return (
    <div className="mt-[1px] grid grid-cols-2 gap-[1px] bg-line-soft lg:grid-cols-3">
      {topics.map((topic) => (
        <Link
          key={topic.slug}
          href={'/konu/' + topic.slug}
          className="flex flex-col gap-1 bg-surface px-3 py-3 no-underline transition-colors hover:bg-surface-hover hover:no-underline sm:px-4 sm:py-3.5"
        >
          <span className="flex items-center gap-2 text-lg font-semibold text-ink">
            {topic.name}
          </span>
          {/* Phone: name and count only — the blurbs made nine cells 929px tall. */}
          <span className="hidden text-base leading-[1.45] text-ink-muted sm:block">
            {topic.blurb}
          </span>
          <span className="text-sm text-ink-fainter">
            {counts[topic.slug] ? formatCount(counts[topic.slug]!) + ' kayıt' : 'Henüz kayıt yok'}
          </span>
        </Link>
      ))}

      {/*
        Two columns from the smallest screen up, three from lg. Each filler opens
        only at the column count that leaves the gap it covers.
      */}
      {fillers.map((visibility, index) => (
        <div key={index} aria-hidden className={cn('hidden bg-surface', visibility)} />
      ))}
    </div>
  );
}
