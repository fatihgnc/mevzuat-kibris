'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

import { turkishLower } from '@/lib/text/turkish-lower';
import { cn } from '@/lib/utils';

const HIGHLIGHT = 'record-body-search';
const HIGHLIGHT_ACTIVE = 'record-body-search-active';

/**
 * "Metinde ara" — a Ctrl+F scoped to the karar body, for the long, table-heavy
 * records (cadastral schedules running thousands of rows) where the browser's
 * own find bar makes you scroll blind to see how many hits there are or where
 * you are among them.
 *
 * Always rendered as the full bar, never an icon that expands into one — an
 * earlier version toggled between a small button and this bar, which meant
 * the row's own size (and everything below it) changed the moment you
 * clicked. A fixed-size bar has nothing to toggle, so there is nothing to
 * shift.
 *
 * It is NOT `position: sticky` itself, and the CLONE below isn't either —
 * both were tried. Pinned to the heading row alone, `sticky` only stays put
 * while ITS OWN PARENT box is on screen, and that row is one line tall — it
 * unstuck itself within a few pixels of scrolling. A `sticky` CLONE portaled
 * into the body text (so its parent really is tall) fixed that, but
 * `createPortal` always APPENDS to its target, so the clone landed as the
 * body's very LAST child — for a long record that is far down the page, and
 * `sticky` does not engage until scrolling reaches an element's own normal
 * position, so the clone would not visibly stick until you had already
 * scrolled nearly to the end of the text it was meant to help you search.
 *
 * The fix is a second copy, `position: fixed`, shown only while needed.
 * `rowRef` watches the ORIGINAL bar (inline, normal flow, scrolls with the
 * page like the heading beside it) via `IntersectionObserver`; the moment it
 * scrolls out of view, a CLONE — same query, same matches, same handlers,
 * just its own `<input>` — appears, fixed at the top of the viewport. Since
 * visibility is driven by that observer rather than by `sticky`'s own
 * scroll-position threshold, DOM order stops mattering — the clone can be a
 * plain sibling here, no portal needed. Its horizontal offset is measured
 * against the body's own right edge (`document.documentElement.clientWidth`,
 * not `window.innerWidth` — the latter includes the scrollbar, which
 * `position: fixed`'s containing block does not, and using it measured 15px
 * too far left).
 *
 * Highlighting uses the CSS Custom Highlight API (`CSS.highlights`) rather
 * than wrapping matches in `<mark>` elements. The body is rendered by
 * react-markdown; injecting elements into ITS output would fight React on
 * the next render (React owns that tree, not us). The Highlight API paints
 * ranges purely via CSS, with no DOM mutation, so there is nothing for React
 * to reconcile away.
 *
 * Unsupported browsers (older Firefox) get no bar at all rather than one
 * that looks like it should highlight and silently doesn't — see
 * `supported` below.
 */
