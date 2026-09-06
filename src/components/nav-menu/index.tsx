'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

export interface NavMenuItem {
  href: string;
  label: string;
}

/**
 * The header's narrow-screen menu.
 *
 * STILL A `<details>`, with a small client component wrapped around it. The
 * element brings the parts that are tedious and easy to get wrong for free — a
 * real disclosure button, keyboard operation, the open state in the DOM — and
 * the hook adds only the two dismissals `<details>` does not do on its own:
 * clicking outside, and Escape.
 *
 * Rebuilding this as a button plus `useState` would mean re-implementing all of
 * that by hand for no gain. The cost is that the header's menu is a client
 * component; the header itself stays on the server.
 */
export function NavMenu({ items }: { items: readonly NavMenuItem[] }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => {
      if (ref.current?.open) ref.current.open = false;
    };

    /*
     * `pointerdown`, not `click`. A click fires after the button it started on
     * has already handled it, which on a link inside the panel meant the
     * navigation began while the menu was still open. pointerdown also matches
     * what a user reads as "I tapped away".
     */
    const onPointerDown = (event: PointerEvent) => {
      const node = ref.current;
      if (node?.open && !node.contains(event.target as Node)) close();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className="group relative min-[1060px]:hidden">
      <summary
        className="flex cursor-pointer list-none items-center gap-1.5 text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        Menü
        <span aria-hidden className="text-2xs transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>
      {/*
        * `hidden group-open:flex`, NOT a bare `flex`.
        *
        * The browser hides a closed <details>'s content with a UA rule of roughly
        * `details > *:not(summary) { display: none }`, and a utility class setting
        * `display: flex` outranks it. The first version left the panel on screen
        * with the menu shut — measured at 316px tall while `open` was false.
        */}
      <ul className="absolute right-0 top-[calc(100%+12px)] z-30 hidden w-[190px] flex-col rounded-md border border-line bg-surface py-1.5 shadow-lg group-open:flex">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              /*
               * Next keeps the DOM across a soft navigation, so without this the
               * panel stays open on the page you just moved to.
               */
              onClick={() => {
                if (ref.current) ref.current.open = false;
              }}
              className="block px-4 py-2 text-ink-body no-underline hover:bg-surface-hover hover:text-ink hover:no-underline"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
