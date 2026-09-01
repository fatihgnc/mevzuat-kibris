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
 * Setting up a follow — artboard 1h steps 1 and 2.
 *
 * The flow is deliberately two-step: the alert is not written immediately; a magic
 * link is sent first. No record is created until the link is clicked, so a follow
 * cannot be set up with someone else's address. The alert itself is written inside
 * /auth/callback, after the session is established.
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

  // If a session is already open there is no need for a magic link; we create the alert directly.
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
   * The alert definition is embedded in the magic link's redirect URL. We do not
   * want to create a persistent record on the server while there is no session: a
   * table full of unverified email addresses is both pointless and open to abuse.
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
