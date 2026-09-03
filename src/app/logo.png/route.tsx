import { ImageResponse } from 'next/og';

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
 * The mark is the one in src/app/icon.svg: three stacked bars, the middle one in
 * the accent yellow. Kept square and on the brand ground, which is what a logo
 * slot expects — the wide share card is a different image and lives in
 * opengraph-image.tsx.
 *
 * If the two ever diverge, icon.svg is the original.
 */
export const runtime = 'edge';

const SIZE = 512;

export function GET() {
  const bar = (width: number, left: number, top: number, color: string) => ({
    position: 'absolute' as const,
    left,
    top,
    width,
    height: 64,
    borderRadius: 32,
    background: color,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: '#1E5F63',
        }}
      >
        <div style={bar(224, 96, 128, '#FFFFFF')} />
        <div style={bar(256, 160, 224, '#F2C14E')} />
        <div style={bar(288, 96, 320, '#FFFFFF')} />
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
