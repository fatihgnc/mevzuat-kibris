'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export interface IndexItem {
  href: string;
  title: string;
  ref: string | null;
}

export interface IndexGroup {
  letter: string;
  /** What the URL fragment holds while this letter is open, e.g. 'k' or 'ş'. */
  slug: string;
  items: IndexItem[];
}

/**
 * The law index: a row of letters, and the laws of ONE letter at a time.
 *
 * Which letter is open is local state, not a route. It is mirrored into the URL
 * fragment ("/yasa#k") for one reason: a reader who opens a law and comes back
 * with the browser's back button would otherwise land on the bare row of letters
 * and have to find their place again. The fragment is read once after mount, so
 * the server-rendered page is the same for everyone.
 *
 * The laws of a letter run down the page in two columns, not across it in rows:
 * a row is as tall as its longer title, and a long title on one side left a gap
 * under the short one beside it. CSS columns pack each column independently.
 */
export function LegislationIndex({ groups, noun }: { groups: IndexGroup[]; noun: string }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const readHash = () => {
      let fromHash = '';
      try {
        fromHash = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        // a malformed fragment is just "no letter"
      }
      setOpenSlug(groups.some((group) => group.slug === fromHash) ? fromHash : null);
    };

    /*
     * WHY THE STATE IS COPIED BACK.
     *
     * Next's router steps back through history only for entries that carry its own
     * `history.state` (`__NA`); on any other entry its popstate handler returns
     * without doing anything, so the URL changes and the page does not. A hash-only
     * navigation made by the BROWSER (an edited address bar, a `#k` link) pushes
     * exactly such an entry, with a null state. Coming back from a law to it then
     * left the law on screen under the list's URL.
     *
     * Giving that entry the state of the one before it repairs it: same page, same
     * router tree. The state is remembered from mount and after every letter change,
     * because by the time `hashchange` fires the new entry's own state is already null.
     */
    let lastState: unknown = window.history.state;
    const onHashChange = () => {
      if (window.history.state === null && lastState) {
        window.history.replaceState(lastState, '', window.location.href);
      }
      lastState = window.history.state;
      readHash();
    };

    readHash();
    // The fragment can also change without a reload (a hand-edited URL, a pasted link).
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [groups]);

  const open = groups.find((group) => group.slug === openSlug) ?? null;

  const choose = (slug: string | null) => {
    setOpenSlug(slug);
    // replaceState, not a push: opening a letter is not a page the back button should stop at.
    window.history.replaceState(null, '', window.location.pathname + (slug ? '#' + encodeURIComponent(slug) : ''));
    topRef.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <div ref={topRef} className="scroll-mt-24">
      {/*
        * EVERY LETTER'S LAWS ARE IN THE HTML; the ones not open are only hidden.
        * They used to be rendered when a letter was chosen and not before, which
        * left the page's server-rendered HTML with no link to any law: a crawler
        * reaching /yasa would have found a row of buttons and nothing to follow.
        * With the pages indexed that would have left discovery to the sitemap alone.
        * `hidden` is a class here, not the attribute: a `flex` or `block` utility on
        * the same element would override the attribute and show the section.
        */}
      <nav
        aria-label={'Harfe göre ' + noun + ' listesi'}
        className={cn('flex-wrap gap-2.5', open ? 'hidden' : 'flex')}
      >
        {groups.map((group) => (
          <button
            key={group.slug}
            type="button"
            onClick={() => choose(group.slug)}
            className={cn(
              'flex min-w-[64px] cursor-pointer flex-col items-center rounded-md border border-line bg-surface-muted px-4 py-3',
              'text-ink transition-colors hover:border-ink',
            )}
          >
            <span className="text-2xl font-semibold leading-none">{label(group.letter)}</span>
            <span className="mt-1.5 text-sm text-ink-fainter">{group.items.length}</span>
          </button>
        ))}
      </nav>

      {groups.map((group) => (
        <section key={group.slug} className={open?.slug === group.slug ? undefined : 'hidden'}>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line pb-3">
            <h2 className="m-0 text-md font-semibold text-ink">
              {label(group.letter)}{' '}
              <span className="font-normal text-ink-muted">
                · {group.items.length} {noun}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => choose(null)}
              className="cursor-pointer border-0 bg-transparent p-0 text-base text-accent hover:underline"
            >
              ← Tüm harfler
            </button>
          </div>

          <ul className="m-0 list-none p-0 md:columns-2 md:gap-x-10">
            {group.items.map((item) => (
              <li key={item.href} className="mb-3 break-inside-avoid">
                <Link href={item.href} className="text-base leading-[1.4]">
                  {item.title}
                </Link>
                {item.ref ? <div className="text-sm text-ink-fainter">{item.ref}</div> : null}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => choose(null)}
            className="mt-6 cursor-pointer border-0 bg-transparent p-0 text-base text-accent hover:underline"
          >
            ← Tüm harfler
          </button>
        </section>
      ))}
    </div>
  );
}

/** '#' is the group of titles that start with a digit. */
function label(letter: string): string {
  return letter === '#' ? '0–9' : letter;
}
