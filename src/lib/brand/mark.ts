/**
 * The site mark: a folded M whose right leg doubles as the stem of a folded K.
 *
 * One source for every place the mark is drawn in code — the header, the share
 * cards, /logo.png and the Apple touch icon. src/app/icon.svg and favicon.ico
 * (the favicon) carry the same geometry as static files; keep them in step.
 *
 * Each letter is a ribbon of two facets, a shaded one and a lit one. Panels are
 * listed in drawing order: a later panel folds OVER an earlier one, so the order
 * is part of the drawing and the list must not be sorted or merged by colour.
 */

export type BrandFacet = 'mShade' | 'mLit' | 'kShade' | 'kLit';

/** Drawing area of the panels: x 0…62, y 14…48 (a 62×34 box). */
export const BRAND_MARK_BOX = { x: 0, y: 14, width: 62, height: 34 } as const;

export const BRAND_MARK_PANELS: ReadonlyArray<{ facet: BrandFacet; d: string }> = [
  { facet: 'mShade', d: 'M0 14L10 14L10 48L0 48Z' },
  { facet: 'mLit', d: 'M0 14L10 14L24 41L14 41Z' },
  { facet: 'mShade', d: 'M14 41L24 41L38 14L28 14Z' },
  { facet: 'mLit', d: 'M28 14L38 14L38 48L28 48Z' },
  { facet: 'kShade', d: 'M38.8 27.2L48.8 27.2L62 48L52 48Z' },
  { facet: 'kLit', d: 'M28 38L38 38L62 14L52 14Z' },
];

/**
 * Raw colours for images rendered outside the page (ImageResponse cannot read
 * the CSS tokens). `onGround` is for the deep-petrol share cards and icons:
 * there the M turns to paper so it does not sink into the background.
 * `onPaper` is the light-theme header palette, for white or paper grounds.
 */
export const BRAND_COLORS = {
  ground: '#134A53',
  onGround: { mShade: '#CFE3E6', mLit: '#F7F5EF', kShade: '#C9952E', kLit: '#F2C14E' },
  onPaper: { mShade: '#134A53', mLit: '#3E95A3', kShade: '#C9952E', kLit: '#F2C14E' },
} as const;
