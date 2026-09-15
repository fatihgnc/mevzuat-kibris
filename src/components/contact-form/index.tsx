'use client';

import { useState } from 'react';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(1, 'Ad soyad gerekli.'),
  email: z.string().trim().email('Geçerli bir e-posta adresi girin.'),
  message: z.string().trim().min(1, 'Mesaj boş olamaz.'),
});

/**
 * A short form for someone who would rather not open a mail client -- the
 * mailto link above this stays as the primary path (spec: "her konu için tek
 * adres"), this is a lower-friction alternative for a simple message.
 */
export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = schema.safeParse({ name, email, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formu kontrol edin.');
      return;
    }

    setError(null);
    setStatus('sending');
    try {
      const response = await fetch('/api/iletisim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? 'Mesaj gönderilemedi.');
        setStatus('idle');
        return;
      }
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setError('Mesaj gönderilemedi, bağlantınızı kontrol edip tekrar deneyin.');
      setStatus('idle');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-md border border-line bg-surface-muted p-[18px] text-md text-ink-body">
        Mesajınız gönderildi, teşekkürler. Yedi gün içinde yanıtlıyoruz.
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-md border border-line bg-surface-muted p-[18px]"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="contact-name" className="mb-1.5 block text-sm font-semibold text-ink">
            Ad soyad
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded border border-line-strong bg-surface px-[11px] py-2.5 text-sm text-ink outline-none placeholder:text-ink-placeholder"
          />
        </div>

        <div className="flex-1">
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-semibold text-ink">
            E-posta
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded border border-line-strong bg-surface px-[11px] py-2.5 text-sm text-ink outline-none placeholder:text-ink-placeholder"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-semibold text-ink">
          Mesaj
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full rounded border border-line-strong bg-surface px-[11px] py-2.5 text-sm text-ink outline-none placeholder:text-ink-placeholder"
        />
      </div>

      {error ? <p className="m-0 text-sm text-danger-ink">{error}</p> : null}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="self-start rounded bg-accent px-5 py-2.5 text-base font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {status === 'sending' ? 'Gönderiliyor…' : 'Gönder'}
      </button>
    </form>
  );
}
