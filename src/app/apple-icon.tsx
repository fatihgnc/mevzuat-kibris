import { ImageResponse } from 'next/og';

import { BRAND_COLORS } from '@/lib/brand/mark';
import { brandMarkImage } from '@/lib/brand/mark-image';

/**
 * Home-screen icon for iOS (apple-touch-icon). Opaque, because iOS fills any
 * transparency with black, and the mark kept inside the middle two thirds so
 * the rounded mask iOS applies never reaches it.
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
        {brandMarkImage(66)}
      </div>
    ),
    size,
  );
}
