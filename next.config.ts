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
     * pooler'a bağlanır ve o pooler 15 istemciyle sınırlıdır. Bu ayar
     * OLMADIĞINDA Next çekirdek sayısı kadar işçi açıyor (bu makinede 16 çekirdek
     * → 15+ işçi ölçüldü) ve her işçi kendi havuzunu açtığı için 60+ bağlantı
     * isteniyor: `EMAXCONNSESSION`.
     *
     * 3 işçi × `max: 3` (client.ts'teki `poolConfig`) = 9 bağlantı. Kalan 6,
     * DAĞITIM SIRASINDA hâlâ trafiği karşılayan eski sürümün lambda'larına
     * ayrıldı — derleme ile çalışma zamanı aynı 15'lik tavanı paylaşıyor ve
     * ayrı ayrı değil, TOPLANARAK hesaplanmalı. Sayı bir ÜST SINIR olduğu için
     * daha az çekirdekli makinelerde (Vercel) kendiliğinden daha güvenli tarafa
     * düşüyor.
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
