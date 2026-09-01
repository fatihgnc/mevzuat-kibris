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
     * TEK PRERENDER İŞÇİSİ — bağlantı tavanı için, hız için değil.
     *
     * Derleme, `src/lib/db/client.ts` içindeki `poolUrl()` gereği SESSION
     * pooler'a bağlanır ve o pooler 15 istemciyle sınırlıdır. Varsayılan işçi
     * sayısıyla (~8) her işçi kendi havuzunu açar (max: 4) → ~32 bağlantı ve
     * derleme `EMAXCONNSESSION` ile ölür. Tek işçiyle ~8 bağlantı açılıyor,
     * tavanın altında kalıyor: 3.399 sayfa, 13 dk.
     *
     * Bu ayar client.ts'teki pooler seçimiyle TEK bir karardır; birini tek
     * başına değiştirmek derlemeyi kırar.
     */
    cpus: 1,
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
