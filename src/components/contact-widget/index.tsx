'use client';

import { Check, MessageSquareText, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { z } from 'zod';

import { CONTACT_WIDGET_OPEN_EVENT } from './events';

const schema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta adresi girin.'),
  subject: z
    .string()
    .trim()
    .min(1, 'Konu boş olamaz.')
    .max(150, 'Konu en fazla 150 karakter olabilir.'),
  message: z.string().trim().min(1, 'Mesaj boş olamaz.'),
});

/** How far the tab has to be pulled inwards before it counts as opening. */
const PULL_THRESHOLD_PX = 24;
/** Movement below this is still a tap; above it, the dominant axis decides drag vs. pull. */
const GESTURE_SLOP_PX = 8;
/** How far the phone sheet has to be pulled down by its handle to close. */
const SHEET_DISMISS_PX = 90;
/** Where the reader last left the tab: a fraction of the viewport height (phone) or width (desktop). */
const TAB_POSITION_KEY = 'iletisim-sekme-konum';
const TAB_POSITION_KEY_X = 'iletisim-sekme-konum-x';
/** Phone: the tab's default resting place, measured from the bottom of the viewport. */
const TAB_DEFAULT_BOTTOM_PX = 96;
/** Desktop: the panel's width, which decides how far left it may be placed. */
const PANEL_WIDTH_PX = 360;

function isPhone(): boolean {
  return window.matchMedia('(max-width: 767px)').matches;
}

// useLayoutEffect has nothing to measure on the server.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function headerHeight(): number {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 64;
}

