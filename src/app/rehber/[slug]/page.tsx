import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { GUIDES, getGuide } from '@/lib/content/guides';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Rehber bulunamadı' };

  return buildMetadata({
    title: guide.title,
    description: guide.description,
    path: '/rehber/' + guide.slug,
    type: 'article',
  });
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: 'Rehber', href: '/rehber' },
    { name: guide.title },
  ];

  const others = GUIDES.filter((item) => item.slug !== guide.slug).slice(0, 3);

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <article>
          <h1 className="m-0 text-4xl font-semibold leading-[1.28] tracking-tightest text-ink sm:text-6xl">
            {guide.title}
          </h1>

          <div className="mt-7 flex flex-col gap-6">
            {guide.sections.map((section, index) => (
              <section key={index}>
                {section.heading ? (
                  <h2 className="mb-2 text-3xl font-semibold text-ink">{section.heading}</h2>
                ) : null}
                <div className="flex flex-col gap-4 text-xl leading-[1.72] text-ink-body">
                  {section.paragraphs.map((paragraph, pIndex) => (
                    <p key={pIndex} className="m-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.list ? (
                  <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-lg leading-[1.6] text-ink-body">
                    {section.list.map((item, lIndex) => (
                      <li key={lIndex}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          {guide.faq?.length ? (
            <section className="mt-10 border-t border-line pt-6">
              <h2 className="mb-4 text-3xl font-semibold text-ink">Sık sorulanlar</h2>
              <dl className="flex flex-col gap-4">
                {guide.faq.map((item) => (
                  <div key={item.question}>
                    <dt className="text-lg font-semibold text-ink">{item.question}</dt>
                    <dd className="mt-1 text-lg leading-[1.6] text-ink-body">
                      {item.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </article>

        <nav className="mt-10 border-t border-line pt-6">
          <h2 className="mb-3 text-md font-semibold text-ink">Diğer rehberler</h2>
          <ul className="flex flex-col gap-2 text-lg">
            {others.map((item) => (
              <li key={item.slug}>
                <Link href={'/rehber/' + item.slug}>{item.title}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      {guide.faq?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(guide.faq)) }}
        />
      ) : null}
    </>
  );
}
