import Link from 'next/link';

import { docTypeLabel } from '@/lib/constants/doc-types';
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
  /**
   * Distinguishes the two copies of this form that exist at once — the column on
   * a wide screen and the sheet on a narrow one. Only the date inputs carry ids,
   * but two elements sharing one id break `htmlFor`, so the label stops focusing
   * its field and a screen reader reads the wrong one.
   */
  scope?: string;
  /**
   * True on an entity page, where the only thing in `params` is the pin naming
   * the page itself. Nothing has been APPLIED there, so "Filtreleri kaldır" —
   * which `hasActiveFilters` would otherwise switch on, the pin counting as a
   * filter everywhere else — becomes a control that clears nothing and links to
   * the page you are already standing on.
   */
  pinned?: boolean;
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
export function SearchFilters({
  params,
  facets,
  coverage,
  scope = 'rail',
  pinned = false,
}: SearchFiltersProps) {
  const years = yearOptions(coverage);
  const activeYear = params.yil;

  // The picker's bounds come from the archive, not the calendar (spec 8.4).
  const coverageMin = coverage?.earliestYear ? coverage.earliestYear + '-01-01' : undefined;
  const coverageMax = coverage?.latestYear ? coverage.latestYear + '-12-31' : undefined;
  const filtersOpen = !pinned && hasActiveFilters(params);

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
    params.baslangic ?? '',
    params.bitis ?? '',
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
      {/*
        * THE QUERY IS A FIELD IN THE RAIL, not a hidden input any more.
        *
        * It used to live in the header, which forced the header into a second
        * shape for this one page — and put the two halves of the same question
        * ("these words, narrowed this way") at opposite ends of the screen. Here
        * it is the first control above the filters it combines with, and the
        * whole thing is applied by one "Filtrele".
        *
        * The header's magnifier still opens a search from anywhere, this page
        * included; that one starts a NEW search and drops the filters, which is
        * what starting from the header means.
        */}
      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Arama</h2>
        <label className="sr-only" htmlFor={'filter-' + scope + '-q'}>
          Resmî Gazete kayıtlarında ara
        </label>
        <input
          id={'filter-' + scope + '-q'}
          type="search"
          name="q"
          defaultValue={params.q}
          placeholder="kelime ya da referans no"
          className="w-full min-w-0 rounded border border-line-strong bg-surface px-2.5 py-2 text-base text-ink outline-none placeholder:text-ink-placeholder focus:border-ink"
        />
      </section>

      {/* Fields we do not show in the rail but that must survive form submission. */}
      {params.sirala !== DEFAULT_SORT ? (
        <input type="hidden" name="sirala" value={params.sirala} />
      ) : null}
      {/*
       * The entity pin. On /kurum/x, /sirket/x and /yer/x this same rail sits on
       * the entity's own page, and submitting it hands the whole thing to /ara
       * WITH the entity still applied — otherwise "Bakanlar Kurulu + ihale +
       * 2024" would come back as every ihale in 2024.
       */}
      {params.kurum ? <input type="hidden" name="kurum" value={params.kurum} /> : null}
      {params.sirket ? <input type="hidden" name="sirket" value={params.sirket} /> : null}
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
        * The custom range — `baslangic`/`bitis` were already in the schema and in
        * the query layer, kept alive so old shared links would not break; only
        * the UI had stopped producing them. This surfaces them again.
        *
        * `type="date"` rather than a text field: the browser gives a picker and a
        * locale-correct display, and the value it submits is always ISO, which is
        * exactly the `\d{4}-\d{2}-\d{2}` the schema accepts. Anything it cannot
        * parse never leaves the field.
        *
        * `min`/`max` come from the archive's own coverage, so the picker cannot
        * offer a month the archive has nothing for (spec 8.4).
        */}
      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Tarih aralığı</h2>
        <div className="flex flex-col gap-2">
          <DateField
            scope={scope}
            name="baslangic"
            label="Başlangıç"
            defaultValue={params.baslangic}
            min={coverageMin}
            max={coverageMax}
          />
          <DateField
            scope={scope}
            name="bitis"
            label="Bitiş"
            defaultValue={params.bitis}
            min={coverageMin}
            max={coverageMax}
          />
        </div>
        <p className="mt-2 text-2xs leading-[1.45] text-ink-placeholder">
          Tarih verirseniz yukarıdaki yıl seçimi uygulanmaz.
        </p>
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
            /* The entity pin survives clearing; it is not one of the filters. */
            href={buildSearchHref({
              q: params.q,
              kurum: params.kurum,
              sirket: params.sirket,
              yer: params.yer,
            })}
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