/** Keeps a box of the given width inside the viewport, a little off either edge. */
function clampLeft(left: number, width: number): number {
  return Math.min(Math.max(left, 8), Math.max(8, window.innerWidth - width - 8));
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
 * On desktop it is a teal tab sitting on the bottom edge of the window, with
 * its label, and the panel opens right above it; it can be dragged left and
 * right along the edge. On phones it is an icon-only index tab sticking out of
 * the right edge, the panel is a bottom sheet, and the tab can be dragged up
 * and down. On both, the tab stays where it was left.
 *
 * A pull (inwards on a phone, upwards on desktop) does the same as a tap. On
 * iOS and Android a swipe that starts at the screen edge can be taken by the
 * system's own back/forward gesture, so on a phone the tap is the reliable way.
 */
export function ContactWidget({ contactEmail }: { contactEmail: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [adOffset, setAdOffset] = useState(0);

  /** Null until the reader has moved the tab; it then sits where they left it. Phone: top. */
  const [tabTop, setTabTop] = useState<number | null>(null);
  /** Same, for desktop: the tab's left edge. */
  const [tabLeft, setTabLeft] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  /** Desktop only: the panel's spot, right above the tab. */
  const [panelPos, setPanelPos] = useState<{ left: number; bottom: number } | null>(null);
  /** Phone only: how far the sheet is being pulled down by its handle. */
  const [sheetDrag, setSheetDrag] = useState(0);
  const [sheetDragging, setSheetDragging] = useState(false);

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
  const draggedPos = useRef<number | null>(null);
  const sheetStartY = useRef<number | null>(null);
  /** The latest pull distance, read on release — state can still be a render behind. */
  const sheetPull = useRef(0);

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(TAB_POSITION_KEY));
      if (saved > 0 && saved < 1) setTabTop(saved);
      const savedX = Number(localStorage.getItem(TAB_POSITION_KEY_X));
      if (savedX > 0 && savedX < 1) setTabLeft(savedX);
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

  // Sit the desktop panel right above the tab, its right edge lined up with the tab's, before it paints.
  useIsomorphicLayoutEffect(() => {
    if (!open || !window.matchMedia('(min-width: 768px)').matches) return;
    const tab = tabRef.current?.getBoundingClientRect();
    if (!tab) return;
    setPanelPos({
      left: clampLeft(tab.right - PANEL_WIDTH_PX, PANEL_WIDTH_PX),
      bottom: window.innerHeight - tab.top + 8,
    });
  }, [open, tabLeft, adOffset]);

  function close() {
    setOpen(false);
    setError(null);
    setSheetDrag(0);
    setPanelPos(null);
  }

  /** A fresh form each time after a successful send, not the thank-you note again. */
  function openPanel() {
    gesture.current = null;
    if (status === 'sent') {
      setStatus('idle');
      setEmail('');
      setSubject('');
      setMessage('');
    }
    setOpen(true);
  }

  // Other parts of the page (the record page's "Bu kayıtta hata mı var?") open the form with a subject.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const subject = (event as CustomEvent<{ subject?: string }>).detail?.subject;
      openPanel();
      if (subject) setSubject((current) => current || subject);
    };
    window.addEventListener(CONTACT_WIDGET_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CONTACT_WIDGET_OPEN_EVENT, onOpen);
    // openPanel only reads `status`, which is what has to stay current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function endGesture() {
    if (gesture.current?.mode === 'drag' && draggedPos.current != null) {
      try {
        localStorage.setItem(isPhone() ? TAB_POSITION_KEY : TAB_POSITION_KEY_X, String(draggedPos.current));
      } catch {
        // Not remembered across pages, but it still stays put on this one.
      }
    }
    gesture.current = null;
    draggedPos.current = null;
    setDragging(false);
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

    const parsed = schema.safeParse({ email, subject, message });
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
  const tabWidth = () => tabRef.current?.offsetWidth ?? 130;

  const inputClass =
    'w-full rounded border border-line-strong bg-surface px-[11px] py-2.5 text-base text-ink outline-none transition-colors placeholder:text-ink-placeholder focus:border-accent focus:ring-2 focus:ring-accent/15';

  return (
    <div className="print:hidden">
      {/*
        * The tab. Tap it or pull it inwards to open (leftwards on a phone, upwards
        * on desktop); drag it along its edge to move it out of the way. The first
        * few pixels of movement decide which of the two a gesture is, so a drag
        * never opens the panel.
        *
        * Pointer events rather than touch events, so it behaves the same under a
        * mouse as under a finger. Capturing the pointer keeps the drag alive once
        * it leaves the tab's own box, which it can do almost immediately.
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
            grabOffset: isPhone() ? event.clientY - rect.top : event.clientX - rect.left,
            mode: 'pending',
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const g = gesture.current;
          if (!g || g.mode === 'done') return;
          const phone = isPhone();
          // Along the edge the tab slides on, and inwards from it.
          const along = phone ? event.clientY - g.startY : event.clientX - g.startX;
          const inwards = phone ? g.startX - event.clientX : g.startY - event.clientY;

          if (g.mode === 'pending') {
            if (Math.abs(along) > GESTURE_SLOP_PX && Math.abs(along) > Math.abs(inwards)) {
              g.mode = 'drag';
              suppressClick.current = true;
              setDragging(true);
            } else if (inwards > PULL_THRESHOLD_PX && !open) {
              g.mode = 'done';
              suppressClick.current = true;
              // A pull does what a tap would.
              openPanel();
              return;
            } else {
              return;
            }
          }

          if (phone) {
            const top = clampTop(event.clientY - g.grabOffset, tabHeight(), adOffset);
            draggedPos.current = top / window.innerHeight;
            setTabTop(draggedPos.current);
          } else {
            const left = clampLeft(event.clientX - g.grabOffset, tabWidth());
            draggedPos.current = left / window.innerWidth;
            setTabLeft(draggedPos.current);
          }
        }}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        aria-label={open ? 'İletişim penceresini kapat' : 'Bize yazın'}
        aria-expanded={open}
        aria-controls="contact-widget-panel"
        data-dragging={dragging || undefined}
        style={
          {
            '--tab-bottom': TAB_DEFAULT_BOTTOM_PX + adOffset + 'px',
            '--tab-top':
              tabTop == null ? undefined : clampTop(tabTop * window.innerHeight, tabHeight(), adOffset) + 'px',
            '--tab-dbottom': adOffset + 'px',
            '--tab-left':
              tabLeft == null ? undefined : clampLeft(tabLeft * window.innerWidth, tabWidth()) + 'px',
          } as React.CSSProperties
        }
        className={
          'group fixed z-40 flex touch-none select-none items-center ' +
          'shadow-[0_8px_24px_-10px_rgb(0_0_0/0.35)] transition-[transform,box-shadow] duration-300 ease-out ' +
          'cursor-grab data-[dragging]:cursor-grabbing data-[dragging]:shadow-[0_14px_32px_-10px_rgb(0_0_0/0.45)] ' +
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
          /*
           * Desktop: a teal tab standing on the bottom edge of the window.
           */
          'md:bottom-[var(--tab-dbottom)] md:gap-2 md:rounded-t-lg md:bg-accent md:px-4 md:py-2.5 md:text-accent-ink ' +
          'md:animate-tab-rise md:motion-reduce:animate-none md:hover:bg-accent-hover ' +
          (tabLeft == null ? 'md:right-[24px] ' : 'md:left-[var(--tab-left)] ') +
          /*
           * Phone: an index tab on the right edge, paper-coloured with a teal spine.
           */
          'max-md:right-0 max-md:w-[30px] max-md:flex-col max-md:gap-2 max-md:rounded-l-lg max-md:border max-md:border-r-0 max-md:border-line-strong max-md:bg-surface max-md:py-3 max-md:pl-[10px] max-md:pr-[5px] max-md:text-link dark:max-md:bg-surface-muted ' +
          (tabTop == null ? 'max-md:bottom-[var(--tab-bottom)] ' : 'max-md:top-[var(--tab-top)] ') +
          (open ? 'max-md:hidden' : '')
        }
      >
        {/* Phone only: the index-tab edge, a teal spine along the side that faces the page. */}
        <span
          aria-hidden
          className="absolute inset-y-2 left-[3px] w-[3px] rounded-full bg-accent transition-all duration-200 group-hover:inset-y-1.5 md:hidden dark:bg-link"
        />

        {open ? (
          <X size={16} strokeWidth={2.25} aria-hidden className="shrink-0" />
        ) : (
          <MessageSquareText size={15} strokeWidth={2} aria-hidden className="shrink-0" />
        )}

        {/* Desktop only: on a phone the icon stands alone. */}
        <span aria-hidden className="hidden whitespace-nowrap text-sm font-semibold tracking-wide md:block">
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
              ['--panel-left' as string]: (panelPos?.left ?? 0) + 'px',
              ['--panel-bottom' as string]: (panelPos?.bottom ?? 0) + 'px',
              transform: sheetDrag ? `translateY(${sheetDrag}px)` : undefined,
              transition: sheetDragging ? 'none' : 'transform 200ms ease-out',
            }}
            className={
              'fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-y-auto border border-line bg-surface shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] ' +
              'animate-sheet-up rounded-t-[20px] motion-reduce:animate-none ' +
              'md:inset-x-auto md:bottom-[var(--panel-bottom)] md:left-[var(--panel-left)] md:max-h-[calc(100dvh-var(--panel-bottom)-72px)] md:w-[360px] md:animate-panel-in md:rounded-lg ' +
              (panelPos == null ? 'md:invisible' : '')
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
                  {/* Keeps the e-mail address; subject and message start over. */}
                  <button
                    type="button"
                    onClick={() => {
                      setSubject('');
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
                      htmlFor="contact-widget-subject"
                      className="mb-1.5 block text-sm font-semibold text-ink"
                    >
                      Konu
                    </label>
                    <input
                      id="contact-widget-subject"
                      type="text"
                      required
                      maxLength={150}
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="Örn. Kayıt metninde eksik"
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
