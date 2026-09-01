import { tokenClass } from '@/lib/search/highlight';
import { cn } from '@/lib/utils';
import type { Token } from '@/types/record';

interface MaskedTextProps {
  tokens: Token[];
  /**
   * `mask`  — a raw gazette title: boilerplate faint, distinctive dark (artboard 1a).
   * `quote` — a body excerpt: no masking, only the match in yellow (artboard 1b).
   */
  variant?: 'mask' | 'quote';
  className?: string;
  /** Copyability: one click should select the whole text in the raw title box. */
  selectAll?: boolean;
}

/**
 * Renders tokenised text. A single <span> tree; there is no
 * dangerouslySetInnerHTML anywhere — the tokens come from ts_headline delimiters or
 * from maskTitle, and both are plain text.
 */
export function MaskedText({ tokens, variant = 'mask', className, selectAll }: MaskedTextProps) {
  if (!tokens.length) return null;

  return (
    <span className={cn(selectAll && 'cursor-text select-all', className)}>
      {tokens.map((token, index) => (
        <span key={index} className={tokenClass(token.lvl, variant)}>
          {token.t}
        </span>
      ))}
    </span>
  );
}
