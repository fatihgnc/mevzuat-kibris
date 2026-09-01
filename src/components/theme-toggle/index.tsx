'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * The light/dark theme switch — in the header.
 *
 * The theme is carried by the `data-theme` attribute on
 * `document.documentElement`, and because every colour comes from CSS variables a
 * single line flips everything (globals.css).
 *
 * THIS is not what sets the initial value: an inline script in the layout sets the
 * attribute before the page paints. This component only reads and changes that
 * decision. In the reverse order the page would paint light first and then jump to
 * dark.
 *
 * The `mounted` guard prevents a hydration mismatch: the server cannot know which
 * theme is selected (localStorage and the OS preference exist only in the
 * browser), so on the first render an empty box of the same size is emitted
 * instead of the icon and the layout does not jump.
 */
const STORAGE_KEY = 'tema';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    );
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;

    /*
     * The choice persists. The try/catch is essential: in a private window, or with
     * site data blocked, writing to localStorage throws and would take the theme
     * switch down with it.
     */
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // If it could not be stored, the theme still applies in this tab; carry on silently.
    }
  }

  const label = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';

  return (
    <button
      type='button'
      onClick={toggle}
      aria-label={label}
      title={label}
      /*
       * aria-label rather than aria-pressed: this is not a toggle but a switch
       * between two states. Telling a screen reader "what will happen if you press
       * this" is clearer than "is dark theme on".
       */
      /*
       * The size has to match the "Ara" button next to it exactly, and that button
       * takes its height from the search INPUT (the form is `flex`, alignment
       * stretch). The input's box is `border px-3 py-2 text-md`, i.e.:
       *
       *     2px border + 1rem vertical padding + 15px x 1.55 line height
       *
       * The calc below is exactly that; the number was not invented but derived
       * from the same tokens. The 2px term is THE INPUT's border — this button has
       * no border of its own, but it has to be counted for the total height to
       * match the input. `aspect-square` takes the width from the height.
       *
       * The border was REMOVED (the product owner's decision): next to the solid
       * teal "Ara" button, a framed box read as a different kind of object and
       * looked misaligned even with identical measurements. Feedback now comes from
       * a background colour on hover.
       *
       * `self-stretch` was tried and gives the right height, but the width stays at
       * content size (19px): a height that comes from stretching does not count as
       * definite for `aspect-ratio`. With an explicit height the ratio works.
       */
      className='inline-flex aspect-square h-[42px] shrink-0 items-center justify-center rounded p-0 text-ink-muted transition-colors hover:text-ink'
    >
      {/*
        The icon grew with the box. At a 36px box the icon was 17px (47%); once the
        box was matched to "Ara" at 41px, a 17px icon was lost inside it and the
        control looked like an empty frame. 20px preserves the same ratio (48%).
      */}
      {mounted ? (
        theme === 'dark' ? (
          <Sun size={20} aria-hidden />
        ) : (
          <Moon size={20} aria-hidden />
        )
      ) : null}
    </button>
  );
}
