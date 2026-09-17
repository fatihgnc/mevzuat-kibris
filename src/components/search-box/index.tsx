'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { cancelRouteProgress } from '@/components/route-progress';
import { searchInputSchema } from '@/lib/search/search-input-schema';
import { cn } from '@/lib/utils';

/**
 * The search box — one of the site's four client components (spec 13).
 *
 * The form GETs to /ara: it works with JS disabled and the result URL stays
 * shareable (spec 5.5). router.push is only there for the soft transition.
 *
 * ONE SHAPE, NO PROPS. It used to take five — `size`, `defaultValue`,
 * `placeholder`, `active` and `className` — because the header rendered a
 * second, `compact` copy of it: narrow, sometimes prefilled with the query,
 * and greyed out on a topic page where it was decoration rather than a field.
 * The header carries a magnifier and a dialog now, so the compact branch had
 * no caller left and every prop with it: both remaining call sites, the home
 * page and the 404, write `<SearchBox />`.
 *
 * Deleted rather than kept "in case": the branch could not be exercised, so
 * nothing would have told us when it broke. If a second shape is ever wanted,
 * it should be written for the screen that wants it.
 */
export function SearchBox() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = searchInputSchema.safeParse(value);

    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Geçersiz arama.');
      // The route-progress bar's capture-phase listener has already started
      // on this same submit, before it could know we would reject it.
      cancelRouteProgress();
      return;
    }

    router.push('/ara?q=' + encodeURIComponent(result.data));
  }

  return (
    <form
      action="/ara"
      method="get"
      onSubmit={onSubmit}
      role="search"
      className="max-w-[44em]"
    >
      <div className="flex gap-2.5">
        <label className="sr-only" htmlFor="q-hero">
          Resmî Gazete kayıtlarında ara
        </label>
        <input
          id="q-hero"
          name="q"
          type="search"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            if (error) setError(null);
          }}
          placeholder="kelime, kurum, şirket, köy ya da referans numarası"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'q-hero-error' : undefined}
          className={cn(
            'min-w-0 flex-1 rounded border border-ink bg-surface px-3.5 py-3 text-lg text-ink outline-none placeholder:text-ink-placeholder',
            error && 'border-danger-border focus:border-danger-border',
          )}
        />
        <button
          type="submit"
          className="shrink-0 rounded bg-accent px-6 py-3 text-lg font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Ara
        </button>
      </div>
      {error ? (
        <p id="q-hero-error" className="m-0 mt-1.5 text-sm font-medium text-danger-ink">
          {error}
        </p>
      ) : null}
    </form>
  );
}
