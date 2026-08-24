'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isLocaleCode } from '@/lib/locales';
import { markDismissed, mayAsk, subscribe } from '@/lib/newsletter';

/** Long enough to have looked at something first, short enough to still be here. */
const DELAY_MS = 12_000;

/**
 * Pages where interrupting is the wrong thing to do.
 *
 * Someone in the bag is partway through buying, someone on the account pages is
 * partway through signing in, and someone on the tracking page is worried about
 * an order that has not arrived. None of them wants a form about a mailing list
 * across the middle of it. (/admin is outside this layout, so it never mounts
 * there at all.)
 */
const NEVER_ON = ['cart', 'account', 'track-order'];

function offLimits(pathname: string | null): boolean {
  const segments = (pathname ?? '').split('/').filter(Boolean);
  // The UK is served from the root with no prefix, so the first segment is a
  // locale on /pk/cart but the page itself on /cart. Drop it only if it is one.
  if (segments.length && isLocaleCode(segments[0])) segments.shift();
  return NEVER_ON.includes(segments[0] ?? '');
}

/**
 * The newsletter offer, as a dialog.
 *
 * It appears once, after a delay, and only for a visitor who has neither
 * subscribed nor turned it down in the last month — see lib/newsletter. The
 * timer does not start until the tab is actually being looked at, or a popup
 * opened in a background tab would spend its whole life unseen and still count
 * as having been shown.
 *
 * It is a real dialog rather than a floating div: Escape closes it, focus moves
 * into it and returns to where it was, Tab cannot wander onto the page behind,
 * and the page behind cannot scroll while it is open.
 */
export function NewsletterPopup() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    // Only a dismissal is recorded here. A successful signup has already been
    // recorded as a subscription, which suppresses the offer permanently.
    if (state !== 'done') markDismissed();
  }, [state]);

  // ---- when to show it -------------------------------------------------
  useEffect(() => {
    if (offLimits(pathname) || !mayAsk()) return;

    let timer: ReturnType<typeof setTimeout> | undefined;

    const start = () => {
      if (timer || document.visibilityState !== 'visible') return;
      timer = setTimeout(() => setOpen(true), DELAY_MS);
    };

    start();
    document.addEventListener('visibilitychange', start);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', start);
    };
  }, [pathname]);

  // ---- modal behaviour -------------------------------------------------
  useEffect(() => {
    if (!open) return;

    returnFocusTo.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const scrollLock = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = scrollLock;
      returnFocusTo.current?.focus?.();
    };
  }, [open, close]);

  if (!open) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    if (!email) return;

    setState('busy');
    const result = await subscribe(email);
    setMessage(result.message);
    setState(result.ok ? 'done' : 'error');
    // Left on screen for a moment so the confirmation is actually read, rather
    // than the dialog vanishing the instant the request comes back.
    if (result.ok) setTimeout(() => setOpen(false), 2600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-onyx/70 p-4 backdrop-blur-[2px] sm:items-center"
      // A click on the backdrop is a dismissal, the same as the close button.
      // Comparing target to currentTarget keeps a drag that began inside the
      // card and ended outside it from counting as one.
      onMouseDown={e => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-popup-title"
        aria-describedby="newsletter-popup-body"
        tabIndex={-1}
        className="relative w-full max-w-md border border-gold-400/40 bg-onyx-soft p-8 text-canvas shadow-2xl outline-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center text-xl leading-none text-canvas/45 transition-colors hover:text-gold-300"
        >
          &times;
        </button>

        <p className="font-sans text-[10px] font-bold tracking-[0.28em] text-gold-400 uppercase">
          Lavion
        </p>
        <h2
          id="newsletter-popup-title"
          className="mt-3 font-serif text-3xl leading-tight text-canvas"
        >
          New pieces, and the day&rsquo;s gold rate
        </h2>
        <p
          id="newsletter-popup-body"
          className="mt-3 font-sans text-sm leading-relaxed text-canvas/60"
        >
          Join our list for new arrivals, bridal collections and bespoke commissions.
          One email at a time, and you can leave whenever you like.
        </p>

        {state === 'done' ? (
          <p role="status" className="mt-6 font-sans text-sm text-gold-300">
            {message}
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-6">
            <label htmlFor="newsletter-popup-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-popup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Your email address"
              className="w-full border border-white/20 bg-transparent px-3 py-3 font-sans text-sm text-canvas placeholder:text-ink-faint focus:border-gold-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={state === 'busy'}
              className="mt-3 w-full border border-gold-400 bg-gold-400 px-4 py-3 font-sans text-[11px] font-bold tracking-[0.18em] text-onyx uppercase transition-colors hover:bg-transparent hover:text-gold-300 disabled:opacity-60"
            >
              {state === 'busy' ? 'Signing you up…' : 'Subscribe'}
            </button>

            {state === 'error' && (
              <p role="alert" className="mt-3 font-sans text-sm text-red-300">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={close}
              className="mt-4 w-full font-sans text-[11px] tracking-[0.12em] text-canvas/35 uppercase transition-colors hover:text-canvas/60"
            >
              No thank you
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
