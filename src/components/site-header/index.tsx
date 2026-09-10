import Link from 'next/link';

import { NavDropdown } from '@/components/nav-dropdown';
import { NavMenu } from '@/components/nav-menu';
import { SearchDialog } from '@/components/search-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { SITE_KICKER, SITE_NAME } from '@/lib/seo/config';
import { TOOLS, TOOLS_PATH, toolPath } from '@/lib/tools/registry';
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
  /*
   * NO 'Hakkında'. It is a page you read once and never return to, and the
   * header is for the places you go repeatedly; it sits in the footer beside
   * İletişim, Gizlilik and Kullanım koşulları, which is where a reader looks for
   * that kind of page. Taking it out also buys the row a slot back — with Rehber
   * added, eight links plus the search icon and the theme switch were what
   * pushed the inline list to collapse into the menu earlier than it needed to.
   */
];

/**
 * The calculators get ONE MENU, and it is built from the registry.
 *
 * They are seven pages that only make sense together, and a flat eighth link
 * would have sent a reader to a hub to choose again. The narrow layout still
 * gets them as a plain entry in NavMenu — a hover menu inside a tap menu is not
 * a thing — so `NAV_WITH_TOOLS` is what the small screen sees.
 */
const TOOL_ITEMS = TOOLS.map((tool) => ({
  href: toolPath(tool.slug),
  label: tool.name,
  description: tool.summary,
}));

const NAV_WITH_TOOLS = [...NAV, { href: TOOLS_PATH, label: 'Araçlar' }];

interface SiteHeaderProps {
  /**
   * Prefills the search dialog. The search page passes what was searched, so
   * reopening the box shows the query rather than an empty field.
   */
  query?: string;
  className?: string;
}

/**
 * ONE HEADER. No variants, on any page.
 *
 * It used to have two: `nav` (brand and links) and `search` (brand and a filled
 * search box, no links at all). Which meant the search results page — the page a
 * visitor is most likely to land on from Google — was the one page with no way to
 * reach the topics, the guides or the entity indexes. And because the box needed
 * room, the header changed shape as the window narrowed as well.
 *
 * Search is an ICON here now. It is the same 30px on every screen, so the row no
 * longer has to be rearranged to fit it, and the typing surface moved into a
 * full-screen dialog where it is not competing with the navigation for width. On
 * the search page the query lives in the filter rail, next to the filters it is
 * combined with.
 */
export function SiteHeader({ query = '', className }: SiteHeaderProps) {
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
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-8 lg:px-10">
        {/*
         * The kicker sits UNDER the name and it never hides.
         *
         * Beside the name it was the first thing dropped when the row got tight,
         * and it was absent from the search header altogether — so the one line
         * that says what this site is disappeared on exactly the screens where a
         * visitor is least likely to know. Stacking it frees the horizontal room
         * that made it droppable in the first place.
         */}
        <Link
          href="/"
          className="flex shrink-0 flex-col items-start leading-none no-underline hover:no-underline"
        >
          <span className="text-2xl font-bold tracking-tighter text-ink">{SITE_NAME}</span>
          <span className="mt-1 text-xs text-ink-muted">{SITE_KICKER}</span>
        </Link>

        {/*
         * THREE ZONES, not two: brand left, links CENTRED, controls right.
         *
         * The links used to sit in the same right-hand group as search and the
         * theme switch, so the row read as "brand ... everything else" and the
         * two icons were just two more items at the end of a list of ten. Giving
         * the nav the free space between the fixed ends centres it on the row
         * and leaves the controls as their own cluster.
         *
         * `min-w-0` on the middle zone so a long link list shrinks rather than
         * pushing the controls off the row.
         */}
        <nav className="flex min-w-0 flex-1 items-center justify-center text-base text-ink-muted">
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
            <NavDropdown label="Araçlar" href={TOOLS_PATH} items={TOOL_ITEMS} />
          </div>
        </nav>

        {/*
         * The controls are ONE GROUP: search, theme, then — below 1060px —
         * the nav menu, in that order, all the same 42px box, close together.
         * Below 1060px the menu button belongs here rather than in the centre
         * zone, so the row reads as brand, then the three controls together.
         */}
        <div className="flex shrink-0 items-center gap-1 pl-4">
          <SearchDialog defaultValue={query} />
          <ThemeToggle />
          <div className="min-[1060px]:hidden">
            <NavMenu items={NAV_WITH_TOOLS} />
          </div>
        </div>
      </div>
    </header>
  );
}
