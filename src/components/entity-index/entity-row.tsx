import Link from 'next/link';

/** The grid both the server list and the filter results render into. */
export const ENTITY_GRID_CLASS =
  'grid list-none border-t border-line p-0 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3';

/**
 * One row of the entity index. Shared by the server-rendered list and the client
 * filter results so the two cannot drift apart — no hooks, so it renders on
 * either side. The count is formatted inline (same as formatCount) because
 * queries/shared pulls drizzle into the client bundle.
 */
export function EntityRow({
  href,
  name,
  district,
  count,
}: {
  href: string;
  name: string;
  district: string | null;
  count: number;
}) {
  return (
    <li className="m-0 border-b border-line-soft">
      <Link
        href={href}
        className="flex items-baseline justify-between gap-3 py-3 text-ink-body no-underline hover:text-accent hover:no-underline"
      >
        <span className="min-w-0 text-md leading-[1.45]">
          {name}
          {/*
            The district is only worth showing when it ADDS something. For the six
            districts themselves it repeats the name — the row for Lefkoşa reads
            "Lefkoşa, Lefkoşa" — because a district's own district is itself.
            Villages and neighbourhoods are the case this field exists for.
          */}
          {district && district !== name ? (
            <span className="text-ink-fainter">, {district}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-sm tabular-nums text-ink-fainter">
          {count.toLocaleString('tr-TR')}
        </span>
      </Link>
    </li>
  );
}
