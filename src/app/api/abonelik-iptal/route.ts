import { createHmac, timingSafeEqual } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db/client';
import { SITE_URL } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

/**
 * Tek tıkla abonelikten çıkma — spec 10.3, zorunlu.
 *
 * Jeton HMAC imzalı; ayrı bir tablo tutmuyoruz. Hem bağlantıdan (GET) hem
 * List-Unsubscribe-Post one-click akışından (POST) çalışıyor — RFC 8058
 * uyumlu istemciler POST atıyor ve GET'e düşmüyor.
 *
 * Çıkışta alarm siliniyor, pasifleştirilmiyor: kullanıcıya "adresi kaydımızdan
 * sildik" diyoruz ve bunun doğru olması gerekiyor (artboard 1h adım 4).
 */
function expectedToken(alertId: number): string {
  const secret = process.env.ALERT_UNSUBSCRIBE_SECRET ?? process.env.REVALIDATE_SECRET ?? '';
  return createHmac('sha256', secret).update('alert:' + alertId).digest('base64url');
}

function tokenMatches(alertId: number, provided: string): boolean {
  const expected = expectedToken(alertId);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function unsubscribe(request: Request): Promise<{ ok: boolean }> {
  const url = new URL(request.url);
  const alertId = Number(url.searchParams.get('id'));
  const token = url.searchParams.get('t') ?? '';

  if (!Number.isInteger(alertId) || alertId <= 0 || !token) return { ok: false };
  if (!tokenMatches(alertId, token)) return { ok: false };

  await db.execute(sql`delete from alerts where id = ${alertId}`);

  /*
   * Kullanıcının başka takibi kalmadıysa profili de siliyoruz — gizlilik
   * sayfasında "adresiniz kaydımızdan silinir" diyoruz.
   */
  await db.execute(sql`
    delete from profiles p
     where not exists (select 1 from alerts a where a.user_id = p.id)
  `);

  return { ok: true };
}

export async function GET(request: Request) {
  const { ok } = await unsubscribe(request);
  return NextResponse.redirect(SITE_URL + '/takip?durum=' + (ok ? 'iptal' : 'hata'));
}

/** RFC 8058 one-click: gövde yok, yanıt 200 olmalı. */
export async function POST(request: Request) {
  const { ok } = await unsubscribe(request);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
