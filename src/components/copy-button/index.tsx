'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * A copy control that is an ICON, for sitting inside a field rather than beside
 * it.
 *
 * `CopyLink` is the worded version and stays where it is — in the record page's
 * action row, where it is one of three labelled actions and the word is what
 * makes it findable. Here the label would be redundant: it sits against a feed
 * address, which is a thing you copy and nothing else.
 *
 * The confirmation is a word, not a changed icon. "Kopyalandı" says what
 * happened; a tick that replaces a clipboard for two seconds asks the reader to
 * infer it, and at 13px the two shapes are barely distinguishable anyway.
 */
export function CopyButton({
  value,
  label = 'Kopyala',
  className,
}: {
  value: string;
  /** Accessible name — the button shows an icon, so this is all a reader gets. */
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /*
       * No clipboard — an insecure origin, or permission refused. The address is
       * on screen and selectable, so the user still has a way; failing silently
       * is better than an error about an API they did not ask for.
       */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink',
        className,
      )}
    >
      {copied ? (
        <span className="text-2xs font-semibold text-accent">Kopyalandı</span>
      ) : (
        <ClipboardIcon />
      )}
    </button>
  );
}

function ClipboardIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[15px] w-[15px]"
    >
      <rect x="9" y="9" width="11" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
