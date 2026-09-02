'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { TR_WEEKDAYS, formatDateWithWeekday, nextWeekday } from '@/lib/text/dates';
import { cn } from '@/lib/utils';
import type { AlertFrequency } from '@/types/alert';

interface FollowCardProps {
  title: string;
  description: string;
  /** What the alert follows — passed to the API verbatim. */
  subject: {
    label: string;
    topic?: string;
    query?: string;
    entityId?: number;
    docTypes?: string[];
  };
  /** If an RSS equivalent exists it is offered with equal weight to email (spec 10.4). */
  rssHref?: string;
  /** Whether to show the frequency choice (present in topic feeds, absent on record pages). */
  showFrequency?: boolean;
  className?: string;
}

type Phase = 'idle' | 'sending' | 'sent' | 'error';

/**
 * The follow card — the side column of artboards 1a/1d/1e and step 1 of the 1h
 * flow.
 *
 * The flow follows the design's four states: set up -> verify -> confirm ->
 * unsubscribe. The verification step is a Supabase magic link; the follow does not
 * start until the link is clicked, and nothing happens at all if the address
 * belongs to someone else.
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
   * Spec 10.3 rule 2: the confirmation screen shows the user the ACTUAL day they
   * were assigned. Writing a fixed "pazartesi" for everyone defeats the point of
   * spreading the load and breaks the promise made. The day is assigned server-side
   * as hash(user_id) % 7; the date shown here is written from the day the API
   * returned, not from a guess.
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

      // If the server has filled its daily quota it may have downgraded this to weekly
      // (spec 10.3 rule 5). We tell the user what happened; we do not change it silently.
      if (data.frequency && data.frequency !== frequency) {
        setMessage(
          'Günlük özet kontenjanı dolu olduğu için haftalık özete kaydedildik. Takiplerim sayfasından değiştirebilirsiniz.',
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
        {/*
          * The user is about to leave for their inbox — this is the moment the
          * same-browser rule decides whether the flow works. See the note by the
          * form below for why the rule exists.
          */}
        <p className="mt-3 border-t border-line pt-3 text-sm leading-[1.5] text-ink-muted">
          <span className="font-semibold text-ink">Bağlantıyı bu tarayıcıda açın.</span>{' '}
          E-postayı telefonunuzda ya da başka bir tarayıcıda açarsanız doğrulama başarısız
          olur.
        </p>
        <p className="mt-2 text-sm leading-[1.5] text-ink-muted">
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
        * Said BEFORE submitting, not only afterwards on the error screen.
        *
        * Verification is PKCE (`code_challenge_method: s256`): the `code_verifier`
        * is written as a cookie on this POST's response and /auth/callback needs
        * that same cookie back. So the link only works in the browser that
        * submitted this form — and filling a form on a laptop while reading mail
        * on a phone is the ordinary way people behave. Warning them here costs one
        * line; finding out from an error screen costs them the whole flow.
        */}
      <p className="mt-2.5 text-sm leading-[1.5] text-ink-muted">
        Doğrulama bağlantısını bu tarayıcıda açmanız gerekir; e-postayı başka bir cihazda
        açarsanız bağlantı çalışmaz.
      </p>

      {/*
        An error and a notice cannot share a colour: when both are yellow, "could
        not be sent" reads like a footnote and the user does not notice the
        operation failed. role="alert" is essential too — because the message
        appears later via JS, a screen reader would otherwise never announce it.
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
