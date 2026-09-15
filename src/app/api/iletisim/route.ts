import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';

import { CONTACT_EMAIL, SITE_NAME } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().trim().min(1, 'Ad soyad gerekli.').max(120),
  email: z.string().trim().email('Geçerli bir e-posta adresi girin.').max(254),
  message: z.string().trim().min(1, 'Mesaj boş olamaz.').max(4000),
});

/** The contact page's own form -- for a visitor who wants to send a quick message without opening a mail client (/iletisim). */
export async function POST(request: Request) {
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

  const { name, email, message } = parsed.data;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'Mesaj şu an gönderilemiyor, doğrudan e-posta ile yazabilirsiniz.' },
      { status: 502 },
    );
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? SITE_NAME + ' <bildirim@mevzuatkibris.com>';

  const { error } = await resend.emails.send({
    from,
    to: CONTACT_EMAIL,
    replyTo: email,
    subject: SITE_NAME + ' iletişim formu — ' + name,
    text: 'Gönderen: ' + name + ' <' + email + '>\n\n' + message,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'Mesaj gönderilemedi, biraz sonra tekrar deneyin.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
