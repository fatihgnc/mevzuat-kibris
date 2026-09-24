import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta adresi girin.').max(254),
  message: z.string().trim().min(1, 'Mesaj boş olamaz.').max(4000),
  /** The page the visitor was on when they opened the widget. */
  page: z.string().trim().max(500).optional(),
  /** Honeypot: hidden from people, filled in by form-stuffing bots. */
  website: z.string().optional(),
});

/*
 * The widget sits on every page, so this endpoint is reachable from every page
 * too. A small per-IP budget keeps a bot from turning it into a mail cannon.
 * In-memory is enough for the same reason as the /karar limiter in middleware.ts:
 * the app is a single long-lived Node process.
 */
const WINDOW_MS = 15 * 60_000;
const MAX_PER_WINDOW = 5;
const MAX_TRACKED_IPS = 5000;
const hits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    if (hits.size >= MAX_TRACKED_IPS) hits.clear();
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/** Only keep a page reference that points at this site; anything else is dropped. */
function sitePath(page: string | undefined): string | null {
  if (!page) return null;
  try {
    const url = new URL(page, SITE_URL);
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

/** The floating contact widget's endpoint — see components/contact-widget. */
export async function POST(request: Request) {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Çok fazla mesaj gönderildi, biraz sonra tekrar deneyin.' },
      { status: 429 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Geçersiz form verisi.' },
      { status: 400 },
    );
  }

  const { email, message, page, website } = parsed.data;

  // Pretend it went through so the bot has nothing to learn from.
  if (website) return NextResponse.json({ ok: true });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Mesaj şu an gönderilemiyor, doğrudan e-posta ile yazabilirsiniz.' },
      { status: 502 },
    );
  }

  const path = sitePath(page);
  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? SITE_NAME + ' <bildirim@mevzuatkibris.com>';

  const { error } = await resend.emails.send({
    from,
    to: CONTACT_EMAIL,
    replyTo: email,
    subject: SITE_NAME + ' iletişim — ' + (path ?? email),
    text:
      'Gönderen: ' +
      email +
      '\n' +
      (path ? 'Sayfa: ' + SITE_URL + path + '\n' : '') +
      '\n' +
      message,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'Mesaj gönderilemedi, biraz sonra tekrar deneyin.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
