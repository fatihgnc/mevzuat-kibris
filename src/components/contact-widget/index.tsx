'use client';

import { Check, MessageSquareText, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { z } from 'zod';

const schema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta adresi girin.'),
  message: z.string().trim().min(1, 'Mesaj boş olamaz.'),
});

/** How far the tab has to be pulled inwards before it counts as opening. */
const PULL_THRESHOLD_PX = 24;
/** Movement below this is still a tap; above it, the dominant axis decides drag vs. pull. */
const GESTURE_SLOP_PX = 8;
/** How far the phone sheet has to be pulled down by its handle to close. */
const SHEET_DISMISS_PX = 90;
/** Where the reader last left the tab, as a fraction of the viewport height. */
const TAB_POSITION_KEY = 'iletisim-sekme-konum';
/** The tab's default resting place, measured from the bottom of the viewport. */
const TAB_DEFAULT_BOTTOM_PX = 96;
/** Phone: how long a slid-out tab waits for its second tap before tucking back in. */
const TAB_COLLAPSE_MS = 4000;

function isPhone(): boolean {
  return window.matchMedia('(max-width: 767px)').matches;
}

// useLayoutEffect has nothing to measure on the server.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function headerHeight(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
}

/** Keeps a box of the given height between the sticky header and the bottom edge (or an anchor ad). */
function clampTop(top: number, height: number, adOffset: number): number {
  const min = headerHeight() + 8;
  const max = window.innerHeight - height - 16 - adOffset;
  return Math.min(Math.max(top, min), Math.max(min, max));
}

/**
 * Finds a displayed AdSense bottom anchor ad and returns how much of the bottom
 * of the viewport it covers, so the tab can sit above it instead of on it.
 */
function anchorAdOffset(): number {
  const ad = document.querySelector<HTMLElement>('ins.adsbygoogle[data-anchor-status="displayed"]');
  if (!ad) return 0;
  const rect = ad.getBoundingClientRect();
  // A top anchor does not concern a tab near the bottom.
  if (rect.top < window.innerHeight / 2) return 0;
  return Math.max(0, window.innerHeight - rect.top);
}

/**
 * The always-available contact entry point.
 *
 * The only way to reach us used to be a footer link to /iletisim, and nobody
 * scrolls a 100-page record to the footer to report a typo in it. This puts a
 * short form one tap away on every page and sends the page's own address along
 * with the message, so "which record?" never has to be asked.
 *
 * It is drawn as an index tab sticking out of the page's right edge — the
 * archive's own paper, border and teal, rather than a chat bubble borrowed from
 * a support widget. On desktop the tab carries its label and the panel opens
 * right beside it; on phones the tab is icon-only and the panel is a bottom
 * sheet. On both, the tab can be dragged up and down the edge and stays where
 * it was left.
 *
 * On phones the tab rests tucked in, showing only its spine: the first tap
 * slides it out, the second opens the sheet, and without a second tap it
 * tucks itself back in after a few seconds. A pull does the same as a tap: on
 * iOS and Android a swipe that starts at the screen edge can be taken by the
 * system's own back/forward gesture, so a pull alone would be unreliable.
 */
