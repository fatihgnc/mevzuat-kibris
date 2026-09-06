'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * A thin bar across the top of the window while a navigation is in flight.
 *
 * WHY A BAR AS WELL AS THE SKELETONS. A `loading.tsx` only helps where one
 * exists, and it only appears once the router has decided to swap the tree —
 * which is after the click, not at it. This starts on the click itself, on every
 * internal link and every search submit, whatever the destination. The complaint
 * it answers is not "the page is slow" but "I clicked and nothing acknowledged
 * me", and those are different problems with different fixes.
 *
 * It is also the whole answer for pages that are fast enough not to need a
 * skeleton but not fast enough to feel instant.
 *
 * HOW IT KNOWS. Starting is a capture-phase click listener, because we do not
 * control every <Link> on the site and wrapping them all would be worse. Ending
 * is `usePathname` and `useSearchParams` changing, which is exactly the moment
 * the new route commits.
 *
 * THE SUSPENSE BOUNDARY IN THE LAYOUT IS NOT OPTIONAL. `useSearchParams` in a
 * client component forces every page above it out of static rendering unless it
 * sits inside <Suspense>; unwrapped, this one component would have de-optimised
 * the entire prerendered archive. It is mounted as
 * `<Suspense fallback={null}><RouteProgress /></Suspense>`.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sameAddress = (url: URL) =>
      url.pathname === location.pathname && url.search === location.search;

    const onClick = (event: MouseEvent) => {
      /*
       * Everything here is a way of NOT navigating: a modifier opens a new tab,
       * a non-primary button does something else entirely, and a handler that
       * already called preventDefault has its own plan.
       */
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || anchor.target === '_blank') return;
      if (anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, location.href);
      // Another origin leaves the app; the same address is not a navigation.
      if (url.origin !== location.origin || sameAddress(url)) return;

      setActive(true);
    };

    /*
     * The search dialog and the filter rail are FORMS, not links. The dialog
     * pushes through the router, so it needs the bar for the same reason a link
     * does; the rail submits natively and gets the browser's own indicator, but
     * starting the bar there too costs nothing and stops the two feeling
     * different.
     */
    const onSubmit = (event: SubmitEvent) => {
      if (event.defaultPrevented) return;
      const form = event.target as HTMLFormElement;
      if (!form?.action) return;
      const url = new URL(form.action, location.href);
      if (url.origin !== location.origin) return;
      setActive(true);
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
    };
  }, []);

  /* The route committed — whatever we were waiting for has arrived. */
  useEffect(() => {
    setActive(false);
  }, [pathname, search]);

  /*
   * A navigation that never commits would otherwise leave the bar running for
   * the rest of the session: a link to the address you are already on, a
   * download that turns out not to navigate, a request that fails. Fifteen
   * seconds is past any load worth waiting for.
   */
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setActive(false), 15000);
    return () => clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden"
    >
      {/*
        * It creeps towards the right and never reaches it — there is no progress
        * to report, only the fact that something is happening. Easing out means
        * it moves fast at the start, which is when the user is deciding whether
        * the click registered, and crawls afterwards rather than finishing early
        * and sitting still.
        */}
      <div className="h-full w-0 animate-route-progress bg-accent" />
    </div>
  );
}
