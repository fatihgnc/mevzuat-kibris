'use client';

import { useEffect, useRef, useState } from 'react';

import { ADSENSE_CLIENT } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

type SlotKind = 'in-article' | 'in-feed';

const SIZES: Record<SlotKind, { height: number; note: string }> = {
  // Yükseklikler sabit ve tasarımdan: kutu her zaman aynı yeri kaplıyor,
  // reklam gelse de gelmese de. CLS 0.05 hedefi (spec 13) bunun üzerine kurulu.
  'in-article': { height: 250, note: '728 × 250, yer ayrıldı' },
  'in-feed': { height: 96, note: 'in-feed, sabit yükseklik' },
};

interface AdSlotProps {
  kind: SlotKind;
  slotId?: string;
  className?: string;
}

/**
 * Reklam alanı — spec 14.4.
 *
 * Üç kural burada kodda karşılığını buluyor:
 *   1. İlk ekranda reklam yok  — bu bileşen hiçbir sayfada içerikten önce basılmıyor
 *   2. Yer ayrılmış container  — yükseklik sabit, script gelmeden de kutu orada
 *   3. Lazy load               — IntersectionObserver viewport'a yaklaşınca yüklüyor
 *
 * ADSENSE_CLIENT boşsa (geliştirme, AdSense onayı gelmeden önce) yalnızca
 * ayrılmış kutu görünüyor. Bu, onay öncesi sitenin nasıl görüneceğini de gösteriyor.
 */
export function AdSlot({ kind, slotId, className }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const size = SIZES[kind];

  useEffect(() => {
    const node = ref.current;
    if (!node || !ADSENSE_CLIENT || !slotId) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [slotId]);

  useEffect(() => {
    if (!visible) return;
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch {
      // Reklam yüklenemedi; ayrılmış kutu yerinde kalıyor, sayfa etkilenmiyor.
    }
  }, [visible]);

  return (
    <div
      ref={ref}
      style={{ height: size.height }}
      aria-hidden={!visible}
      className={cn('my-1.5 w-full overflow-hidden', className)}
    >
      {visible && ADSENSE_CLIENT && slotId ? (
        <ins
          className="adsbygoogle block"
          style={{ display: 'block', height: size.height }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slotId}
          data-ad-format={kind === 'in-feed' ? 'fluid' : 'auto'}
          data-full-width-responsive="true"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded border border-dashed border-line-dashed bg-surface-muted">
          <span className="text-2xs text-ink-fainter">Reklam</span>
          <span className="text-sm text-ink-placeholder">{size.note}</span>
        </div>
      )}
    </div>
  );
}