export function ContactWidget({ contactEmail }: { contactEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [adOffset, setAdOffset] = useState(0);

  /** Null until the reader has moved the tab; it then sits where they left it. */
  const [tabTop, setTabTop] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Desktop only: the panel's top edge, lined up with the tab. */
  const [panelTop, setPanelTop] = useState<number | null>(null);
  /** Phone only: how far the sheet is being pulled down by its handle. */
  const [sheetDrag, setSheetDrag] = useState(0);
  const [sheetDragging, setSheetDragging] = useState(false);
  /** Phone only: false while the tab is tucked in with just its spine showing. */
  const [expanded, setExpanded] = useState(false);

  const tabRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const gesture = useRef<{
    startX: number;
    startY: number;
    grabOffset: number;
    mode: 'pending' | 'drag' | 'done';
  } | null>(null);
  /** A drag ends with a pointerup that the browser still turns into a click. */
  const suppressClick = useRef(false);
  /** The position a drag last reached, read on release — state can still be a render behind. */
  const draggedTop = useRef<number | null>(null);
  const sheetStartY = useRef<number | null>(null);
  /** The latest pull distance, read on release — state can still be a render behind. */
  const sheetPull = useRef(0);
  const collapseTimer = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(TAB_POSITION_KEY));
      if (saved > 0 && saved < 1) setTabTop(saved);
    } catch {
      // No storage (private window, blocked site data): the tab starts at its default.
    }
  }, []);

  // The anchor ad is injected by a script we do not control, whenever it likes.
  useEffect(() => {
    const update = () => setAdOffset(anchorAdOffset());
    update();
    const timer = window.setInterval(update, 2000);
    window.addEventListener('resize', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    emailRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setError(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Line the desktop panel up with the tab, before it paints.
  useIsomorphicLayoutEffect(() => {
    if (!open || !window.matchMedia('(min-width: 768px)').matches) return;
    const tab = tabRef.current?.getBoundingClientRect();
    const panel = panelRef.current;
    if (!tab || !panel) return;
    const height = panel.offsetHeight;
    setPanelTop(clampTop(tab.top + tab.height / 2 - height / 2, height, adOffset));
  }, [open, status, error, tabTop, adOffset]);

  function cancelCollapse() {
    if (collapseTimer.current != null) window.clearTimeout(collapseTimer.current);
    collapseTimer.current = null;
  }

  /** Slides the phone tab out, and back in again if the second tap never comes. */
  function expand() {
    setExpanded(true);
    cancelCollapse();
    collapseTimer.current = window.setTimeout(() => setExpanded(false), TAB_COLLAPSE_MS);
  }

  useEffect(() => cancelCollapse, []);

  function close() {
    // The phone tab comes back tucked in, not still slid out from before.
    setExpanded(false);
    setOpen(false);
    setError(null);
    setSheetDrag(0);
    setPanelTop(null);
  }

  /** A fresh form each time after a successful send, not the thank-you note again. */
  function openPanel() {
    gesture.current = null;
    cancelCollapse();
    if (status === 'sent') {
      setStatus('idle');
      setEmail('');
      setMessage('');
    }
    setOpen(true);
  }

  function endGesture() {
    if (gesture.current?.mode === 'drag' && draggedTop.current != null) {
      try {
        localStorage.setItem(TAB_POSITION_KEY, String(draggedTop.current));
      } catch {
        // Not remembered across pages, but it still stays put on this one.
      }
    }
    const dragged = gesture.current?.mode === 'drag';
    gesture.current = null;
    draggedTop.current = null;
    setDragging(false);
    // Moving a slid-out tab restarts its wait rather than tucking it in mid-drag.
    if (dragged && expanded) expand();
    // Only the click the browser may send right after this gesture is swallowed.
    if (suppressClick.current) {
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 400);
    }
  }

  function endSheetDrag(dismiss: boolean) {
    sheetStartY.current = null;
    sheetPull.current = 0;
    setSheetDragging(false);
    if (dismiss) close();
    else setSheetDrag(0);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsed = schema.safeParse({ email, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Formu kontrol edin.');
      return;
    }

    setError(null);
    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          page: window.location.pathname + window.location.search,
          website,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? 'Mesaj gönderilemedi.');
        setStatus('idle');
        return;
      }
      setStatus('sent');
    } catch {
      setError('Mesaj gönderilemedi, bağlantınızı kontrol edip tekrar deneyin.');
      setStatus('idle');
    }
  }

  const tabHeight = () => tabRef.current?.offsetHeight ?? 48;

  const inputClass =
    'w-full rounded border border-line-strong bg-surface px-[11px] py-2.5 text-base text-ink outline-none transition-colors placeholder:text-ink-placeholder focus:border-accent focus:ring-2 focus:ring-accent/15';

  return (
    <div className="print:hidden">
      {/*
        * The tab. Tap it or pull it inwards to open; drag it up or down to move
        * it out of the way. The first few pixels of movement decide which of the
        * two a gesture is, so a vertical drag never opens the panel.
        *
        * Pointer events rather than touch events, so it behaves the same under a
        * mouse as under a finger. Capturing the pointer keeps the drag alive once
        * it leaves the tab's own narrow box, which it does almost immediately.
        */}
      <button
        ref={tabRef}
        type="button"
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          if (open) close();
          // Phone: the first tap only slides the tab out; the second opens the sheet.
          else if (isPhone() && !expanded) expand();
          else openPanel();
        }}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          // A pull that opened the panel may never have produced its click.
          suppressClick.current = false;
          const rect = event.currentTarget.getBoundingClientRect();
          gesture.current = {
            startX: event.clientX,
            startY: event.clientY,
            grabOffset: event.clientY - rect.top,
            mode: 'pending',
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const g = gesture.current;
          if (!g || g.mode === 'done') return;
          const dx = g.startX - event.clientX;
          const dy = event.clientY - g.startY;

          if (g.mode === 'pending') {
            if (Math.abs(dy) > GESTURE_SLOP_PX && Math.abs(dy) > Math.abs(dx)) {
              g.mode = 'drag';
              suppressClick.current = true;
              setDragging(true);
              cancelCollapse();
            } else if (dx > PULL_THRESHOLD_PX && !open) {
              g.mode = 'done';
              suppressClick.current = true;
              // A pull does what a tap would: slide out first, then open.
              if (isPhone() && !expanded) expand();
              else openPanel();
              return;
            } else {
              return;
            }
          }

          const top = clampTop(event.clientY - g.grabOffset, tabHeight(), adOffset);
          draggedTop.current = top / window.innerHeight;
          setTabTop(draggedTop.current);
        }}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        aria-label={open ? 'İletişim penceresini kapat' : 'Bize yazın'}
        aria-expanded={open}
        aria-controls="contact-widget-panel"
        data-dragging={dragging || undefined}
        data-collapsed={!expanded || undefined}
        style={
          tabTop == null
            ? { bottom: TAB_DEFAULT_BOTTOM_PX + adOffset }
            : { top: clampTop(tabTop * window.innerHeight, tabHeight(), adOffset) }
        }
        className={
          'group fixed right-0 z-40 flex touch-none select-none flex-col items-center gap-2 rounded-l-lg border border-r-0 border-line-strong bg-surface py-3 pl-[10px] pr-[5px] text-link ' +
          'shadow-[0_8px_24px_-10px_rgb(0_0_0/0.35)] transition-[transform,box-shadow] duration-300 ease-out ' +
          'md:animate-tab-peek md:motion-reduce:animate-none dark:bg-surface-muted ' +
          /*
           * Phone: tucked in, only the border and spine (11px) stay on screen.
           * An invisible strip to its left widens what a finger can hit, since
           * 11px alone is too narrow to tap reliably.
           */
          'max-md:data-[collapsed]:translate-x-[19px] max-md:data-[collapsed]:shadow-none ' +
          "max-md:before:absolute max-md:before:inset-y-0 max-md:before:-left-3 max-md:before:w-3 max-md:before:content-[''] " +
          'cursor-grab data-[dragging]:cursor-grabbing data-[dragging]:shadow-[0_14px_32px_-10px_rgb(0_0_0/0.45)] ' +
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
          'w-[30px] md:w-[36px] ' +
          (open ? 'max-md:hidden' : '')
        }
      >
        {/* The index-tab edge: a teal spine along the side that faces the page. */}
        <span
          aria-hidden
          className="absolute inset-y-2 left-[3px] w-[3px] rounded-full bg-accent transition-all duration-200 group-hover:inset-y-1.5 dark:bg-link"
        />

        {/* Phone only: on desktop the label says it already. */}
        {open ? (
          <X size={16} strokeWidth={2.25} aria-hidden className="shrink-0 md:hidden" />
        ) : (
          <MessageSquareText size={15} strokeWidth={2} aria-hidden className="shrink-0 md:hidden" />
        )}

        {/* Desktop: the label, reading bottom-to-top like a file tab. */}
        <span
          aria-hidden
          className="hidden rotate-180 whitespace-nowrap text-sm font-semibold tracking-wide text-ink [writing-mode:vertical-rl] md:block"
        >
          {open ? 'Kapat' : 'Bize yazın'}
        </span>

      </button>

      {open ? (
        <>
          {/* Phone only: dims the page behind the sheet; tapping it closes. */}
          <div
            aria-hidden
            onClick={close}
            className="fixed inset-0 z-40 animate-fade-in bg-ink/40 backdrop-blur-[1px] md:hidden dark:bg-black/60"
          />

          <div
            ref={panelRef}
            id="contact-widget-panel"
            role="dialog"
            aria-modal="false"
            aria-labelledby="contact-widget-title"
            style={{
              ['--panel-top' as string]: (panelTop ?? 0) + 'px',
              transform: sheetDrag ? `translateY(${sheetDrag}px)` : undefined,
              transition: sheetDragging ? 'none' : 'transform 200ms ease-out',
            }}
            className={
              'fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto border border-line bg-surface shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] ' +
              'animate-sheet-up rounded-t-[20px] motion-reduce:animate-none ' +
              'md:bottom-auto md:left-auto md:right-[46px] md:top-[var(--panel-top)] md:w-[360px] md:animate-panel-in md:rounded-lg ' +
              (panelTop == null ? 'md:invisible' : '')
            }
          >
            {/* Phone: the sheet's handle — pull it down to dismiss. */}
            <div
              aria-hidden
              onPointerDown={(event) => {
                sheetStartY.current = event.clientY;
                setSheetDragging(true);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (sheetStartY.current == null) return;
                sheetPull.current = Math.max(0, event.clientY - sheetStartY.current);
                setSheetDrag(sheetPull.current);
              }}
              onPointerUp={() => endSheetDrag(sheetPull.current > SHEET_DISMISS_PX)}
              onPointerCancel={() => endSheetDrag(false)}
              className="flex cursor-grab touch-none justify-center pb-1 pt-2.5 md:hidden"
            >
              <span className="h-1 w-10 rounded-full bg-line-strong" />
            </div>

            <div className="relative p-5 max-md:pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-md:pt-2">
              {/* Same teal spine as the tab, so the panel reads as the tab opened out. */}
              <span
                aria-hidden
                className="absolute left-0 top-5 hidden h-8 w-[3px] rounded-r-full bg-accent md:block dark:bg-link"
              />

              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="contact-widget-title"
                    className="m-0 text-xl font-bold tracking-tight text-ink"
                  >
                    Bize yazın
                  </h2>
                  <p className="m-0 mt-1.5 text-sm leading-snug text-ink-muted">
                    Hata, eksik kayıt, öneri ya da soru. Bulunduğunuz sayfanın bağlantısı
                    mesajınıza kendiliğinden eklenir.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Kapat"
                  className="-mr-1.5 -mt-1 shrink-0 rounded p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <X size={18} aria-hidden />
                </button>
              </div>

              {status === 'sent' ? (
                <div className="flex flex-col items-start gap-4">
                  <div className="flex w-full items-start gap-3 rounded-md border border-line bg-surface-muted p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
                      <Check size={16} strokeWidth={2.5} aria-hidden />
                    </span>
                    <p className="m-0 text-base leading-snug text-ink-body">
                      <strong className="font-semibold text-ink">Mesajınız ulaştı, teşekkürler.</strong>{' '}
                      Yedi gün içinde yanıtlıyoruz.
                    </p>
                  </div>
                  {/* Keeps the e-mail address; only the message starts over. */}
                  <button
                    type="button"
                    onClick={() => {
                      setMessage('');
                      setStatus('idle');
                    }}
                    className="rounded border border-line-strong px-4 py-2 text-base font-semibold text-ink transition-colors hover:border-accent hover:text-link"
                  >
                    Bir mesaj daha gönder
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
                  <div>
                    <label
                      htmlFor="contact-widget-email"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      E-posta
                    </label>
                    <input
                      ref={emailRef}
                      id="contact-widget-email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Size dönebilmemiz için"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-widget-message"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Mesaj
                    </label>
                    <textarea
                      id="contact-widget-message"
                      required
                      rows={4}
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      className={inputClass + ' resize-none'}
                    />
                  </div>

                  {/* Honeypot — off-screen and out of the tab order; people never see it. */}
                  <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
                    <label htmlFor="contact-widget-website">Web sitesi</label>
                    <input
                      id="contact-widget-website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(event) => setWebsite(event.target.value)}
                    />
                  </div>

                  {error ? (
                    <p className="m-0 rounded border border-danger-border bg-danger px-3 py-2 text-sm text-danger-ink">
                      {error}
                    </p>
                  ) : null}

                  <div className="mt-1 flex items-center justify-between gap-3">
                    <button
                      type="submit"
                      disabled={status === 'sending'}
                      className="rounded bg-accent px-5 py-2.5 text-base font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
                    >
                      {status === 'sending' ? 'Gönderiliyor…' : 'Gönder'}
                    </button>
                    <a
                      href={'mailto:' + contactEmail}
                      className="text-sm text-ink-muted hover:text-link"
                    >
                      ya da e-posta atın
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
