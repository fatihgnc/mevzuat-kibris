import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Source Sans 3 for the share cards — the site's own face, so a card reads like
 * the page it links to. Without it ImageResponse falls back to a face that has
 * no bold, and every heading came out regular.
 *
 * The files are the Fontsource woff subsets in src/assets/fonts, shared with the
 * social post kit (scripts/social). Satori takes woff but not woff2, and keeps one
 * font per name and weight, so latin-ext is registered under its own name and
 * listed second in OG_FONT_FAMILY — that is where ş, ğ and İ live.
 *
 * Read from process.cwd(): the app runs from the repository root (`next start`),
 * the same way the build does. Loaded once per server process.
 */
export const OG_FONT_FAMILY = 'SS3, "SS3 Ext"';

const WEIGHTS = [400, 600, 700] as const;

let cache: ReturnType<typeof load> | undefined;

function load() {
  const dir = join(process.cwd(), 'src', 'assets', 'fonts');
  return WEIGHTS.flatMap((weight) =>
    (['latin', 'latin-ext'] as const).map((subset) => ({
      name: subset === 'latin' ? 'SS3' : 'SS3 Ext',
      weight,
      style: 'normal' as const,
      data: readFileSync(join(dir, `ss3-${subset}-${weight}.woff`)),
    })),
  );
}

export function ogFonts() {
  cache ??= load();
  return cache;
}
