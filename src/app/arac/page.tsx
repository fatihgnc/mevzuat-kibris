import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { MINIMUM_WAGE } from '@/lib/tools/constants';
import { formatCurrency } from '@/lib/tools/format';
import { TOOLS, toolPath } from '@/lib/tools/registry';

export const metadata: Metadata = buildMetadata({
  title: 'Araçlar',
  description:
    'KKTC iş mevzuatına göre yıllık izin, fazla mesai, ihbar ve toplu işten çıkarma tazminatı, doğum izni, İhtiyat Sandığı ve net maaş hesaplayıcıları. Her sonucun altında dayandığı madde yazılı.',
  path: '/arac',
});

const CRUMBS = [{ name: 'Ana sayfa', href: '/' }, { name: 'Araçlar' }];

export default function ToolsPage() {
  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={CRUMBS} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          Araçlar
        </h1>
        <p className="mt-3 max-w-[60em] text-xl leading-[1.6] text-ink-body">
          İş mevzuatı hakkı sayıyla tarif ediyor: kaç iş günü izin, kaç haftalık ücret, hangi zam
          oranı. Bu hesaplayıcılar o sayıları çıkarıyor ve her birinin altına dayandığı maddeyi
          yazıyor — sonuca güvenmeden önce kaynağını okuyabilirsiniz.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {TOOLS.map((tool) => (
            <li key={tool.slug} className="flex">
              <Link
                href={toolPath(tool.slug)}
                className="flex w-full flex-col gap-2 rounded-lg border border-line bg-surface p-5 no-underline hover:border-line-strong hover:bg-surface-hover hover:no-underline"
              >
                <span className="text-xl font-medium leading-[1.38] text-ink">{tool.name}</span>
                <span className="text-base leading-[1.5] text-ink-muted">{tool.summary}</span>
                <span className="mt-1 text-sm text-ink-faint">
                  {tool.legal.map((reference) => reference.article).join(', ')}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {/*
          * Asgari ücret üç araçta ortak sabit. Hangi tutarın ve hangi tarihin
          * kullanıldığını hub sayfasında söylemek, zam gelip de sayfa henüz
          * güncellenmediğinde okuyucunun bunu fark etmesini sağlıyor.
          */}
        <p className="mt-8 rounded-lg border border-line bg-surface-muted p-4 text-base leading-[1.6] text-ink-body">
          Asgari ücrete bağlı hesaplarda{' '}
          <strong className="font-medium text-ink">
            {MINIMUM_WAGE.effectiveLabel} itibarıyla {formatCurrency(MINIMUM_WAGE.grossMonthly)}
          </strong>{' '}
          aylık brüt asgari ücret kullanılıyor (KKTC Çalışma Dairesi). Tutar değiştiyse ilgili
          araçta kendi değerinizi girebilirsiniz.
        </p>

        <p className="mt-4 max-w-[60em] text-base leading-[1.6] text-ink-muted">
          Hesaplayıcılar yalnızca bilgilendirme amaçlıdır, hukuki tavsiye değildir. Bağlayıcı olan,
          Resmî Gazete&apos;de yayımlanan yasa metnidir; somut bir uyuşmazlıkta Çalışma
          Dairesi&apos;ne veya bir avukata danışın.
        </p>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(CRUMBS)) }}
      />
    </>
  );
}
