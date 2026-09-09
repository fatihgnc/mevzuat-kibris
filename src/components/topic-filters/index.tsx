import Link from 'next/link';

import { formatCount } from '@/lib/db/queries/shared';
import { docTypeLabel, type DocType } from '@/lib/constants/doc-types';
import { cn } from '@/lib/utils';

interface TopicFiltersProps {
  /** Where the form submits — the topic's own path, so the filter stays in place. */
  action: string;
  /**
   * Where "Filtreleri kaldır" goes: the bare topic address.
   *
   * It cannot be `action`. The form has to submit to the path carrying the
   * applied status, or changing a date would silently drop the status; clearing
   * has to drop it, or the one filter that lives in the path would be the one
   * the clear button cannot reach.
   */
  clearHref?: string;
  /**
   * The application-status rows, prebuilt by the caller: label, count and the
   * address that applies it. Empty for topics without deadlines, which is what
   * hides the section — münhal and ihale are the only two where a deadline is a
   * property of the document at all.
   */
  statusOptions?: ReadonlyArray<{
    key: string;
    label: string;
    n: number;
    href: string;
    active: boolean;
  }>;
  baslangic?: string;
  bitis?: string;
  /** The applied document types. */
  tur?: readonly DocType[];
  /**
   * The types this topic actually contains, with counts, most first. A topic is
   * not one kind of document — "Münhal" holds vacancy notices, exam results and
   * circulars at once, and until this arrived the rail could not tell them apart.
   */
  docTypes?: ReadonlyArray<{ key: string; label: string; n: number }>;
  /** Bounds for the pickers, taken from the archive rather than the calendar (spec 8.4). */
  coverage?: { earliestYear: number | null; latestYear: number | null } | null;
}

/**
 * The topic feed's filter rail.
 *
 * NARROWER THAN THE SEARCH RAIL, but no longer date-only. The topic is decided by
 * the URL, so that dimension is gone; document type is not — a topic mixes kinds
 * of document, and "Münhal" reads as one list of vacancies until you notice that
 * a third of it is exam results.
 *
 * The type section is emitted only when there is MORE THAN ONE type to choose
 * between. A single checkbox that every record in the list already matches
 * narrows nothing; it just gives the page a control that does not work.
 *
 * SORTING IS NOT HERE. It sits above the list, as `SortLinks`, exactly where the
 * search results carry it — one click that acts at once rather than a choice you
 * assemble and then apply. It spent one revision as a radio group in this rail,
 * which put the same control in two different shapes on two screens.
 *
 * Otherwise it is the same kind of thing as the search rail and works the same
 * way — a real `method="get"` form that accumulates a choice and applies it with
 * a button, so every state is a shareable URL and none of it needs JS. It submits
 * to the topic's own path rather than to /ara, so filtering a topic keeps you in
 * the topic.
 *
 * `sayfa` is deliberately not a field: changing a filter has to return you to the
 * first page, and never sending it does that by itself.
 */
export function TopicFilters({
  action,
  clearHref,
  statusOptions = [],
  baslangic,
  bitis,
  tur = [],
  docTypes = [],
  coverage,
}: TopicFiltersProps) {
  const min = coverage?.earliestYear ? coverage.earliestYear + '-01-01' : undefined;
  const max = coverage?.latestYear ? coverage.latestYear + '-12-31' : undefined;
  const active = Boolean(
    baslangic || bitis || tur.length || statusOptions.some((o) => o.active && o.key !== 'tumu'),
  );

  /*
   * Zero-count rows are dropped — ticking one returns an empty page — but a
   * SELECTED type stays whatever its count, otherwise there is no way to untick
   * it. A type that is applied yet missing from the facets entirely (the
   * combination matches nothing) is put back by hand for the same reason.
   */
  const shown = docTypes.filter((facet) => facet.n > 0 || tur.includes(facet.key as DocType));
  const absent = tur
    .filter((key) => !docTypes.some((facet) => facet.key === key))
    .map((key) => ({ key, label: docTypeLabel(key), n: 0 }));
  const typeOptions = [...shown, ...absent].sort(
    (a, b) => Number(a.key === 'diger') - Number(b.key === 'diger'),
  );

  /*
   * Remounts the form when the APPLIED values change — the same reason the search
   * rail carries a key. `defaultValue` is written to the DOM only on first mount,
   * so after a soft navigation to the cleared address React would keep the old
   * dates visible while the list below showed everything.
   */
  const appliedKey = [
    baslangic ?? '',
    bitis ?? '',
    [...tur].sort().join(','),
    statusOptions.find((o) => o.active)?.key ?? '',
  ].join('|');

  return (
    <form
      key={appliedKey}
      method="get"
      action={action}
      autoComplete="off"
      aria-label="Kayıt filtreleri"
      className="flex flex-col gap-6 lg:sticky lg:top-[var(--sticky-top)]"
    >
      {/*
        A SECTION OF LINKS INSIDE A FORM OF CHECKBOXES — deliberate, and the one
        place this rail mixes the two.

        The status lives in the PATH (/konu/munhal/acik), so it cannot be a field:
        a `method="get"` form can only append a query string, and a radio group
        here would need JS to rewrite the form's action. Making them links keeps
        the whole rail working with JS off, which is the property the rest of it
        was built for.

        The cost is that they act on click while the checkboxes wait for
        "Filtrele". That is the same bargain SortLinks already makes above the
        list, and it is the right way round: a status is one decision, not one you
        assemble.

        EVERY ROW STAYS AT A COUNT OF ZERO, unlike the document types, which drop
        out when empty. A type with no records is noise; a status with no records
        is the answer to the question the visitor came with — "is anything still
        open?" — and hiding it makes the site look like it cannot answer.
      */}
      {statusOptions.length ? (
        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-xs text-ink-faint">Başvuru durumu</h2>
            <span className="text-2xs text-ink-placeholder">bu konuda</span>
          </div>
          <ul className="flex flex-col gap-[7px]">
            {statusOptions.map((option) => (
              <li key={option.key}>
                <Link
                  href={option.href}
                  aria-current={option.active ? 'true' : undefined}
                  className={cn(
                    'flex items-center justify-between gap-2 text-base no-underline hover:text-accent hover:no-underline',
                    option.active ? 'font-semibold text-ink' : 'text-ink-body',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                  <span
                    className={cn(
                      'shrink-0 text-sm',
                      option.active ? 'text-ink-muted' : 'text-ink-fainter',
                    )}
                  >
                    {formatCount(option.n)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {typeOptions.length > 1 ? (
        <section>
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-xs text-ink-faint">Belge türü</h2>
            <span className="text-2xs text-ink-placeholder">bu konuda</span>
          </div>
          <ul className="flex flex-col gap-[7px]">
            {typeOptions.map((facet) => (
              <li key={facet.key}>
                <label className="flex cursor-pointer items-center justify-between gap-2 text-base text-ink-body hover:text-accent">
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      name="tur"
                      value={facet.key}
                      defaultChecked={tur.includes(facet.key as DocType)}
                      className="h-3.5 w-3.5 shrink-0 accent-accent"
                    />
                    <span className="truncate">{facet.label}</span>
                  </span>
                  <span className="shrink-0 text-sm text-ink-fainter">{formatCount(facet.n)}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Tarih aralığı</h2>
        <div className="flex flex-col gap-2">
          <DateField name="baslangic" label="Başlangıç" defaultValue={baslangic} min={min} max={max} />
          <DateField name="bitis" label="Bitiş" defaultValue={bitis} min={min} max={max} />
        </div>
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
            href={clearHref ?? action}
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
