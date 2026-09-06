'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

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

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    router.push(query ? '/ara?q=' + encodeURIComponent(query) : '/ara');
  }

  return (
    <form
      action="/ara"
      method="get"
      onSubmit={onSubmit}
      role="search"
      className="flex max-w-[44em] gap-2.5"
    >
      <label className="sr-only" htmlFor="q-hero">
        Resmî Gazete kayıtlarında ara
      </label>
      <input
        id="q-hero"
        name="q"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="kelime, kurum, şirket, köy ya da referans numarası"
        autoComplete="off"
        className="min-w-0 flex-1 rounded border border-ink bg-surface px-3.5 py-3 text-lg text-ink outline-none placeholder:text-ink-placeholder"
      />
      <button
        type="submit"
        className="shrink-0 rounded bg-accent px-6 py-3 text-lg font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Ara
      </button>
    </form>
  );
}
