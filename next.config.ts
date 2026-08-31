import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Metin ürünü — raster görsel yok (bkz. spec 14.3). Tek istisna opengraph-image.
  images: { unoptimized: true },
  experimental: {
    // Liste ve kayıt sayfaları tamamen server component; paket import'larını ağaç-budama.
    optimizePackageImports: ['lucide-react'],
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
