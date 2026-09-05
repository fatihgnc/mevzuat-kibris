import Link from 'next/link';

import { DEFAULT_SORT, SORT_LABELS, SORT_OPTIONS, type SortOption } from '@/lib/search/build-query';
import { cn } from '@/lib/utils';

interface TopicFiltersProps {
  /** Where the form submits — the topic's own path, so the filter stays in place. */
  action: string;
  baslangic?: string;
  bitis?: string;
  sirala: SortOption;
  /** Bounds for the pickers, taken from the archive rather than the calendar (spec 8.4). */
  coverage?: { earliestYear: number | null; latestYear: number | null } | null;
}

/**
 * The topic feed's filter rail.
 *
 * DELIBERATELY NARROWER THAN THE SEARCH RAIL. Search offers topic and document
 * type as well; here the topic is already decided by the URL, so the only
 * dimension left worth a control is time. By the product owner's decision that is
 * all this rail carries: a date range and the sort order.
 *
 * It is the same kind of thing as the search rail and works the same way — a real
 * `method="get"` form that accumulates a choice and applies it with a button, so
 * every state is a shareable URL and none of it needs JS. It submits to the
 * topic's own path rather than to /ara, so filtering a topic keeps you in the
 * topic.
 *
 * `sayfa` is deliberately not a field: changing a filter has to return you to the
 * first page, and never sending it does that by itself.
 */
export function TopicFilters({
  action,
  baslangic,
  bitis,
  sirala,
  coverage,
}: TopicFiltersProps) {
  const min = coverage?.earliestYear ? coverage.earliestYear + '-01-01' : undefined;
  const max = coverage?.latestYear ? coverage.latestYear + '-12-31' : undefined;
  const active = Boolean(baslangic || bitis || sirala !== DEFAULT_SORT);

  /*
   * Remounts the form when the APPLIED values change — the same reason the search
   * rail carries a key. `defaultValue` is written to the DOM only on first mount,
   * so after a soft navigation to the cleared address React would keep the old
   * dates visible while the list below showed everything.
   */
  const appliedKey = [baslangic ?? '', bitis ?? '', sirala].join('|');

  return (
    <form
      key={appliedKey}
      method="get"
      action={action}
      autoComplete="off"
      aria-label="Kayıt filtreleri"
      className="flex flex-col gap-6 lg:sticky lg:top-[var(--sticky-top)]"
    >
      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Tarih aralığı</h2>
        <div className="flex flex-col gap-2">
          <DateField name="baslangic" label="Başlangıç" defaultValue={baslangic} min={min} max={max} />
          <DateField name="bitis" label="Bitiş" defaultValue={bitis} min={min} max={max} />
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Sıralama</h2>
        <ul className="flex flex-col gap-[7px]">
          {SORT_OPTIONS.map((option) => (
            <li key={option}>
              <label
                className={cn(
                  'flex cursor-pointer items-center gap-2 text-base leading-none',
                  option === sirala ? 'text-ink' : 'text-ink-body',
                )}
              >
                <input
                  type="radio"
                  name="sirala"
                  value={option}
                  defaultChecked={option === sirala}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    'box-border block h-3 w-3 shrink-0 rounded-full bg-surface',
                    option === sirala ? 'border-4 border-accent' : 'border border-line-strong',
                  )}
                />
                {SORT_LABELS[option]}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          className="rounded bg-accent py-2.5 text-base font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Filtrele
        </button>
        {/*
          * A LINK, not a reset button: clearing is a navigation to the bare topic
          * address, which is also the prerendered one. It only appears when
          * something is applied — otherwise it is a control that does nothing.
          */}
        {active ? (
          <Link
            href={action}
            className="rounded border border-line-strong py-2 text-center text-base text-ink-body no-underline transition-colors hover:border-ink hover:text-ink hover:no-underline"
          >
            Filtreleri kaldır
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function DateField({
  name,
  label,
  defaultValue,
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  min?: string;
  max?: string;
}) {
  const id = 'topic-' + name;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-[52px] shrink-0 text-sm text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type="date"
        name={name}
        defaultValue={defaultValue}
        min={min}
        max={max}
        className="min-w-0 flex-1 rounded border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink outline-none"
      />
    </div>
  );
}
