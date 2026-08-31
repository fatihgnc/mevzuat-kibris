'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { TR_WEEKDAYS } from '@/lib/text/dates';
import type { AlertRow } from '@/types/alert';

/**
 * Takip yönetimi — artboard 1h adım 4.
 *
 * Sıklık satırında kullanıcının kendi günü yazıyor, sabit "pazartesi" değil
 * (spec 10.3 madde 2). Dağıtımın anlamı bu; herkese aynı günü göstermek
 * verilen sözü tutmamak olur.
 */
export function AlertList({ alerts }: { alerts: AlertRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);

  async function stop(id: number) {
    setBusyId(id);
    try {
      await fetch('/api/alerts?id=' + id, { method: 'DELETE' });
      startTransition(() => router.refresh());
    } finally {
      setBusyId(null);
    }
  }

  if (!alerts.length) {
    return (
      <p className="py-6 text-md text-ink-muted">
        Henüz takip kurmadınız. Bir konu ya da arama sayfasından tek tıkla kurabilirsiniz.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {alerts.map((alert) => (
        <li
          key={alert.id}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line-soft py-3.5"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-md text-ink">
              <span className="font-medium">{alert.label}</span>
            </div>
            <div className="mt-0.5 text-sm text-ink-muted">
              {alert.frequency === 'weekly'
                ? 'Haftalık özet, ' + TR_WEEKDAYS[alert.preferredWeekday] + ' sabahı'
                : 'Her gün, yeni kayıt varsa'}
              {alert.query ? ' · “' + alert.query + '” araması' : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => stop(alert.id)}
            disabled={pending && busyId === alert.id}
            className="text-base text-accent hover:text-ink disabled:opacity-50"
          >
            {pending && busyId === alert.id ? 'Durduruluyor…' : 'Durdur'}
          </button>
        </li>
      ))}
    </ul>
  );
}
