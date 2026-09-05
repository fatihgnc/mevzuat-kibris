'use client';

import { useEffect, useRef, useState } from 'react';

import { ADSENSE_CLIENT } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

type SlotKind = 'in-article' | 'in-feed';

const SIZES: Record<SlotKind, { height: number; note: string }> = {
  // The heights are fixed and come from the design: the box always occupies the same
  // space, ad or no ad. The CLS 0.05 target (spec 13) is built on that.
  'in-article': { height: 250, note: '728 × 250, yer ayrıldı' },
  'in-feed': { height: 96, note: 'in-feed, sabit yükseklik' },
};

interface AdSlotProps {
  kind: SlotKind;
  slotId?: string;
  className?: string;
}

/**
 * The ad slot — spec 14.4.
 *
 * Three rules find their counterpart here in code:
 *   1. No ads above the fold   — this component is never emitted before content on any page
 *   2. Reserved container      — fixed height, the box is there before the script arrives
 *   3. Lazy load               — an IntersectionObserver loads it as it nears the viewport
 *
 * WITH NO AD TO SHOW, NOTHING IS DRAWN — outside development.
 *
 * The dashed "Reklam · 728 × 250, yer ayrıldı" box used to render whenever
 * ADSENSE_CLIENT or the slot id was missing, which is every environment before
 * approval — including the live site. So visitors, and the AdSense reviewer who
 * comes to look at it, met empty labelled boxes down the page and a site that
 * reads as unfinished. Reserving height is for keeping a REAL ad from shifting
 * the layout (CLS, spec 13); reserving it for an ad that cannot arrive just
 * leaves holes.
 *
 * The box survives in development, where it is doing its actual job: showing
 * where the ads will sit while the layout is being worked on.
 */
export function AdSlot({ kind, slotId, className }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const size = SIZES[kind];
  const configured = Boolean(ADSENSE_CLIENT && slotId);

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
      // The ad failed to load; the reserved box stays put and the page is unaffected.
    }
  }, [visible]);

  /*
   * The hooks above run first and unconditionally — an early return placed before
   * them would change the hook order between renders, which React forbids. Both
   * bail out on their own when there is no slot, so this costs nothing.
   */
  if (!configured && process.env.NODE_ENV !== 'development') return null;

  return (
    <div
      ref={ref}
      style={{ height: size.height }}
      aria-hidden={!visible}
      className={cn('my-1.5 w-full overflow-hidden', className)}
    >
      {visible && configured ? (
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
