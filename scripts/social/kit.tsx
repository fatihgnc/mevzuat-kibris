import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';
import { ImageResponse } from 'next/dist/compiled/@vercel/og/index.node.js';

import { BRAND_COLORS } from '@/lib/brand/mark';
import { brandMarkImage } from '@/lib/brand/mark-image';

/** Instagram portrait feed size (4:5) — the tallest a feed post is shown uncropped. */
export const FEED = { width: 1080, height: 1350 };

// Ground and panel tones follow the site's folded-MK identity: the ground is the
// same deep petrol as the share cards and icons, panels sit one step darker.
export const C = {
  teal: BRAND_COLORS.ground,
  tealDeep: '#0D363D',
  accent: '#F2C14E',
  ink: '#FFFFFF',
  muted: '#BFDADB',
  paper: '#F6F3EC',
  paperInk: '#12393C',
  paperMuted: '#5B7476',
  paperRule: '#DDD6C6',
};

export type Theme = 'teal' | 'paper';

// Shared with the site's share cards (src/lib/seo/og-fonts.ts).
const FONT_DIR = path.join(__dirname, '..', '..', 'src', 'assets', 'fonts');

/**
 * Source Sans 3, the site's own face. Fontsource splits it into latin and latin-ext
 * subsets. Satori keeps only one font per name and weight, so latin-ext is registered
 * under its own name and listed as the fallback family — that is where ş and İ live.
 */
const fonts = ([400, 600, 700, 900] as const).flatMap((weight) =>
  (['latin', 'latin-ext'] as const).map((subset) => ({
    name: subset === 'latin' ? 'SS3' : 'SS3 Ext',
    weight,
    style: 'normal' as const,
    data: readFileSync(path.join(FONT_DIR, `ss3-${subset}-${weight}.woff`)),
  })),
);

export async function renderPng(node: ReactNode, size = FEED): Promise<Buffer> {
  const response = new ImageResponse(node as React.ReactElement, { ...size, fonts });
  return Buffer.from(await response.arrayBuffer());
}

/** The folded MK mark; `onPaper` switches to the light-ground palette. */
export function Mark({ height = 40, onPaper = false }: { height?: number; onPaper?: boolean }) {
  return brandMarkImage(height, onPaper ? 'onPaper' : 'onGround');
}

type FrameProps = {
  theme: Theme;
  /** Small caps label top-right, e.g. "MÜNHAL İLANLARI". */
  kicker: string;
  /** Bottom source line; every claim on a card points back to its gazette issue. */
  source: string;
  /** Carousel position, rendered as dots. Omitted on single posts. */
  page?: { index: number; total: number };
  children: ReactNode;
};

export function Frame({ theme, kicker, source, page, children }: FrameProps) {
  const dark = theme === 'teal';
  const fg = dark ? C.ink : C.paperInk;
  const muted = dark ? C.muted : C.paperMuted;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: dark ? C.teal : C.paper,
        color: fg,
        fontFamily: 'SS3, "SS3 Ext"',
        padding: '64px 76px 56px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <Mark onPaper={!dark} />
          <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.01em' }}>Mevzuat Kıbrıs</span>
        </div>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: dark ? C.tealDeep : C.ink,
            background: dark ? C.accent : C.teal,
            padding: '8px 18px',
            borderRadius: 999,
          }}
        >
          {kicker}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, marginTop: 56, paddingBottom: 32 }}>
        {children}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          borderTop: `2px solid ${dark ? 'rgba(255,255,255,0.18)' : C.paperRule}`,
          paddingTop: 26,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 700 }}>
          <span style={{ fontSize: 22, color: muted }}>{source}</span>
          <span style={{ fontSize: 28, fontWeight: 700 }}>mevzuatkibris.com</span>
        </div>
        {page ? (
          <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
            {Array.from({ length: page.total }, (_, i) => (
              <div
                key={i}
                style={{
                  width: i === page.index ? 34 : 12,
                  height: 12,
                  borderRadius: 999,
                  background: i === page.index ? C.accent : dark ? 'rgba(255,255,255,0.3)' : C.paperRule,
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
