import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ProsePage, Section } from '@/components/prose-page';
import { listAlerts } from '@/lib/db/queries/alerts';
import { getCurrentUser } from '@/lib/supabase/server';
import { TR_WEEKDAYS } from '@/lib/text/dates';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Hesap',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/takip');

  const alerts = await listAlerts(user.id);
  const weekly = alerts.find((alert) => alert.frequency === 'weekly');

  return (
    <ProsePage title="Hesap" crumbs={[{ name: 'Ana sayfa', href: '/' }, { name: 'Hesap' }]}>
      <Section heading="E-posta">
        <p className="m-0">{user.email}</p>
        <p className="m-0 text-ink-muted">
          Parola yok; giriş her zaman e-posta bağlantısıyla yapılır.
        </p>
      </Section>

      <Section heading="Gönderim günü">
        <p className="m-0">
          {weekly ? (
            <>
              Haftalık özetleriniz <strong>{TR_WEEKDAYS[weekly.preferredWeekday]}</strong> sabahı
              gidiyor.
            </>
          ) : (
            'Haftalık özet aboneliğiniz yok.'
          )}
        </p>
        <p className="m-0 text-ink-muted">
          Gönderimi haftaya dağıtmak için her kullanıcıya sabit bir gün atanıyor. Böylece hiçbir gün
          gönderim tavanı aşılmıyor ve bildirimler gecikmiyor.
        </p>
      </Section>

      <Section heading="Takipleriniz">
        <p className="m-0">
          {alerts.length} takip kurulu. <Link href="/takip">Takip sayfasından</Link>{' '}
          yönetebilirsiniz.
        </p>
      </Section>

      <Section heading="Verilerinizi silmek">
        <p className="m-0">
          Tüm takipleri durdurduğunuzda e-posta adresiniz kaydımızdan silinir. Her bildirim
          e-postasının altında da tek tıkla çıkma bağlantısı var.
        </p>
      </Section>
    </ProsePage>
  );
}
