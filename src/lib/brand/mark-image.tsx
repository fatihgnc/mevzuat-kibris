import { BRAND_COLORS, BRAND_MARK_BOX, BRAND_MARK_PANELS } from '@/lib/brand/mark';

/**
 * The mark for ImageResponse (share cards, /logo.png, the Apple touch icon).
 * Those images cannot read CSS tokens, so the colours are literal: the
 * "on ground" set, meant for the deep-petrol background they all use.
 */
export function brandMarkImage(height: number) {
  const { x, y, width, height: h } = BRAND_MARK_BOX;
  return (
    <svg width={(height * width) / h} height={height} viewBox={`${x} ${y} ${width} ${h}`}>
      {BRAND_MARK_PANELS.map((panel, i) => (
        <path key={i} d={panel.d} fill={BRAND_COLORS.onGround[panel.facet]} />
      ))}
    </svg>
  );
}
