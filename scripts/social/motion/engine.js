/*
 * Tiny deterministic motion toolkit for frame-by-frame rendering.
 *
 * Nothing here runs on a clock: every scene exposes renderAt(t) and the renderer
 * drives t frame by frame, so any frame can be reproduced exactly. All helpers are
 * pure functions of time.
 */
(function () {
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  /** Normalised progress of t through [start, start + dur]. */
  const prog = (t, start, dur) => clamp((t - start) / dur);

  const ease = {
    linear: (x) => x,
    expoOut: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    expoIn: (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
    expoInOut: (x) =>
      x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2,
    cubicOut: (x) => 1 - Math.pow(1 - x, 3),
    quartInOut: (x) => (x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2),
    backOut: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  };

  /**
   * Damped spring from 0 to 1, evaluated at `elapsed` seconds. Underdamped by default
   * so things land with a small, physical overshoot instead of an easing-curve stop.
   */
  function spring(elapsed, { freq = 2.2, damping = 0.55 } = {}) {
    if (elapsed <= 0) return 0;
    const w = 2 * Math.PI * freq;
    const wd = w * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * w * elapsed) * (Math.cos(wd * elapsed) + ((damping * w) / wd) * Math.sin(wd * elapsed));
  }

  /** Style for a line that slides up out of an overflow-hidden mask. */
  function maskIn(t, start, dur = 0.7) {
    const p = ease.expoOut(prog(t, start, dur));
    return `translateY(${(1 - p) * 115}%) skewY(${(1 - p) * 7}deg)`;
  }

  /**
   * Odometer markup: one overflow-hidden column per digit, each holding the digit
   * strip several times so leading columns can spin through more turns.
   */
  function odometer(el, value) {
    const digits = String(value).split('');
    el.classList.add('odo');
    el.innerHTML = digits
      .map(() => `<span class="odo-col"><span class="odo-strip">${'0123456789'.repeat(4).split('').map((d) => `<span>${d}</span>`).join('')}</span></span>`)
      .join('');
    el._digits = digits.map(Number);
  }

  function odometerAt(el, t, start, dur = 1.1) {
    const cols = el.querySelectorAll('.odo-strip');
    const n = el._digits.length;
    el._digits.forEach((d, i) => {
      // Leading columns spin further and settle last: reads as one number counting up.
      const turns = n - 1 - i;
      const target = d + 10 * turns;
      const p = ease.expoOut(prog(t, start + i * 0.06, dur + (n - 1 - i) * 0.12));
      cols[i].style.transform = `translateY(${-p * target}em)`;
    });
  }

  /** Draws an SVG stroke on: every drawable needs pathLength="1". */
  function drawOn(svg, t, start, dur = 0.7, stagger = 0.08) {
    svg.querySelectorAll('[pathLength]').forEach((el, i) => {
      const p = ease.quartInOut(prog(t, start + i * stagger, dur));
      el.style.strokeDashoffset = String(1 - p);
    });
  }

  /** Wraps every word of `el` in an inline-block span for staggered entrances. */
  function splitWords(el) {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    return Array.from(el.querySelectorAll('.w'));
  }

  function wordsIn(words, t, start, stagger = 0.03, dur = 0.55) {
    words.forEach((w, i) => {
      const p = ease.expoOut(prog(t, start + i * stagger, dur));
      w.style.opacity = String(p);
      w.style.transform = `translateY(${(1 - p) * 26}px)`;
    });
  }

  /** Shrinks an element's font size until it fits `maxWidth` on one line. */
  function fitWidth(el, maxWidth, minSize = 40) {
    let size = parseFloat(getComputedStyle(el).fontSize);
    while (el.scrollWidth > maxWidth && size > minSize) {
      size -= 2;
      el.style.fontSize = size + 'px';
    }
  }

  /** A handful of pre-baked grain tiles; cycling them per frame reads as live film grain. */
  function grainTiles(count = 6, size = 256) {
    const tiles = [];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < count; k++) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(size, size);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.floor(rand() * 255);
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      tiles.push(c.toDataURL('image/png'));
    }
    return tiles;
  }

  window.M = { clamp, lerp, prog, ease, spring, maskIn, odometer, odometerAt, drawOn, splitWords, wordsIn, fitWidth, grainTiles };
})();
