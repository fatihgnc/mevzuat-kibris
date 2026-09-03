import Link from 'next/link';

import { TOPIC_LIST } from '@/lib/constants/topics';
import { SITE_NAME } from '@/lib/seo/config';
import type { EntityRow } from '@/types/entity';

/**
 * Footer — spec 8.5: every topic plus the 20 most active institutions.
 *
 * This is the site's internal linking backbone. On a 100k-page site, the cheapest
 * way for Google to reach deep pages is this block sitting on every page.
 */
export function SiteFooter({
  institutions = [],
  coverage,
}: {
  institutions?: EntityRow[];
  /** If not given, no coverage claim is emitted at all — better than an unfounded one. */
  coverage?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-line bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-labelledby="footer-konular">
            <h2 id="footer-konular" className="mb-3 text-xs text-ink-faint">
              Konular
            </h2>
            <ul className="flex flex-col gap-2 text-base">
              {TOPIC_LIST.map((topic) => (
                <li key={topic.slug}>
                  <Link
                    href={'/konu/' + topic.slug}
                    className="text-ink-body no-underline hover:text-accent hover:no-underline"
                  >
                    {topic.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {institutions.length ? (
            <nav aria-labelledby="footer-kurumlar" className="lg:col-span-2">
              <h2 id="footer-kurumlar" className="mb-3 text-xs text-ink-faint">
                En çok kayıt yayımlayan kurumlar
              </h2>
              <ul className="grid gap-x-6 gap-y-2 text-base sm:grid-cols-2">
                {institutions.map((entity) => (
                  <li key={entity.slug}>
                    <Link
                      href={'/kurum/' + entity.slug}
                      className="text-ink-body no-underline hover:text-accent hover:no-underline"
                    >
                      {entity.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <nav aria-labelledby="footer-site">
            <h2 id="footer-site" className="mb-3 text-xs text-ink-faint">
              Site
            </h2>
            <ul className="flex flex-col gap-2 text-base">
              <li>
                <Link href="/sayilar">Sayılar</Link>
              </li>
              {/*
                The entity hubs belong in THIS column, not next to the twenty
                institutions above: that block is only rendered when the page passes
                institutions in, which is the home page alone. Everywhere else
                <SiteFooter /> is called bare, and these three links are the only
                navigable path to the company and place pages.
              */}
              <li>
                <Link href="/kurum">Kurumlar</Link>
              </li>
              <li>
                <Link href="/sirket">Şirketler</Link>
              </li>
              <li>
                <Link href="/yer">Yerler</Link>
              </li>
              <li>
                <Link href="/rehber">Rehber</Link>
              </li>
              <li>
                <Link href="/takip">Takiplerim</Link>
              </li>
              <li>
                <Link href="/rss.xml">RSS</Link>
              </li>
              <li>
                <Link href="/hakkinda">Hakkında</Link>
              </li>
              <li>
                <Link href="/iletisim">İletişim</Link>
              </li>
              <li>
                <Link href="/gizlilik">Gizlilik</Link>
              </li>
              <li>
                <Link href="/kullanim-kosullari">Kullanım koşulları</Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-line pt-6 text-sm leading-[1.55] text-ink-muted">
          <p>
            {SITE_NAME} resmî bir kurum değildir. Kayıtlar KKTC Resmî Gazete PDF&apos;lerinden
            otomatik çıkarılır; bağlayıcı olan, gazetede yayımlanan resmî metindir.
          </p>
          <p>
            {coverage ? coverage + '. ' : null}Ücretsiz, gelir reklamdan. © {year}
          </p>
        </div>
      </div>
    </footer>
  );
}
