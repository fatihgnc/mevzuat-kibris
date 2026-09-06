import Link from 'next/link';

import { NavMenu } from '@/components/nav-menu';
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

/** Search is a nav destination too; it just gets its own shape at full width. */
const SEARCH_LINK = { href: '/ara', label: 'Ara' };

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
          */}
        <Link
          href="/"
          className="flex shrink-0 flex-col items-start leading-none no-underline hover:no-underline"
        >
          <span className="text-2xl font-bold tracking-tighter text-ink">{SITE_NAME}</span>
          <span className="mt-1 text-xs text-ink-muted">{SITE_KICKER}</span>
        </Link>

        {variant === 'search' ? (
          <>
            <div className="min-w-0 flex-1">
              <SearchBox
                size="compact"
                defaultValue={query}
                active={searchActive}
                placeholder="Ara"
              />
            </div>
            <ThemeToggle />
          </>
        ) : (
          /*
           * Navigation and the theme switch share one right-hand group.
           *
           * They used to be siblings of the brand under `justify-between`, which
           * spread all three across the row and left the menu stranded in the
           * middle with a gap before the switch. Grouping them puts the two
           * controls next to each other and pins the pair to the right edge.
           */
          <div className="flex flex-1 items-center justify-end gap-4 sm:gap-[22px]">
            <nav className="flex flex-1 items-center justify-end gap-4 text-base text-ink-muted sm:gap-[22px]">
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

              {/*
                * The menu carries Ara as its last item, so the narrow header holds
                * exactly two controls: the menu and the theme switch. Ara had been
                * left outside as loose text next to the menu button, which made two
                * things that look alike sit side by side and do different things.
                */}
              <NavMenu items={[...NAV, SEARCH_LINK]} />

              {/*
                * At full width Ara is a box that looks like where it takes you.
                * Below 1060px it is inside the menu instead: a bordered 200px field
                * you cannot type into is a small lie, and it was only taking space
                * once the row tightened.
                */}
              {/*
                * At full width Ara STRETCHES to fill what is left between the
                * links and the theme switch, the way the search header's real box
                * does. At a fixed 200px it sat as an island with dead space either
                * side; filling the gap makes the row read as one bar and gives the
                * link the shape of the page it opens.
                */}
              <Link
                href={SEARCH_LINK.href}
                aria-label={SEARCH_LINK.label}
                className="hidden min-w-0 flex-1 items-center gap-2 rounded border border-line px-2.5 py-1.5 text-sm text-ink-placeholder no-underline hover:border-line-strong hover:no-underline min-[1060px]:flex"
              >
                {SEARCH_LINK.label}
              </Link>
            </nav>

            <ThemeToggle />
          </div>
        )}
      </div>
    </header>
  );
}
