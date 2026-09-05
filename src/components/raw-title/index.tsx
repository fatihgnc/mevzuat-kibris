'use client';

import { useEffect, useRef, useState } from 'react';

import type { Token } from '@/types/record';

interface RawTitleProps {
  /** Kept for the callers' sake; the box itself renders one uniform tone (see below). */
  tokens?: Token[];
  /** The plain text to copy — the tokens joined, unmasked. */
  plainTitle: string;
  label?: string;
}

/**
 * The "the gazette's title, as it is" box — artboards 1a/1g.
 *
 * Spec 3.8 rule 5: the raw title is always on the page and copyable, never hidden
 * behind a disclosure. The user will use this text in official correspondence, so
 * it is both selectable in one click (select-all) and has a copy button.
 *
 * Masking does NOT apply here — see the note by the paragraph. The copied text is
 * the full, unmasked form.
 */
export function RawTitle({ plainTitle, label = 'Gazetedeki başlık, olduğu gibi' }: RawTitleProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(plainTitle);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Without clipboard access the text can still be selected with select-all.
    }
  }

  return (
    <div className="mt-6 rounded-r border border-l-[3px] border-line border-l-line-strong bg-surface-muted px-4 py-3.5">
      <div className="mb-[7px] flex items-baseline justify-between gap-4">
        <span className="text-xs text-ink-muted">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="select-none text-xs font-semibold text-accent hover:text-ink"
        >
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      {/*
        * ONE colour here, deliberately — and this is the one place masking comes
        * off. Spec 3.8's weighting (boilerplate faint, distinctive dark) earns
        * its keep in lists, where the eye is scanning many titles for the one it
        * wants. This box is not a list: it says "the gazette's title, as it is",
        * and a title printed in two tones is not how the gazette printed it. The
        * masked rendering stays on cards and search results.
        */}
      <p className="m-0 cursor-text select-all text-md leading-[1.55] text-ink-body">
        {plainTitle}
      </p>
    </div>
  );
}
