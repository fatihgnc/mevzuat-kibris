import { ImageResponse } from 'next/og';

import { BRAND_COLORS } from '@/lib/brand/mark';
import { brandMarkImage } from '@/lib/brand/mark-image';

/**
 * The Organization logo, as a raster — spec 8.3.
 *
 * WHY NOT JUST POINT THE SCHEMA AT `/icon.svg`. Google's Organization logo
 * requirements ask for a raster image; an SVG is liable to be ignored, which would
 * leave the `logo` property present but unusable — worse than useless, because it
 * reads as satisfied. The site is otherwise a text product with no raster assets
 * (spec 14.3), so rather than commit a binary, the same mark is drawn here and
 * rendered to PNG on request.
 *
 * The mark is the folded MK from src/lib/brand/mark.ts, in its on-ground colours.
 * Kept square and on the brand ground, which is what a logo slot expects — the
 * wide share card is a different image and lives in opengraph-image.tsx.
 */
export const runtime = 'edge';

const SIZE = 512;

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_COLORS.ground,
        }}
      >
        {brandMarkImage(200)}
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
