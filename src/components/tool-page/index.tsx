import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { articleAnchorId, linkifyArticles } from '@/components/tool-page/linkify-articles';
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo/json-ld';
import { TOOLS, TOOLS_PATH, toolPath, type Tool } from '@/lib/tools/registry';

/**
 * Her hesaplayıcının iskeleti.
 *
 * Yasal dayanak, sınırlamalar ve diğer araçlara geçiş, yedi sayfada da AYNI
 * yerde ve aynı biçimde duruyor. Sayfa başına kopyalansaydı, bir maddenin
 * değiştiği gün yedi dosyadan kaçının güncellendiğini kimse bilemezdi.
 */
export function ToolPage({ tool, children }: { tool: Tool; children: React.ReactNode }) {
  const others = TOOLS.filter((entry) => entry.slug !== tool.slug);

  /*
   * Görünen sayfa yolu ile JSON-LD'deki AYNI listeden üretiliyor. Ayrı ayrı
   * yazılsalardı biri değiştiğinde diğeri sessizce eskir ve Search Console'da
   * "breadcrumb sayfayla uyuşmuyor" uyarısı çıkardı.
   */
  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: 'Araçlar', href: TOOLS_PATH },
    { name: tool.name },
  ];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          {tool.heading}
        </h1>
        <p className="mt-3 max-w-[60em] text-xl leading-[1.6] text-ink-body">
          {linkifyArticles(tool.intro, tool)}
        </p>

        <div className="mt-8">{children}</div>

        <LegalBasisCard tool={tool} />
        <LimitationsFooter tool={tool} />

        <nav aria-labelledby="diger-araclar" className="mt-12 border-t border-line pt-6">
          <h2 id="diger-araclar" className="m-0 text-xs text-ink-faint">
            Diğer araçlar
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-2 text-base sm:grid-cols-2">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link href={toolPath(entry.slug)}>{entry.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <ToolFaqSection tool={tool} />
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      {tool.faq.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd([...tool.faq])) }}
        />
      ) : null}
    </>
  );
}

/**
 * Sık sorulanlar — sayfanın en altı, footer'ın hemen üstü.
 *
 * Sayfaya gelen kişilerin çoğu bir hesap yapmaya geliyor; hesabı, dayanağını ve
 * sınırlarını gördükten sonra hâlâ okumaya devam eden azınlık için burada
 * duruyor. Formla sonuç arasına ya da ikisinin hemen altına konsaydı, asıl işle
 * okuyucu arasına giren uzun bir metin bloğu olurdu.
 *
 * Cevaplar `<dl>` içinde açık duruyor, katlanır bir bileşende değil. Katlanmış
 * metin de dizine giriyor ama okuyucu için bir tık daha uzakta kalıyor ve bu
 * sayfalarda cevabın kendisi asıl içerik.
 */
export function ToolFaqSection({ tool }: { tool: Tool }) {
  if (!tool.faq.length) return null;

  return (
    <section aria-labelledby="sik-sorulanlar" className="mt-12 border-t border-line pt-8">
      <h2
        id="sik-sorulanlar"
        className="m-0 text-3xl font-semibold tracking-tighter text-ink sm:text-4xl"
      >
        Sık sorulanlar
      </h2>

      <dl className="mt-5 flex max-w-[52em] flex-col gap-6">
        {tool.faq.map((item) => (
          <div key={item.question}>
            <dt className="text-md font-semibold leading-[1.4] text-ink">{item.question}</dt>
            <dd className="m-0 mt-1.5 text-base leading-[1.65] text-ink-body">{item.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * "Hangi yasaya göre" bölümü.
 *
 * Madde numarası TEK BAŞINA yetmiyor: okuyan kişi maddenin ne dediğini görmeden
 * hesabın doğru olup olmadığını denetleyemez, denetleyemediği bir sayıya da
 * güvenmemeli. Bu yüzden her madde bir özetle birlikte yazılıyor ve altına
 * metnin kendisine giden kaynak linkleri konuyor.
 */
export function LegalBasisCard({ tool }: { tool: Tool }) {
  return (
    <section
      aria-labelledby="yasal-dayanak"
      className="mt-12 rounded-lg border border-line bg-surface-muted p-5 sm:p-6"
    >
      <h2 id="yasal-dayanak" className="m-0 text-3xl font-semibold tracking-tighter text-ink">
        Hangi yasaya göre
      </h2>

      <dl className="mt-4 flex flex-col gap-4">
        {tool.legal.map((reference) => (
          /*
           * `scroll-mt-*`: başlık yapışkan olduğu için çapaya atlayan tarayıcı
           * maddeyi tam başlığın altına gizliyordu. Kaydırma payı, header'ın
           * yüksekliğini veren aynı değişkenden okunuyor.
           */
          <div
            key={reference.law + reference.article}
            id={articleAnchorId(reference.law, reference.article)}
            className="scroll-mt-[calc(var(--header-h)+16px)]"
          >
            <dt className="text-md font-medium text-ink">
              {reference.law} — {reference.article}
            </dt>
            <dd className="m-0 mt-1 text-base leading-[1.6] text-ink-body">{reference.summary}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mb-2 mt-6 text-xs text-ink-faint">Kaynak metinler</h3>
      <ul className="flex flex-col gap-2 text-base">
        {tool.sources.map((source) => (
          <li key={source.href}>
            {/*
              * Yeni sekmede: okuyucu bir hesabın ortasında ve yasaya bakıp geri
              * dönmek isteyecek. `rel="noopener"` target="_blank" ile birlikte
              * zorunlu — onsuz açılan sayfa `window.opener` üzerinden bu sayfaya
              * erişebiliyor.
              */}
            <a href={source.href} target="_blank" rel="noopener noreferrer">
              {source.label}
            </a>
            {source.note ? (
              <span className="text-ink-muted"> — {source.note}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ortak feragatname ve araca özel varsayımlar. */
export function LimitationsFooter({ tool }: { tool: Tool }) {
  return (
    <section
      aria-labelledby="sinirlamalar"
      className="mt-6 rounded-lg border border-notice-border bg-notice p-5 text-notice-ink sm:p-6"
    >
      <h2 id="sinirlamalar" className="m-0 text-xl font-semibold text-notice-ink">
        Sınırlamalar
      </h2>

      <p className="mt-3 text-base leading-[1.6]">
        Bu hesaplayıcı yalnızca bilgilendirme amaçlıdır, hukuki tavsiye değildir. Somut bir
        uyuşmazlıkta Çalışma Dairesi&apos;ne veya bir avukata danışın.
      </p>

      <h3 className="mb-2 mt-4 text-xs uppercase tracking-tight opacity-80">Varsayımlar</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-base leading-[1.55]">
        {tool.assumptions.map((assumption) => (
          <li key={assumption}>{assumption}</li>
        ))}
      </ul>

      <h3 className="mb-2 mt-4 text-xs uppercase tracking-tight opacity-80">Kapsam dışı</h3>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-base leading-[1.55]">
        {tool.limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
}
