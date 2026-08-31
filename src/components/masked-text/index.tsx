import { tokenClass } from '@/lib/search/highlight';
import { cn } from '@/lib/utils';
import type { Token } from '@/types/record';

interface MaskedTextProps {
  tokens: Token[];
  /**
   * `mask`  — ham gazete başlığı: kalıp soluk, ayırt edici koyu (artboard 1a).
   * `quote` — gövde alıntısı: maskeleme yok, yalnızca eşleşme sarı (artboard 1b).
   */
  variant?: 'mask' | 'quote';
  className?: string;
  /** Kopyalanabilirlik: ham başlık kutusunda tek tıkla tüm metin seçilsin. */
  selectAll?: boolean;
}

/**
 * Jetonlanmış metni basar. Tek bir <span> ağacı; hiçbir yerde
 * dangerouslySetInnerHTML yok — jetonlar ts_headline ayraçlarından ya da
 * maskTitle'dan geliyor, ikisi de düz metin.
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
