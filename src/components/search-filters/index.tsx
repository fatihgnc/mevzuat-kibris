import Link from 'next/link';

import { TOPICS, TOPIC_LIST } from '@/lib/constants/topics';
import { formatCount } from '@/lib/db/queries/shared';
import {
  DEFAULT_SORT,
  buildSearchHref,
  hasActiveFilters,
  yearOptions,
  type SearchParams,
  type YearOption,
} from '@/lib/search/build-query';
import type { SearchResult } from '@/lib/db/queries/records';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  params: SearchParams;
  facets: SearchResult['facets'];
  /** Year options are derived from the data, not from the calendar (spec 8.4). */
  coverage?: { earliestYear: number | null; latestYear: number | null } | null;
}

/**
 * The filter rail — the left column of artboard 1b.
 *
 * A REAL FORM, and it still works without JS. Filters used to be links that
 * reloaded the page the moment they were clicked; by the product owner's decision
 * selections now accumulate and are applied in one go with "Filtrele".
 *
 * That is why `method="get"` was chosen: using a plain HTML form instead of a JS
 * component that navigates on change means the change breaks none of the design's
 * three core properties —
 *
 *   1. every filter combination is still a shareable URL (spec 5.5),
 *   2. it works without JS,
 *   3. it renders on the server, with no client state.
 *
 * The browser builds the address bar itself on submit, so `buildSearchHref` is not
 * needed. The `sayfa` field is DELIBERATELY absent from the form: changing a
 * filter must return you to page 1, and simply never sending the field does that
 * on its own.
 */
