import { BRAND_MARK_BOX, BRAND_MARK_PANELS, type BrandFacet } from '@/lib/brand/mark';

/*
 * Colours come from the --brand-* tokens in globals.css, so the mark follows the
 * theme switch like every other surface. A `fill` attribute cannot hold var(),
 * hence the inline style.
 */
const FILL: Record<BrandFacet, string> = {
  mShade: 'hsl(var(--brand-m-shade))',
  mLit: 'hsl(var(--brand-m-lit))',
  kShade: 'hsl(var(--brand-k-shade))',
  kLit: 'hsl(var(--brand-k-lit))',
};

const { x, y, width, height } = BRAND_MARK_BOX;

/** The folded MK mark. Decorative by default: the site name sits next to it. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`${x} ${y} ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {BRAND_MARK_PANELS.map((panel, i) => (
        <path key={i} d={panel.d} style={{ fill: FILL[panel.facet] }} />
      ))}
    </svg>
  );
}
