import { createHmac, timingSafeEqual } from 'node:crypto';

import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/lib/db/client';
import { SITE_URL } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

/**
 * One-click unsubscribe — spec 10.3, mandatory.
 *
 * The token is HMAC signed; we keep no separate table. It works both from the link
 * (GET) and from the List-Unsubscribe-Post one-click flow (POST) — RFC 8058
 * compliant clients send a POST and never fall back to GET.
 *
 * On unsubscribe the alert is deleted, not deactivated: we tell the user "we have
 * removed your address from our records", and that has to be true (artboard 1h step
 * 4).
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
   * If the user has no follows left we delete the profile too — the privacy page
   * says "your address is removed from our records".
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

/** RFC 8058 one-click: no body, and the response must be 200. */
export async function POST(request: Request) {
  const { ok } = await unsubscribe(request);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