export function InBodySearch({ targetId }: { targetId: string }) {
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const rangesRef = useRef<Range[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowOffscreen, setRowOffscreen] = useState(false);
  const [bodyOnscreen, setBodyOnscreen] = useState(false);
  const [cloneRight, setCloneRight] = useState(16);
  // The clone is for staying inside the body while it's on screen, not for
  // following you past it — once the body itself has scrolled away (past its
  // last row, or back above its first), there's nothing left to search here.
  const cloneVisible = rowOffscreen && bodyOnscreen;
  /*
   * Feature-detected AFTER mount, not during render: the server has no
   * `window`, so a render-time check renders `null` there and something
   * else on the client's first pass — a hydration mismatch React treats as
   * fatal (it throws, the whole boundary fails to render). Starting at
   * `false` and flipping in an effect keeps the first client render
   * identical to the server's, then reveals the bar right after.
   */
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported('Highlight' in window && 'highlights' in CSS);
  }, []);

  /*
   * A search result links here as `?q=<what was searched>`. Prefill the bar with
   * it and jump to the first match once, so the reader lands on the phrase that
   * brought them here instead of hunting for it in a long body. Read from
   * `window.location` in an effect rather than `useSearchParams`: the record page
   * is prerendered, and the hook would opt it out of that (or need a Suspense
   * boundary) for a value only the browser ever needs.
   */
  const scrollToFirstMatch = useRef(false);
  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('q')?.trim();
    if (!initial) return;
    scrollToFirstMatch.current = true;
    setQuery(initial.slice(0, 200));
  }, []);

  // Tracks the ORIGINAL bar — `threshold: 0`, not some fraction, because a
  // half-visible original is still usable and a clone appearing on top of it
  // would just be two bars.
  //
  // `rootMargin`'s negative top shrinks the observer's own notion of "the
  // viewport" by the sticky header's height. Without it, the row counted as
  // still "intersecting" for as long as any sliver of its box was
  // geometrically above y=0 — including the ~71px already hidden BEHIND the
  // header, which sits on top of it at a higher z-index. IntersectionObserver
  // only computes geometric overlap; it has no idea the header is visually
  // occluding that space. The clone was appearing ~70px later than the
  // original actually disappeared from view because of exactly that gap.
  useEffect(() => {
    if (!supported || !rowRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRowOffscreen(entry ? !entry.isIntersecting : false),
      { threshold: 0, rootMargin: `-${getHeaderHeight()}px 0px 0px 0px` },
    );
    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [supported]);

  // Tracks the BODY TEXT itself — the clone has no reason to exist once
  // there is no body left on screen to search within (scrolled past its
  // last row into "kayıtta geçenler"/related records, or back up above the
  // record entirely).
  useEffect(() => {
    if (!supported) return;
    const container = document.getElementById(targetId);
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => setBodyOnscreen(entry ? entry.isIntersecting : false),
      { threshold: 0, rootMargin: `-${getHeaderHeight()}px 0px 0px 0px` },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [supported, targetId]);

  // Lines the clone's right edge up with the body's own, while it is shown.
  useEffect(() => {
    if (!cloneVisible) return;

    function updatePosition() {
      const container = document.getElementById(targetId);
      if (!container) return;
      setCloneRight(document.documentElement.clientWidth - container.getBoundingClientRect().right);
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [cloneVisible, targetId]);

  // Finds every match in the target container and (re)paints the highlight
  // layer. Runs on query change, not on every keystroke's navigation
  // (activeIndex) — that part only moves the "active" pointer.
  useEffect(() => {
    if (!supported) return;
    const container = document.getElementById(targetId);
    if (!container) return;

    const needle = turkishLower(query.trim());
    if (!needle) {
      CSS.highlights.delete(HIGHLIGHT);
      CSS.highlights.delete(HIGHLIGHT_ACTIVE);
      rangesRef.current = [];
      setMatchCount(0);
      setActiveIndex(0);
      return;
    }

    const ranges: Range[] = [];
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    // eslint-disable-next-line no-cond-assign
    while ((node = walker.nextNode())) {
      const text = node.textContent ?? '';
      const haystack = turkishLower(text);
      let from = 0;
      for (;;) {
        const index = haystack.indexOf(needle, from);
        if (index === -1) break;
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + needle.length);
        ranges.push(range);
        from = index + needle.length;
      }
    }

    rangesRef.current = ranges;
    setMatchCount(ranges.length);
    setActiveIndex(0);
    CSS.highlights.set(HIGHLIGHT, new Highlight(...ranges));
    CSS.highlights.set(
      HIGHLIGHT_ACTIVE,
      new Highlight(...(ranges[0] ? [ranges[0]] : [])),
    );
    // Deliberately no scroll here — typing must not move the page. Only
    // `goNext`/`goPrev` (an explicit next/prev press) scrolls; see those. The
    // one exception is the query that arrived in the URL, handled just below.
    if (scrollToFirstMatch.current) {
      scrollToFirstMatch.current = false;
      if (ranges[0]) scrollToRange(ranges[0]);
    }
  }, [query, supported, targetId]);

  // Repaints which match is "active" whenever it changes — including from
  // `goNext`/`goPrev` below, which is also what does the scrolling, imperatively
  // (not from this effect: reacting to every `activeIndex` change here would
  // fire on typing too, since a new query resets it to 0).
  useEffect(() => {
    if (!supported) return;
    const range = rangesRef.current[activeIndex];
    if (!range) return;
    CSS.highlights.set(HIGHLIGHT_ACTIVE, new Highlight(range));
  }, [activeIndex, supported]);

  useEffect(() => {
    if (!supported) return;
    return () => {
      CSS.highlights.delete(HIGHLIGHT);
      CSS.highlights.delete(HIGHLIGHT_ACTIVE);
    };
  }, [supported]);

  if (!supported) return null;

  function goNext() {
    const ranges = rangesRef.current;
    if (!ranges.length) return;
    const next = (activeIndex + 1) % ranges.length;
    setActiveIndex(next);
    scrollToRange(ranges[next]!);
  }

  function goPrev() {
    const ranges = rangesRef.current;
    if (!ranges.length) return;
    const prev = (activeIndex - 1 + ranges.length) % ranges.length;
    setActiveIndex(prev);
    scrollToRange(ranges[prev]!);
  }

  function clear(focusRef?: RefObject<HTMLInputElement | null>) {
    setQuery('');
    focusRef?.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>, focusRef?: RefObject<HTMLInputElement | null>) {
    if (event.key === 'Escape') {
      clear(focusRef);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) goPrev();
      else goNext();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      goNext();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      goPrev();
    }
  }

  const shared = { query, setQuery, matchCount, activeIndex, goPrev, goNext, clear, onKeyDown };

  return (
    <>
      <div ref={rowRef}>
        <Bar {...shared} inputRef={inputRef} />
      </div>
      {cloneVisible ? (
        <div
          style={{ right: cloneRight + 'px' }}
          className="fixed top-[calc(var(--header-h)+12px)] z-10 w-fit"
        >
          <Bar {...shared} className="shadow-md" />
        </div>
      ) : null}
    </>
  );
}

interface BarProps {
  query: string;
  setQuery: (value: string) => void;
  matchCount: number;
  activeIndex: number;
  goPrev: () => void;
  goNext: () => void;
  clear: (focusRef?: RefObject<HTMLInputElement | null>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, focusRef?: RefObject<HTMLInputElement | null>) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}

/** The bar's own markup, shared between the original and its sticky clone — see the module comment for why there are two. */
function Bar({ query, setQuery, matchCount, activeIndex, goPrev, goNext, clear, onKeyDown, inputRef, className }: BarProps) {
  const ownRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? ownRef;

  return (
    <div className={cn('ml-auto flex w-fit shrink-0 items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1.5', className)}>
      <SearchIcon className="shrink-0 text-ink-faint" />
      <input
        ref={ref}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => onKeyDown(event, ref)}
        placeholder="Metinde ara"
        autoComplete="off"
        className="w-32 min-w-0 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-placeholder sm:w-44"
      />
      {query ? (
        <span className="shrink-0 text-sm tabular-nums text-ink-faint">
          {matchCount > 0 ? activeIndex + 1 + '/' + matchCount : '0 sonuç'}
        </span>
      ) : null}
      <button
        type="button"
        onClick={goPrev}
        disabled={!matchCount}
        aria-label="Önceki eşleşme"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronIcon direction="up" />
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={!matchCount}
        aria-label="Sonraki eşleşme"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronIcon direction="down" />
      </button>
      {query ? (
        <button
          type="button"
          onClick={() => clear(ref)}
          aria-label="Aramayı temizle"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink"
        >
          <CloseIcon />
        </button>
      ) : null}
    </div>
  );
}

/*
 * Lands the match near the TOP of the viewport, not centered — `block:
 * 'center'` was tried and put the match in the middle of the screen, which
 * hides most of the surrounding sentence above it; landing near the top
 * leaves the rest of the paragraph visible below, which is what you
 * actually want when reading a match in context. Plain `scrollIntoView`
 * isn't enough on its own: `block: 'start'` would tuck the match right
 * under the sticky header, so the offset backs it off by the header's own
 * height plus a little breathing room.
 */
function scrollToRange(range: Range) {
  const el = range.startContainer.parentElement;
  if (!el) return;

  const top = el.getBoundingClientRect().top + window.scrollY - getHeaderHeight() - 24;
  window.scrollTo({ top, behavior: 'smooth' });
}

/** `--header-h` as a number — the sticky header's height, read fresh each call. */
function getHeaderHeight(): number {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h'));
  return Number.isFinite(value) ? value : 0;
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={cn('h-[18px] w-[18px]', className)}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', direction === 'up' && 'rotate-180')}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-4 w-4"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
