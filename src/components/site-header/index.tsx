import Link from 'next/link';

import { SearchBox } from '@/components/search-box';
import { ThemeToggle } from '@/components/theme-toggle';
import { SITE_KICKER, SITE_NAME } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

const NAV = [
  /*
   * The '/konu' index page — it used to go straight to '/konu/munhal', so a plural
   * label opened a single topic and the other seven were unreachable from here.
   */
  { href: '/konu', label: 'Konular' },
  { href: '/sayilar', label: 'Sayılar' },
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
        <Link
          href="/"
          className="flex shrink-0 items-baseline gap-2.5 no-underline hover:no-underline"
        >
          <span className="text-2xl font-bold tracking-tighter text-ink">{SITE_NAME}</span>
          {variant === 'nav' ? (
            <span className="hidden text-xs text-ink-muted sm:inline">{SITE_KICKER}</span>
          ) : null}
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
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-ink-muted no-underline hover:text-ink hover:no-underline"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/ara"
              aria-label="Ara"
              className="hidden items-center gap-2 rounded border border-line px-2.5 py-1.5 text-sm text-ink-placeholder no-underline hover:border-line-strong hover:no-underline md:flex md:w-[200px]"
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
