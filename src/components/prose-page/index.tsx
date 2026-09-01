import { Breadcrumbs, type Crumb } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

/**
 * The shared shell for static text pages (about, contact, privacy, terms). The
 * measure is kept at prose width — long lines hurt readability, and these pages are
 * meant to be read from start to finish.
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
        The content container is IDENTICAL to the header and footer: max-w-6xl, the
        same horizontal padding. That keeps the heading, the body and the brand
        aligned on the same left edge. There is no extra max-width inside — the
        content is the same width as the layout.
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
