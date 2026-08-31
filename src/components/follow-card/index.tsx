'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { TR_WEEKDAYS, formatDateWithWeekday, nextWeekday } from '@/lib/text/dates';
import { cn } from '@/lib/utils';
import type { AlertFrequency } from '@/types/alert';

interface FollowCardProps {
  title: string;
  description: string;
  /** Alarmın neyi takip ettiği — API'ye aynen gider. */
  subject: {
    label: string;
    topic?: string;
    query?: string;
    entityId?: number;
    docTypes?: string[];
  };
  /** RSS eşdeğeri varsa e-postayla eşit ağırlıkta sunulur (spec 10.4). */
  rssHref?: string;
  /** Sıklık seçimi gösterilsin mi (konu akışında var, kayıt sayfasında yok). */
  showFrequency?: boolean;
  className?: string;
}

type Phase = 'idle' | 'sending' | 'sent' | 'error';

/**
 * Takip kurma kartı — artboard 1a/1d/1e yan sütunu ve 1h akışının 1. adımı.
 *
 * Akış tasarımdaki dört durumu izliyor: kurma -> doğrulama -> onay -> çıkış.
 * Doğrulama adımı Supabase magic link; bağlantıya tıklanana kadar takip
 * başlamıyor ve adres başkasına aitse hiçbir şey olmuyor.
 */
export function FollowCard({
  title,
  description,
  subject,
  rssHref,
  showFrequency = true,
  className,
}: FollowCardProps) {
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState<AlertFrequency>('weekly');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<string | null>(null);

  /*
   * Spec 10.3 madde 2: onay ekranında kullanıcıya atanan GERÇEK gün gösterilir.
   * Herkese sabit "pazartesi" yazmak dağıtımın anlamını bitirir ve verilen sözü
   * tutmaz. Gün sunucuda hash(user_id) % 7 ile atanıyor; burada gösterilen tarih
   * API'nin döndürdüğü güne göre yazılıyor, tahminle değil.
   */
  const [assignedWeekday, setAssignedWeekday] = useState<number | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhase('sending');
    setMessage(null);

    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, frequency, ...subject }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        frequency?: AlertFrequency;
        preferredWeekday?: number;
      };

      if (!response.ok || !data.ok) {
        setPhase('error');
        setMessage(data.error ?? 'Takip kurulamadı. Biraz sonra tekrar deneyin.');
        return;
      }

      // Sunucu günlük kotayı doldurduysa haftalığa düşürmüş olabilir (spec 10.3
      // madde 5). Kullanıcıya ne olduğunu söylüyoruz, sessizce değiştirmiyoruz.
      if (data.frequency && data.frequency !== frequency) {
        setMessage(
          'Günlük özet kontenjanı dolu olduğu için haftalık özete kaydedildik. Dilediğiniz zaman değiştirebilirsiniz.',
        );
      }
      if (typeof data.preferredWeekday === 'number') setAssignedWeekday(data.preferredWeekday);
      setPhase('sent');
    } catch {
      setPhase('error');
      setMessage('Bağlantı kurulamadı. Biraz sonra tekrar deneyin.');
    }
  }

  if (phase === 'sent') {
    return (
      <div className={cn('rounded-md border border-line bg-surface-muted p-[18px]', className)}>
        <div className="text-md font-semibold text-ink">
          {email} adresine bir bağlantı gönderdik
        </div>
        <p className="mt-2 text-sm leading-[1.55] text-ink-muted">
          Bağlantıya tıklayana kadar takip başlamaz. Adres başkasına aitse hiçbir şey olmaz.
        </p>
        <div className="mt-3.5 rounded-md border border-line bg-surface p-3.5 text-base leading-[1.6]">
          <div className="font-semibold text-ink">{subject.label}</div>
          <div className="text-ink-muted">
            {frequency === 'weekly'
              ? assignedWeekday === null
                ? 'Haftalık özet'
                : 'Haftalık özet, ' + TR_WEEKDAYS[assignedWeekday] + ' sabahı'
              : 'Her gün, yeni kayıt varsa'}
          </div>
          {frequency === 'weekly' && assignedWeekday !== null ? (
            <div className="mt-1 text-sm text-ink-muted">
              İlk özet {formatDateWithWeekday(nextWeekday(assignedWeekday))} sabahı gelecek.
            </div>
          ) : null}
        </div>
        {message ? <p className="mt-3 text-sm text-notice-ink">{message}</p> : null}
        <p className="mt-3 border-t border-line pt-3 text-sm leading-[1.5] text-ink-muted">
          Gelmediyse önce gereksiz klasörüne bakın.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border border-line bg-surface-muted p-[18px]', className)}>
      <div className="mb-1.5 text-md font-semibold text-ink">{title}</div>
      <p className="mb-3.5 text-sm leading-[1.5] text-ink-muted">{description}</p>

      <form onSubmit={submit}>
        <label className="sr-only" htmlFor={'follow-email-' + subject.label}>
          E-posta adresiniz
        </label>
        <input
          id={'follow-email-' + subject.label}
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="e-posta adresiniz"
          autoComplete="email"
          className="mb-2 w-full rounded border border-line-strong bg-surface px-[11px] py-2.5 text-sm text-ink outline-none placeholder:text-ink-placeholder"
        />

        {showFrequency ? (
          <fieldset className="mb-2.5 flex flex-wrap gap-3.5 text-sm text-ink-body">
            <legend className="sr-only">Sıklık</legend>
            <FrequencyOption
              name={'freq-' + subject.label}
              value="weekly"
              checked={frequency === 'weekly'}
              onChange={() => setFrequency('weekly')}
              label="Haftalık"
            />
            <FrequencyOption
              name={'freq-' + subject.label}
              value="daily"
              checked={frequency === 'daily'}
              onChange={() => setFrequency('daily')}
              label="Her gün"
            />
          </fieldset>
        ) : null}

        <button
          type="submit"
          disabled={phase === 'sending'}
          className="w-full rounded bg-accent py-2.5 text-base font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {phase === 'sending' ? 'Gönderiliyor…' : 'Takibe al'}
        </button>
      </form>

      {/*
        Hata ile bilgi aynı renkte olamaz: ikisi de sarıyken "gönderilemedi"
        bir dipnot gibi okunuyor ve kullanıcı işlemin başarısız olduğunu
        fark etmiyor. role="alert" da şart — mesaj JS ile sonradan
        belirdiği için ekran okuyucu aksi hâlde hiç duyurmuyor.
      */}
      {message ? (
        <p
          role={phase === 'error' ? 'alert' : 'status'}
          className={cn(
            'mt-2.5 text-sm',
            phase === 'error' ? 'font-semibold text-danger-ink' : 'text-notice-ink',
          )}
        >
          {message}
        </p>
      ) : null}

      {rssHref ? (
        <div className="mt-2.5 text-sm">
          <Link href={rssHref}>E-posta yerine RSS</Link>
        </div>
      ) : null}
    </div>
  );
}

function FrequencyOption({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-1.5', !checked && 'text-ink-muted')}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          'box-border h-3 w-3 rounded-full bg-surface',
          checked ? 'border-4 border-accent' : 'border border-line-strong',
        )}
      />
      {label}
    </label>
  );
}
