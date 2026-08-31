import { Breadcrumbs, type Crumb } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

/**
 * Statik metin sayfalarının ortak kabuğu (hakkında, iletişim, gizlilik,
 * kullanım koşulları). Ölçü prose genişliğinde tutuluyor — uzun satır
 * okunabilirliği düşürüyor ve bu sayfalar baştan sona okunmak için.
 */
export function ProsePage({
  title,
  lede,
  crumbs,
  children,
}: {
  title: string;
  lede?: string;
  crumbs: Crumb[];
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />

      {/*
        İçerik kapsayıcısı header ve footer ile AYNI: max-w-6xl, aynı yatay
        padding. Böylece başlık, gövde ve marka aynı sol kenarda hizalanıyor.
        İçeride ayrıca max-width yok — içerik ile layout aynı genişlikte.
      */}
      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <h1 className="m-0 text-4xl font-semibold leading-[1.28] tracking-tightest text-ink sm:text-5xl">
          {title}
        </h1>

        {lede ? <p className="mt-3 text-xl leading-[1.6] text-ink-muted">{lede}</p> : null}

        <div className="mt-8 flex flex-col gap-6">{children}</div>
      </main>

      <SiteFooter />
    </>
  );
}

export function Section({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      {heading ? <h2 className="mb-2 text-3xl font-semibold text-ink">{heading}</h2> : null}
      <div className="flex flex-col gap-4 text-xl leading-[1.72] text-ink-body">{children}</div>
    </section>
  );
}
