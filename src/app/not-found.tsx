import Link from 'next/link';

import { SearchBox } from '@/components/search-box';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TOPIC_LIST } from '@/lib/constants/topics';

export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-8 lg:px-10">
        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          Bu sayfa yok
        </h1>
        <p className="mt-3 text-xl leading-[1.6] text-ink-body">
          Bağlantı eskimiş olabilir ya da aradığınız kayıt kendi sayfasını almamış olabilir. Çok
          kısa kayıtlar ayrı sayfa yerine yayımlandıkları sayının içinde listeleniyor.
        </p>

        <div className="mt-7">
          <SearchBox />
        </div>

        <div className="mt-9">
          <h2 className="mb-3 text-md font-semibold text-ink">Konudan girin</h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-2 text-lg">
            {TOPIC_LIST.map((topic) => (
              <li key={topic.slug}>
                <Link href={'/konu/' + topic.slug}>{topic.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-md">
          <Link href="/sayilar">Sayı sayı gezinmek için arşive bakın</Link>
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
