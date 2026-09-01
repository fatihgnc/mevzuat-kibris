import type { Metadata } from 'next';
import Link from 'next/link';

import { AlertList } from '@/components/alert-list';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { FollowCard } from '@/components/follow-card';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TOPIC_LIST } from '@/lib/constants/topics';
import { listAlerts } from '@/lib/db/queries/alerts';
import { getCurrentUser } from '@/lib/supabase/server';
import { TR_WEEKDAYS, formatDateWithWeekday, nextWeekday } from '@/lib/text/dates';

export const dynamic = 'force-dynamic';

/** The follow and account pages are not indexed (spec 8.1). */
export const metadata: Metadata = {
  title: 'Takiplerim',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function FollowPage({ searchParams }: Props) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const alerts = user ? await listAlerts(user.id) : [];

  const status = typeof query.durum === 'string' ? query.durum : null;
  const weekday = Number(query.gun);
  const hasWeekday = Number.isInteger(weekday) && weekday >= 0 && weekday <= 6;

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Takiplerim' }]} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          Takiplerim
        </h1>

        {/* The confirmation screen — artboard 1h step 3. */}
        {status === 'onay' ? (
          <div className="mt-6 rounded-md border border-line bg-surface-muted p-5">
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
              <p className="m-0 text-2xl font-semibold text-ink">Takip başladı</p>
            </div>
            <p className="mt-2 text-base leading-[1.55] text-ink-muted">
              {query.siklik === 'daily'
                ? 'Yeni kayıt yayımlandığı gün e-posta göndereceğiz.'
                : hasWeekday
                  ? 'İlk özet ' +
                    formatDateWithWeekday(nextWeekday(weekday)) +
                    ' sabahı gelecek. Her hafta aynı gün.'
                  : 'İlk haftalık özetiniz yolda.'}
            </p>
            <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">
              Her e-postanın altında tek tıkla çıkma bağlantısı var.
            </p>
          </div>
        ) : null}

        {status === 'iptal' ? (
          <div className="mt-6 rounded-md border border-line bg-surface-muted p-5">
            <p className="m-0 text-2xl font-semibold text-ink">Takip durduruldu</p>
            <p className="mt-2 text-base leading-[1.55] text-ink-muted">
              Bu konuda başka e-posta gitmeyecek. Başka takibiniz kalmadıysa adresinizi
              kaydımızdan sildik.
            </p>
            <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">
              Yanlışlıkla yaptıysanız aşağıdan yeniden kurabilirsiniz.
            </p>
          </div>
        ) : null}

        {status === 'hata' ? (
          <div className="mt-6 rounded-md border border-notice-border bg-notice p-5 text-base text-notice-ink">
            <p className="m-0 font-semibold">Bağlantı geçersiz ya da süresi dolmuş.</p>
            <p className="m-0 mt-1.5">
              Takibi aşağıdan yeniden kurabilirsiniz; yeni bir doğrulama bağlantısı göndeririz.
            </p>
          </div>
        ) : null}

        {user ? (
          <>
            <section className="mt-8">
              <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                <h2 className="m-0 text-md font-semibold text-ink">Devam eden takipleriniz</h2>
                <span className="text-sm text-ink-muted">{user.email}</span>
              </div>
              <AlertList alerts={alerts} />
            </section>

            {alerts.some((alert) => alert.frequency === 'weekly') ? (
              <p className="mt-4 text-sm text-ink-muted">
                Haftalık özetler gönderim yükünü haftaya dağıtmak için kullanıcı başına sabit bir
                güne atanır. Sizin gününüz{' '}
                <span className="font-semibold text-ink">
                  {TR_WEEKDAYS[alerts.find((a) => a.frequency === 'weekly')!.preferredWeekday]}
                </span>
                .
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-6 text-xl leading-[1.6] text-ink-body">
            Takiplerinizi görmek için e-posta adresinize gönderilen bağlantıyla giriş yapın. Hesap
            açmanız, parola belirlemeniz gerekmiyor.
          </p>
        )}

        <div className="mt-9 grid gap-6 sm:grid-cols-2">
          <FollowCard
            title="Yeni takip kur"
            description="Bir konu seçin ya da arama sayfasından kendi kelimenizle takip kurun."
            subject={{ label: 'Tüm kayıtlar' }}
            rssHref="/rss.xml"
          />

          <div className="rounded-md border border-line bg-surface-muted p-[18px]">
            <h2 className="m-0 mb-1.5 text-md font-semibold text-ink">Konu akışları</h2>
            <p className="m-0 mb-3 text-sm leading-[1.5] text-ink-muted">
              Her konunun kendi akışı ve RSS bağlantısı var. E-posta vermek istemiyorsanız RSS aynı
              kayıtları aynı sırada verir.
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-base">
              {TOPIC_LIST.map((topic) => (
                <li key={topic.slug}>
                  <Link href={'/konu/' + topic.slug}>{topic.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
