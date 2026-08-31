import { NextResponse } from 'next/server';

import { siteStatus } from '@/lib/db/queries/records';

/**
 * Durum uç noktası — spec 11.2.
 *
 * Statik render'ın donmasını engellemek için var: ana sayfadaki "bugün eklenen
 * N kayıt" satırı ISR ile geliyor ama istemci mount'tan sonra buradan bir kez
 * daha okuyup düzeltiyor. Payload kasıtlı olarak küçük.
 *
 * Aynı uç nokta ingest sonrası tutarlılık testinde de kullanılıyor (spec 11.3).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await siteStatus();

  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
}
