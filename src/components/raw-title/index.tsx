'use client';

import { useEffect, useRef, useState } from 'react';

import { MaskedText } from '@/components/masked-text';
import type { Token } from '@/types/record';

interface RawTitleProps {
  tokens: Token[];
  /** Kopyalanacak düz metin — jetonların birleşimi, maskesiz. */
  plainTitle: string;
  label?: string;
}

/**
 * "Gazetedeki başlık, olduğu gibi" kutusu — artboard 1a/1g.
 *
 * Spec 3.8 kural 5: ham başlık her zaman sayfada ve kopyalanabilir, açılır
 * kutuda saklanmaz. Kullanıcı bu metni resmî yazışmada kullanacak, o yüzden
 * hem tek tıkla seçilebiliyor (select-all) hem kopyala düğmesi var.
 *
 * Maskeleme burada da uygulanıyor: kalıp soluk, ayırt edici koyu. Kopyalanan
 * metin maskesiz tam hâli.
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
      // Pano erişimi yoksa metin zaten select-all ile seçilebiliyor.
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
