'use client';

import { useEffect, useRef, useState } from 'react';

import { MaskedText } from '@/components/masked-text';
import type { Token } from '@/types/record';

interface RawTitleProps {
  tokens: Token[];
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
 * Masking applies here too: boilerplate faint, distinctive dark. The copied text is
 * the full, unmasked form.
 */
export function RawTitle({ tokens, plainTitle, label = 'Gazetedeki başlık, olduğu gibi' }: RawTitleProps) {
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
      <p className="m-0 text-md leading-[1.55]">
        <MaskedText tokens={tokens} selectAll />
      </p>
    </div>
  );
}
