'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import type { EntityKind } from '@/types/record';

import { ENTITY_GRID_CLASS, EntityRow } from './entity-row';

interface Result {
  slug: string;
  name: string;
  district: string | null;
  count: number;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; results: Result[] }
  | { status: 'error' };

const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;
const LIMIT = 60;

/**
 * The filter box on the entity index pages. The list is paginated and
 * prerendered, so the full set is never on the client — the filter queries
 * /api/search-suggest instead of filtering what is on screen.
 *
 * Below MIN_QUERY characters it renders `children` (the server list and its
 * pagination) untouched, so with JS off, or with an empty box, the page is
 * exactly what it was before — nothing changes for crawlers.
 */
export function EntityFilter({
  kind,
  basePath,
  unit,
  children,
}: {
  kind: EntityKind;
  basePath: string;
  unit: string;
  children: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  const trimmed = query.trim();
  const active = trimmed.length >= MIN_QUERY;

  useEffect(() => {
    if (!active) {
      setState({ status: 'idle' });
      return;
    }

    setState((prev) => (prev.status === 'done' ? prev : { status: 'loading' }));
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ kind, q: trimmed, limit: String(LIMIT) });
        const response = await fetch('/api/search-suggest?' + params.toString(), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { results: Result[] };
        setState({ status: 'done', results: body.results });
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' });
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [active, kind, trimmed]);

  const label = unit.charAt(0).toLocaleUpperCase('tr') + unit.slice(1) + ' ara';

  return (
    <>
      <div className="mt-7">
        <label className="sr-only" htmlFor="entity-filter">
          {label}
        </label>
        <input
          id="entity-filter"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setQuery('');
          }}
          placeholder={label + '…'}
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded border border-line bg-surface px-3.5 py-2.5 text-md text-ink outline-none placeholder:text-ink-placeholder focus:border-ink sm:max-w-md"
        />
      </div>

      {active ? (
        <div className="mt-5" aria-live="polite">
          {state.status === 'done' ? (
            state.results.length ? (
              <>
                <p className="m-0 mb-3 text-base text-ink-muted">
                  {state.results.length >= LIMIT
                    ? 'İlk ' + LIMIT + ' sonuç'
                    : state.results.length + ' sonuç'}
                </p>
                <ul className={ENTITY_GRID_CLASS}>
                  {state.results.map((result) => (
                    <EntityRow
                      key={result.slug}
                      href={basePath + '/' + result.slug}
                      name={result.name}
                      district={result.district}
                      count={result.count}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <p className="m-0 text-md text-ink-muted">
                Eşleşen {unit} yok. <Link href="/ara">Tüm kayıtlarda aramayı deneyin.</Link>
              </p>
            )
          ) : state.status === 'error' ? (
            <p className="m-0 text-md text-ink-muted">Arama şu an yapılamadı, tekrar deneyin.</p>
          ) : (
            <p className="m-0 text-md text-ink-muted">Aranıyor…</p>
          )}
        </div>
      ) : (
        children
      )}
    </>
  );
}
