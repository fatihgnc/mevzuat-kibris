import { NextResponse } from 'next/server';

import { isTopicSlug } from '@/lib/constants/topics';
import { createAlert } from '@/lib/db/queries/alerts';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Magic link dönüşü — artboard 1h adım 2'den 3'e geçiş.
 *
 * Alarm burada yazılıyor, /api/alerts'te değil: bağlantıya tıklanana kadar
 * kalıcı hiçbir kayıt oluşmuyor, yani doğrulanmamış adresle takip kurulamıyor.
 * Alarm tanımı redirect URL'inin query parametrelerinden geliyor.
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

  // Bağlantıda alarm tanımı yoksa bu sadece bir giriş; takip sayfasına gidiyoruz.
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
     * Onay ekranında kullanıcıya atanan GERÇEK gün gösterilecek (spec 10.3
     * madde 2), o yüzden gün ve nihai sıklık URL'e taşınıyor. Herkese sabit
     * "pazartesi" yazmak dağıtımın anlamını bitirir.
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
