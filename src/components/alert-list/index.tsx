'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { TR_WEEKDAYS } from '@/lib/text/dates';
import type { AlertRow } from '@/types/alert';

/**
 * Follow management — artboard 1h step 4.
 *
 * The frequency row shows the user's own day, not a fixed "pazartesi" (spec 10.3
 * rule 2). That is the whole point of spreading the load; showing everyone the same
 * day would break the promise made.
 *
 * The day control changes EVERY weekly follow the user has, not the one row it
 * sits on — the day belongs to the user, not the follow (see setUserWeekday). The
 * note under the list says so, because a control that silently moves other rows is
 * worse than no control.
 */
export function AlertList({ alerts }: { alerts: AlertRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function patch(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    setNotice(null);
    try {
      const response = await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      });
      const data = (await response.json()) as { ok: boolean; downgraded?: boolean };
      if (!response.ok || !data.ok) {
        setNotice('Değişiklik kaydedilemedi. Biraz sonra tekrar deneyin.');
        return;
      }
      // Spec 10.3 rule 5: the cap may have turned this back into weekly. Say so.
      if (data.downgraded) {
        setNotice('Günlük özet kontenjanı dolu olduğu için haftalık olarak kaydedildi.');
      }
      startTransition(() => router.refresh());
    } catch {
      setNotice('Değişiklik kaydedilemedi. Biraz sonra tekrar deneyin.');
    } finally {
      setBusyId(null);
    }
  }

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

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <label className="sr-only" htmlFor={'freq-' + alert.id}>
                Sıklık
              </label>
              <select
                id={'freq-' + alert.id}
                value={alert.frequency}
                disabled={busyId === alert.id}
                onChange={(event) => patch(alert.id, { frequency: event.target.value })}
                className="rounded border border-line-strong bg-surface px-1.5 py-1 text-sm text-ink disabled:opacity-50"
              >
                <option value="weekly">Haftalık</option>
                <option value="daily">Her gün</option>
              </select>

              {alert.frequency === 'weekly' ? (
                <>
                  <label className="sr-only" htmlFor={'gun-' + alert.id}>
                    Gönderim günü
                  </label>
                  <select
                    id={'gun-' + alert.id}
                    value={alert.preferredWeekday}
                    disabled={busyId === alert.id}
                    onChange={(event) =>
                      patch(alert.id, { preferredWeekday: Number(event.target.value) })
                    }
                    className="rounded border border-line-strong bg-surface px-1.5 py-1 text-sm text-ink disabled:opacity-50"
                  >
                    {TR_WEEKDAYS.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
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
      {notice ? (
        <li role="status" className="pt-3 text-sm text-notice-ink">
          {notice}
        </li>
      ) : null}
      {alerts.some((alert) => alert.frequency === 'weekly') ? (
        <li className="pt-3 text-sm text-ink-muted">
          Gönderim günü haftalık takiplerinizin hepsi için ortaktır; birini
          değiştirdiğinizde diğerleri de o güne taşınır.
        </li>
      ) : null}
    </ul>
  );
}
