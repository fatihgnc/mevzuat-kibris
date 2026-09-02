import { NextResponse } from 'next/server';
import { z } from 'zod';

import { DOC_TYPES } from '@/lib/constants/doc-types';
import { TOPIC_SLUGS } from '@/lib/constants/topics';
import {
  AlertLimitReached,
  MAX_ALERTS_PER_USER,
  alertBelongsTo,
  createAlert,
  deleteAlert,
  listAlerts,
  setAlertFrequency,
  setUserWeekday,
} from '@/lib/db/queries/alerts';
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
    try {
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
    } catch (error) {
      if (error instanceof AlertLimitReached) {
        return NextResponse.json(
          {
            ok: false,
            error:
              'En fazla ' + MAX_ALERTS_PER_USER + ' takip kurabilirsiniz. ' +
              'Yeni bir tane için Takiplerim sayfasından birini durdurun.',
          },
          { status: 409 },
        );
      }
      throw error;
    }
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

const patchSchema = z
  .object({
    id: z.number().int().positive(),
    frequency: z.enum(['daily', 'weekly']).optional(),
    preferredWeekday: z.number().int().min(0).max(6).optional(),
  })
  .refine((v) => v.frequency !== undefined || v.preferredWeekday !== undefined, {
    message: 'Değiştirilecek bir alan yok.',
  });

/**
 * Changing an existing follow — spec 10.3 rule 2 ("the user can change their day").
 *
 * This route did not exist while two places in the interface already promised the
 * change: the spec rule above, and the notice shown when the daily quota is full
 * ("Dilediğiniz zaman değiştirebilirsiniz"). The promise came first; this is the
 * code catching up to it.
 *
 * The weekday is applied to ALL of the user's weekly follows, not this one — see
 * setUserWeekday for why that invariant matters. The frequency is per follow and
 * may come back downgraded, so the effective values are returned rather than
 * echoed.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Geçersiz takip bilgisi.' }, { status: 400 });
  }

  const { id, frequency, preferredWeekday } = parsed.data;

  /*
   * Ownership is enforced in the queries (`and user_id = ...`) — RLS does not apply
   * to this connection (see db/client.ts). It is checked HERE as well so the answer
   * is honest: the weekday is applied user-wide and ignores `id`, so without this
   * check a request naming someone else's follow would still return ok and quietly
   * move the caller's own follows instead.
   */
  if (!(await alertBelongsTo(id, user.id))) {
    return NextResponse.json({ ok: false, error: 'Takip bulunamadı.' }, { status: 404 });
  }

  const effectiveFrequency = frequency
    ? await setAlertFrequency(id, user.id, frequency)
    : undefined;

  if (preferredWeekday !== undefined) await setUserWeekday(user.id, preferredWeekday);

  return NextResponse.json({
    ok: true,
    frequency: effectiveFrequency ?? undefined,
    downgraded: frequency !== undefined && effectiveFrequency !== frequency,
  });
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
