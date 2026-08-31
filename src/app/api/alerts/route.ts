import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DOC_TYPES } from '@/lib/constants/doc-types';
import { TOPIC_SLUGS } from '@/lib/constants/topics';
import { createAlert, deleteAlert, listAlerts } from '@/lib/db/queries/alerts';
import { createSupabaseServerClient, getCurrentUser } from '@/lib/supabase/server';
import { SITE_URL } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  email: z.string().email().max(254),
  label: z.string().trim().min(1).max(120),
  frequency: z.enum(['daily', 'weekly']).default('weekly'),
  query: z.string().trim().max(200).optional(),
  topic: z.enum(TOPIC_SLUGS).optional(),
  entityId: z.number().int().positive().optional(),
  docTypes: z.array(z.enum(DOC_TYPES)).max(23).optional(),
});

/**
 * Takip kurma — artboard 1h adım 1 ve 2.
 *
 * Akış kasıtlı olarak iki adımlı: alarm hemen yazılmıyor, önce magic link
 * gönderiliyor. Bağlantıya tıklanana kadar hiçbir kayıt oluşmuyor, yani
 * başkasının adresiyle takip kurulamıyor. Alarmın kendisi /auth/callback
 * içinde, oturum açıldıktan sonra yazılıyor.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'E-posta adresi ya da takip bilgisi geçersiz.' },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser();

  // Oturum zaten açıksa magic link'e gerek yok, alarmı doğrudan kuruyoruz.
  if (user && user.email === input.email) {
    const alert = await createAlert({
      userId: user.id,
      label: input.label,
      query: input.query ?? null,
      topics: input.topic ? [input.topic] : [],
      docTypes: input.docTypes ?? [],
      entityIds: input.entityId ? [input.entityId] : [],
      frequency: input.frequency,
    });

    return NextResponse.json({
      ok: true,
      verified: true,
      frequency: alert.frequency,
      preferredWeekday: alert.preferredWeekday,
    });
  }

  /*
   * Alarm tanımı magic link'in redirect URL'ine gömülüyor. Sunucuda oturum
   * yokken kalıcı bir kayıt oluşturmak istemiyoruz: doğrulanmamış e-posta
   * adresleriyle dolu bir tablo hem gereksiz hem kötüye kullanılabilir.
   */
  const next = new URLSearchParams({
    label: input.label,
    frequency: input.frequency,
    ...(input.query ? { query: input.query } : {}),
    ...(input.topic ? { topic: input.topic } : {}),
    ...(input.entityId ? { entityId: String(input.entityId) } : {}),
  });

  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: {
      emailRedirectTo: SITE_URL + '/auth/callback?' + next.toString(),
    },
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'Doğrulama e-postası gönderilemedi. Biraz sonra tekrar deneyin.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, verified: false, frequency: input.frequency });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, alerts: [] }, { status: 401 });

  return NextResponse.json({ ok: true, alerts: await listAlerts(user.id) });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ ok: false, error: 'Geçersiz takip.' }, { status: 400 });
  }

  await deleteAlert(id, user.id);
  return NextResponse.json({ ok: true });
}