/** The three entity pins, with the name to print for each. */
export interface PinNames {
  kurum?: string;
  sirket?: string;
  yer?: string;
}

/** Active filter chips — the "Son 12 ay ×" badges in artboard 1f. */
export function ActiveFilterChips({
  params,
  pinNames,
}: {
  params: SearchParams;
  /**
   * Display names for `kurum`/`sirket`/`yer`, resolved by the caller — the URL
   * carries a slug and a chip has to say "Bakanlar Kurulu", not
   * "bakanlar-kurulu". Without them the pin is INVISIBLE: arriving from an
   * entity page's rail, the results are restricted to that entity and nothing on
   * the screen says so, which reads as the search being wrong.
   */
  pinNames?: PinNames;
}) {
  const chips: Array<{ key: string; label: string; href: string }> = [];

  /* The pin is the widest thing applied, so it is named first. */
  for (const pin of ['kurum', 'sirket', 'yer'] as const) {
    const slug = params[pin];
    if (!slug) continue;
    chips.push({
      key: pin,
      label: pinNames?.[pin] ?? slug,
      href: buildSearchHref(params, { [pin]: undefined, sayfa: 1 }),
    });
  }

  /*
   * The query is a chip too, and it comes first.
   *
   * On a narrow screen the rail is inside the filter sheet, so with the query
   * living in the rail there would otherwise be NOTHING on the page saying what
   * was searched — you would have to open the sheet to find out. As a chip it is
   * removed the same way a filter is: the × keeps the filters and drops the words.
   */
  if (params.q) {
    chips.push({
      key: 'q',
      label: '“' + params.q + '”',
      href: buildSearchHref(params, { q: '', sayfa: 1 }),
    });
  }

  for (const topic of params.konu) {
    chips.push({
      key: 'konu-' + topic,
      label: TOPICS[topic].name,
      href: buildSearchHref(params, { konu: toggle(params.konu, topic), sayfa: 1 }),
    });
  }

  for (const type of params.tur) {
    chips.push({
      key: 'tur-' + type,
      label: docTypeLabel(type),
      href: buildSearchHref(params, { tur: toggle(params.tur, type), sayfa: 1 }),
    });
  }

  if (params.yil) {
    chips.push({
      key: 'yil',
      label: String(params.yil),
      href: buildSearchHref(params, { yil: undefined, sayfa: 1 }),
    });
  }

  /* The range is produced by the rail again; the chip is how it comes off. */
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
          /*
            * Clears the QUERY as well, now that the query is one of these chips.
            * It used to preserve it deliberately — "clearing filters must not lose
            * your search" — but that was written when the words were not shown
            * here. A control sitting under a list that includes “ihale” has to
            * remove everything in the list or it is lying about what it does.
            */
          href={buildSearchHref(
            { q: '', kurum: params.kurum, sirket: params.sirket, yer: params.yer },
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

function DateField({
  scope,
  name,
  label,
  defaultValue,
  min,
  max,
}: {
  scope: string;
  name: string;
  label: string;
  defaultValue?: string;
  min?: string;
  max?: string;
}) {
  const id = 'filter-' + scope + '-' + name;
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
