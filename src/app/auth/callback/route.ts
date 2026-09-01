import { NextResponse } from 'next/server';

import { isTopicSlug } from '@/lib/constants/topics';
import { createAlert } from '@/lib/db/queries/alerts';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * The magic link return — artboard 1h, the move from step 2 to step 3.
 *
 * The alert is written here rather than in /api/alerts: no persistent record exists
 * until the link is clicked, so a follow cannot be set up with an unverified
 * address. The alert definition comes from the redirect URL's query parameters.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(origin + '/takip?durum=hata');
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(origin + '/takip?durum=hata');
  }

  const label = url.searchParams.get('label');

  // If the link carries no alert definition this is just a sign-in; we go to the follow page.
  if (!label) return NextResponse.redirect(origin + '/takip');

  const topic = url.searchParams.get('topic');
  const query = url.searchParams.get('query');
  const entityId = Number(url.searchParams.get('entityId'));
  const frequency = url.searchParams.get('frequency') === 'daily' ? 'daily' : 'weekly';

  try {
    const alert = await createAlert({
      userId: data.user.id,
      label,
      query: query ?? null,
      topics: topic && isTopicSlug(topic) ? [topic] : [],
      entityIds: Number.isInteger(entityId) && entityId > 0 ? [entityId] : [],
      frequency,
    });

    /*
     * The confirmation screen will show the user the ACTUAL day they were assigned
     * (spec 10.3 rule 2), so the day and the final frequency are carried in the URL.
     * Writing a fixed "pazartesi" for everyone defeats the point of spreading the
     * load.
     */
    const params = new URLSearchParams({
      durum: 'onay',
      takip: String(alert.id),
      gun: String(alert.preferredWeekday),
      siklik: alert.frequency,
    });

    return NextResponse.redirect(origin + '/takip?' + params.toString());
  } catch {
    return NextResponse.redirect(origin + '/takip?durum=hata');
  }
}
