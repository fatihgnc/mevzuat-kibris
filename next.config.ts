import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Metin ürünü — raster görsel yok (bkz. spec 14.3). Tek istisna opengraph-image.
  images: { unoptimized: true },
  experimental: {
    // Liste ve kayıt sayfaları tamamen server component; paket import'larını ağaç-budama.
    optimizePackageImports: ['lucide-react'],
    /*
     * PRERENDER İŞÇİ SAYISI — bağlantı tavanı için, hız için değil.
     *
     * Derleme, `src/lib/db/client.ts` içindeki `poolUrl()` gereği SESSION
     * pooler'a bağlanır ve o pooler'ın istemci tavanı var (panelden 15'ten 40'a
     * yükseltildi, bkz. client.ts). Bu ayar OLMADIĞINDA Next çekirdek sayısı
     * kadar işçi açıyor (bu makinede 16 çekirdek → 15+ işçi ölçüldü) ve her işçi
     * kendi havuzunu açtığı için 60+ bağlantı isteniyor: `EMAXCONNSESSION`.
     *
     * 3 işçi × `max: 4` (client.ts'teki `poolConfig`) = 12 bağlantı. Derleme ile
     * çalışma zamanı aynı tavanı paylaşıyor ve ayrı ayrı değil TOPLANARAK
     * hesaplanmalı: dağıtım sırasında eski sürümün lambda'ları hâlâ trafiği
     * karşılıyor. Sayı bir ÜST SINIR olduğu için daha az çekirdekli makinelerde
     * (Vercel) kendiliğinden daha güvenli tarafa düşüyor.
     *
     * Neden 3 ve 1 değil: derleme ağa bağlı (sorgu başına ~107 ms gidiş-dönüş,
     * Frankfurt), yani işçi sayısı doğrudan süreye yansıyor. Ölçüm §6.5'te —
     * 1 işçi 6m59s, 3 işçi 2m49s. Yükseltmek isteyen ÖNCE bağlantı hesabını
     * yapsın: işçi × 4 < 15.
     *
     * Bu ayar client.ts'teki pooler seçimiyle TEK bir karardır; birini tek
     * başına değiştirmek derlemeyi kırar.
     */
    cpus: 3,
  },
  /**
   * Old `?sayfa=` / `?filtre=` links, sent to their new addresses.
   *
   * THESE MUST LIVE HERE AND NOT IN A PAGE. Handling them inside a route would mean
   * reading `searchParams`, which is the exact thing that cost these routes their
   * prerendering in the first place — the redirect would preserve the URLs and undo
   * the fix. `redirects()` runs at the edge, before any route is chosen, so the
   * pages behind it stay static.
   *
   * `permanent: true` (308) because the query-string form is not coming back. That
   * is a different case from the thin-record redirect in /karar/[slug], which is
   * deliberately 307: there the condition can change when a later parser pass gives
   * the record a body. Here the URL shape is a settled decision.
   *
   * Order matters — the filtered forms have to be matched before the bare ones, or
   * `?filtre=acik&sayfa=2` would lose its filter to the plainer rule.
   */
  async redirects() {
    const page = '(?<n>\\d{1,4})';

    return [
      // /konu/x?filtre=acik&sayfa=N  ->  /konu/x/acik/sayfa/N
      {
        source: '/konu/:konu',
        has: [
          { type: 'query' as const, key: 'filtre', value: 'acik' },
          { type: 'query' as const, key: 'sayfa', value: page },
        ],
        destination: '/konu/:konu/acik/sayfa/:n',
        permanent: true,
      },
      // /konu/x?filtre=acik  ->  /konu/x/acik
      {
        source: '/konu/:konu',
        has: [{ type: 'query' as const, key: 'filtre', value: 'acik' }],
        destination: '/konu/:konu/acik',
        permanent: true,
      },
      // /konu/x/2025?sayfa=N  ->  /konu/x/2025/sayfa/N
      {
        source: '/konu/:konu/:yil(\\d{4})',
        has: [{ type: 'query' as const, key: 'sayfa', value: page }],
        destination: '/konu/:konu/:yil/sayfa/:n',
        permanent: true,
      },
      // /konu/x?sayfa=N  ->  /konu/x/sayfa/N
      {
        source: '/konu/:konu',
        has: [{ type: 'query' as const, key: 'sayfa', value: page }],
        destination: '/konu/:konu/sayfa/:n',
        permanent: true,
      },
      // /kurum/x?sayfa=N and the other two kinds, plus their hubs
      {
        source: '/:kind(kurum|sirket|yer)/:slug',
        has: [{ type: 'query' as const, key: 'sayfa', value: page }],
        destination: '/:kind/:slug/sayfa/:n',
        permanent: true,
      },
      {
        source: '/:kind(kurum|sirket|yer)',
        has: [{ type: 'query' as const, key: 'sayfa', value: page }],
        destination: '/:kind/sayfa/:n',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
