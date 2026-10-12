import { BRAND_COLORS, BRAND_MARK_BOX, BRAND_MARK_PANELS } from '@/lib/brand/mark';

/**
 * The mark for ImageResponse (share cards, /logo.png, the Apple touch icon, the
 * social posts in scripts/social). Those images cannot read CSS tokens, so the
 * colours are literal: "onGround" for the deep-petrol background most of them
 * use, "onPaper" for white or paper grounds.
 */
export function brandMarkImage(height: number, palette: 'onGround' | 'onPaper' = 'onGround') {
  const { x, y, width, height: h } = BRAND_MARK_BOX;
  const colors = BRAND_COLORS[palette];
  return (
    <svg width={(height * width) / h} height={height} viewBox={`${x} ${y} ${width} ${h}`}>
      {BRAND_MARK_PANELS.map((panel, i) => (
        <path key={i} d={panel.d} fill={colors[panel.facet]} />
      ))}
    </svg>
  );
}
