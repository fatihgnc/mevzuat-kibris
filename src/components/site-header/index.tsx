import Link from 'next/link';

import { SearchBox } from '@/components/search-box';
import { ThemeToggle } from '@/components/theme-toggle';
import { SITE_KICKER, SITE_NAME } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

/**
 * Every destination in the header, in one list.
 *
 * There is no "drops on small screens" flag any more. There was one, and it hid
 * the three entity indexes below `lg` — which meant an institution page could be
 * reached by following a record but never by going looking, and never at all on a
 * phone. The narrow layout now moves this list into a menu instead of trimming it.
 */
const NAV: Array<{ href: string; label: string }> = [
  /*
   * The '/konu' index page — it used to go straight to '/konu/munhal', so a plural
   * label opened a single topic and the other seven were unreachable from here.
   */
  { href: '/konu', label: 'Konular' },
  { href: '/sayilar', label: 'Sayılar' },
  { href: '/kurum', label: 'Kurumlar' },
  { href: '/sirket', label: 'Şirketler' },
  { href: '/yer', label: 'Yerler' },
  /*
   * The guides were reachable only from the footer, which is the wrong end of
   * the page for them: they answer the questions a first-time visitor arrives
   * with ("what is an A.E. number"), and a first-time visitor has not scrolled
   * to the bottom yet.
   */
  { href: '/rehber', label: 'Rehber' },
  { href: '/takip', label: 'Takip' },
  { href: '/hakkinda', label: 'Hakkında' },
];

interface SiteHeaderProps {
  /**
   * `nav`    — home page and record page: brand on the left, navigation on the right.
   * `search` — search and topic pages: the search box next to the brand, wide.
   *
   * The design has two headers and the difference is deliberate: inside search, the
   * search box is always visible and filled; elsewhere, navigation takes priority.
   */
  variant?: 'nav' | 'search';
  query?: string;
  /** Whether the search box should look focused (filled on the results page, passive on a topic page). */
  searchActive?: boolean;
  className?: string;
}

export function SiteHeader({
  variant = 'nav',
  query = '',
  searchActive = true,
  className,
}: SiteHeaderProps) {
  return (
    <header
      /*
       * The height is FIXED and comes from the same source as `--header-h`.
       *
       * Left free, the height varied by variant: 70px for the header with a search
       * box, 62px for the home page header without one. Because the sticky side
       * columns take their position from below the header, the gap shifted from page
       * to page too (40px instead of 32px). Fixing the height here makes
       * `--header-h` CORRECT on every page instead of a guess.
       */
      className={cn(
        'sticky top-0 z-20 h-[var(--header-h)] border-b border-line bg-surface',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto flex h-full max-w-6xl items-center px-4 sm:px-8 lg:px-10',
          variant === 'search' ? 'gap-5' : 'justify-between gap-4',
        )}
      >
        {/*
          * The kicker sits UNDER the name, tilted, and it never hides.
          *
          * Beside the name it was the first thing dropped when the row got tight,
          * and it was absent from the search header altogether — so the one line
          * that says what this site is disappeared on exactly the screens where a
          * visitor is least likely to know. Stacking it frees the horizontal room
          * that made it droppable in the first place.
          *
          * `origin-left` keeps the tilt from pushing the text off its start; the
          * angle is small enough to read as a stamp rather than a mistake.
          */}
        <Link
          href="/"
          className="flex shrink-0 flex-col items-start leading-none no-underline hover:no-underline"
        >
          <span className="text-2xl font-bold tracking-tighter text-ink">{SITE_NAME}</span>
          <span className="mt-1 origin-left -rotate-3 text-xs text-ink-muted">{SITE_KICKER}</span>
        </Link>

        {variant === 'search' ? (
          <div className="min-w-0 flex-1">
            <SearchBox
              size="compact"
              defaultValue={query}
              active={searchActive}
              placeholder="Ara"
            />
          </div>
        ) : (
          <nav className="flex items-center gap-4 text-base text-ink-muted sm:gap-[22px]">
            {/*
              * Every link, on every screen — the narrow layout MOVES them into a
              * menu rather than dropping them. Three of them used to vanish below
              * `lg`, which quietly made the entity indexes unreachable on a phone;
              * a link you cannot reach is worse than a menu you have to open.
              */}
            <div className="hidden items-center gap-4 min-[1060px]:flex min-[1060px]:gap-[22px]">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-ink-muted no-underline hover:text-ink hover:no-underline"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <NavMenu />

            {/*
              * Below 1060px "Ara" is a plain text link, not a box.
              *
              * The bordered 200px box reads as a search FIELD, and a field you
              * cannot type into is a small lie — it is a link to /ara. At full
              * width the box earns that by looking like the destination; once the
              * row tightens it is only taking space and making a promise it does
              * not keep.
              */}
            <Link
              href="/ara"
              className="text-ink-muted no-underline hover:text-ink hover:no-underline min-[1060px]:hidden"
            >
              Ara
            </Link>
            <Link
              href="/ara"
              aria-label="Ara"
              className="hidden items-center gap-2 rounded border border-line px-2.5 py-1.5 text-sm text-ink-placeholder no-underline hover:border-line-strong hover:no-underline min-[1060px]:flex min-[1060px]:w-[200px]"
            >
              Ara
            </Link>
          </nav>
        )}

        {/* Rightmost in both variants; because the search box is flex-1 it sits
            beside the box without narrowing it. */}
        <ThemeToggle />
      </div>
    </header>
  );
}

/**
 * The narrow-screen menu.
 *
 * A `<details>` element, not a client component with state. It costs no
 * JavaScript, keyboard and screen readers already understand it, and it keeps
 * this header a server component — the same reasons the filter rail is a plain
 * form. The panel is `absolute` so opening it cannot change the header's height,
 * which `--header-h` depends on being fixed.
 */
function NavMenu() {
  return (
    <details className="group relative min-[1060px]:hidden">
      <summary
        aria-label="Menü"
        className="flex cursor-pointer list-none items-center gap-1.5 text-ink-muted marker:hidden hover:text-ink [&::-webkit-details-marker]:hidden"
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
        * `details > *:not(summary) { display: none }`. A utility class setting
        * `display: flex` outranks it, so the panel stayed on screen with the menu
        * shut — measured: 316px tall while `open` was false. Tying the display to
        * the open state puts the class and the element's state back in agreement.
        */}
      <ul className="absolute right-0 top-[calc(100%+12px)] z-30 hidden w-[190px] flex-col rounded-md border border-line bg-surface py-1.5 shadow-lg group-open:flex">
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
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