export function SearchFilters({ params, facets, coverage }: SearchFiltersProps) {
  const years = yearOptions(coverage);
  const activeYear = params.yil;
  const filtersOpen = hasActiveFilters(params);

  /*
   * Topics are ALWAYS the full list. Emitting only the facet rows narrowed the
   * list to its own result when a filter was applied: picking "Atama" left a
   * single option and the user could not add another topic. The option stays even
   * at count 0; the order is fixed too, so the box does not move.
   */
  const topicCounts = new Map(facets.topics.map((facet) => [facet.key, facet.n]));

  /*
   * Emitting all 23 document types would drown the rail; the eight with the most
   * results are shown. But if a SELECTED type drops off the list the user cannot
   * undo it — so selected ones are always added back.
   */
  const docTypeShortlist = facets.docTypes.slice(0, 8);
  const missingChecked = facets.docTypes
    .slice(8)
    .filter((facet) => params.tur.includes(facet.key as never));
  const docTypes = [...docTypeShortlist, ...missingChecked];

  /*
   * A signature of the APPLIED filters — used to remount the form.
   *
   * The inputs use `defaultChecked`, and that value is written to the DOM ONLY on
   * first mount. During a Next.js soft navigation ("Filtreleri kaldır" is a Link)
   * React reuses the same <input> elements, ignores the `defaultChecked` change,
   * and the boxes stayed ticked: a screen where the results had been reset but the
   * filters still looked selected.
   *
   * When the key changes, React tears down the old tree and builds a new one, so
   * the correct checked state produced by the server is applied to the DOM. Because
   * this is a server component, making the inputs controlled (useState) is not an
   * option.
   */
  const appliedKey = [
    params.konu.join(','),
    params.tur.join(','),
    params.yil ?? '',
    params.q,
  ].join('|');

  return (
    <form
      key={appliedKey}
      method="get"
      action="/ara"
      /*
       * The browser's own form-state restoration produces the same bug: on
       * back/forward and reload it restores the ticks to whatever the user last
       * touched rather than to the HTML the server sent. The single source of
       * filter state must be the URL.
       */
      autoComplete="off"
      aria-label="Arama filtreleri"
      /*
       * Sticky: the filters stay on the left as the user scrolls a long result
       * list. The top value lines up under the header (which is sticky top-0). A
       * height limit plus its own scrolling is essential: the year list grows as
       * the archive grows, and if it overflows the screen the "Filtrele" button
       * becomes unreachable. Only at lg — below that the grid collapses to one
       * column, where a sticky rail would push the content around.
       */
      className="flex flex-col gap-6 lg:sticky lg:top-[var(--sticky-top)] lg:max-h-[calc(100vh-var(--sticky-top)-1rem)] lg:overflow-y-auto lg:pb-1"
    >
      {/* Fields we do not show in the rail but that must survive form submission. */}
      <input type="hidden" name="q" value={params.q} />
      {params.sirala !== DEFAULT_SORT ? (
        <input type="hidden" name="sirala" value={params.sirala} />
      ) : null}
      {params.kurum ? <input type="hidden" name="kurum" value={params.kurum} /> : null}
      {params.yer ? <input type="hidden" name="yer" value={params.yer} /> : null}

      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-xs text-ink-faint">Konu</h2>
          <span className="text-2xs text-ink-placeholder">bu sonuçlarda</span>
        </div>
        <ul className="flex flex-col gap-[7px]">
          {TOPIC_LIST.map((topic) => (
            <li key={topic.slug}>
              <FilterCheckbox
                name="konu"
                value={topic.slug}
                defaultChecked={params.konu.includes(topic.slug)}
                count={topicCounts.get(topic.slug) ?? 0}
              >
                {TOPICS[topic.slug].name}
              </FilterCheckbox>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Belge türü</h2>
        <ul className="flex flex-col gap-[7px]">
          {docTypes.map((facet) => (
            <li key={facet.key}>
              <FilterCheckbox
                name="tur"
                value={facet.key}
                defaultChecked={params.tur.includes(facet.key as never)}
                count={facet.n}
              >
                {facet.label}
              </FilterCheckbox>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Yıl</h2>
        <ul className="flex flex-col gap-[7px]">
          {years.map((option) => (
            <li key={option.key}>
              <YearRadio option={option} activeYear={activeYear} />
            </li>
          ))}
        </ul>
      </section>

      {/*
        Putting the button at the END of the rail is deliberate: selections are made
        top to bottom, and the action belongs where the reading stops.

        "Filtreleri kaldır" is a LINK, not a button: it is not a form submission but
        a navigation to the unfiltered address. The query text is preserved — a user
        clearing filters must not lose their search. It only appears when a filter
        is applied; when empty it would just add clutter.
      */}
      <div className="sticky bottom-0 flex flex-col gap-2 bg-surface pt-1">
        <button
          type="submit"
          className="rounded bg-accent py-2.5 text-base font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Filtrele
        </button>
        {filtersOpen ? (
          <Link
            href={buildSearchHref({ q: params.q })}
            className="rounded border border-line-strong py-2 text-center text-base text-ink-body no-underline transition-colors hover:border-ink hover:text-ink hover:no-underline"
          >
            Filtreleri kaldır
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function FilterCheckbox({
  name,
  value,
  defaultChecked,
  count,
  children,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-base text-ink-body hover:text-accent">
      <span className="flex min-w-0 items-center gap-2">
        <input
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          className="h-3.5 w-3.5 shrink-0 accent-accent"
        />
        <span className="truncate">{children}</span>
      </span>
      <span className="shrink-0 text-sm text-ink-fainter">{formatCount(count)}</span>
    </label>
  );
}

/**
 * The year radio group. The "Tümü" value is an empty string: empty values are not
 * written to the URL on submit, so the year filter drops out by itself.
 */
function YearRadio({ option, activeYear }: { option: YearOption; activeYear?: number }) {
  const checked = option.yil === undefined ? activeYear === undefined : activeYear === option.yil;

  return (
    <label className="flex cursor-pointer items-center gap-2 text-base text-ink-body hover:text-accent">
      <input
        type="radio"
        name="yil"
        value={option.yil ?? ''}
        defaultChecked={checked}
        className="h-3.5 w-3.5 shrink-0 accent-accent"
      />
      <span className={cn('truncate', checked && 'font-semibold text-accent')}>{option.label}</span>
    </label>
  );
}

function toggle<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Active filter chips — the "Son 12 ay ×" badges in artboard 1f. */
export function ActiveFilterChips({ params }: { params: SearchParams }) {
  const chips: Array<{ key: string; label: string; href: string }> = [];

  for (const topic of params.konu) {
    chips.push({
      key: 'konu-' + topic,
      label: TOPICS[topic].name,
      href: buildSearchHref(params, { konu: toggle(params.konu, topic), sayfa: 1 }),
    });
  }

  if (params.yil) {
    chips.push({
      key: 'yil',
      label: String(params.yil),
      href: buildSearchHref(params, { yil: undefined, sayfa: 1 }),
    });
  }

  /*
   * baslangic/bitis are no longer produced by the UI, but they can still arrive in
   * old shared links; we show their chip so they remain removable.
   */
  if (params.baslangic || params.bitis) {
    chips.push({
      key: 'tarih',
      label: [params.baslangic, params.bitis].filter(Boolean).join(' – '),
      href: buildSearchHref(params, { baslangic: undefined, bitis: undefined, sayfa: 1 }),
    });
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="text-xs text-ink-faint">Açık filtreler</h2>
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href}
              className="inline-flex items-center gap-1.5 rounded-pill bg-mark px-2.5 py-1 text-sm font-semibold text-ink no-underline hover:no-underline"
            >
              {chip.label}
              <span aria-hidden className="text-ink-faint">
                ×
              </span>
              <span className="sr-only">filtresini kaldır</span>
            </Link>
          </li>
        ))}
      </ul>
      {chips.length > 1 ? (
        <Link
          href={buildSearchHref(
            { q: params.q },
            { konu: [], tur: [], baslangic: undefined, bitis: undefined, yil: undefined },
          )}
          className="text-base"
        >
          Hepsini kaldır
        </Link>
      ) : null}
    </div>
  );
}
