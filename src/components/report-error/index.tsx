'use client';

import { CONTACT_WIDGET_OPEN_EVENT } from '@/components/contact-widget/events';

/**
 * "Is something wrong with this record?" — opens the contact form with the
 * subject already filled in. The form sends the page address along by itself,
 * so the reader only has to say what is wrong.
 */
export function ReportError({ subject }: { subject: string }) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent(CONTACT_WIDGET_OPEN_EVENT, { detail: { subject: subject.slice(0, 150) } }),
        )
      }
      className="text-sm text-ink-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-link print:hidden"
    >
      Bu kayıtta hata mı var?
    </button>
  );
}
