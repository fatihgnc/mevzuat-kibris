import Link from 'next/link';

import { SearchBox } from '@/components/search-box';
import { ThemeToggle } from '@/components/theme-toggle';
import { SITE_KICKER, SITE_NAME } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

const NAV = [
  /*
   * '/konu' dizin sayfası — eskiden doğrudan '/konu/munhal'e gidiyordu, yani
   * çoğul etiket tek bir konuyu açıyor ve diğer yedisine buradan
   * ulaşılamıyordu.
   */
  { href: '/konu', label: 'Konular' },
  { href: '/sayilar', label: 'Sayılar' },
  { href: '/takip', label: 'Takip' },
  { href: '/hakkinda', label: 'Hakkında' },
];

interface SiteHeaderProps {
  /**
   * `nav`    — ana sayfa ve kayıt sayfası: marka solda, gezinme sağda.
   * `search` — arama ve konu sayfaları: arama kutusu başlığın yanında, geniş.
   *
   * Tasarımda iki başlık var ve fark kasıtlı: aramanın içindeyken arama kutusu
   * her zaman görünür ve dolu; başka yerdeyken gezinme öncelikli.
   */
  variant?: 'nav' | 'search';
  query?: string;
  /** Arama kutusu odaklı mı görünsün (sonuç sayfasında dolu, konu sayfasında pasif). */
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
      className={cn(
        'sticky top-0 z-20 border-b border-line bg-surface',
        className,
      )}
    >
      <div
        className={cn(
          'mx-auto flex max-w-6xl items-center px-4 py-3.5 sm:px-8 lg:px-10',
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

        {/* Her iki varyantta da en sağda; arama kutusu flex-1 olduğu için
            kutunun genişliğini daraltmadan yanına oturuyor. */}
        <ThemeToggle />
      </div>
    </header>
  );
}
