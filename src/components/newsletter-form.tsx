'use client';

import { useState } from 'react';

/**
 * Newsletter signup.
 *
 * Posts to the same /api/subscribe the old footer used, so the existing list,
 * the welcome mail and the unsubscribe tokens all keep working — this is a new
 * form in front of an unchanged endpoint, not a new list.
 *
 * The old one wrote its result into the input's *placeholder* and restored it
 * on a timer, which meant the confirmation vanished the moment anyone typed,
 * was never announced to a screen reader, and could be left saying "Thank you
 * for subscribing" over an address that had in fact been rejected. The answer
 * gets its own line here, and the server's own message is shown rather than a
 * guess at what went wrong.
 */
export function NewsletterForm() {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') || '').trim();
    if (!email) return;

    setState('busy');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      // Trust the server's own wording. It distinguishes "already on our list"
      // from "thank you for subscribing", and both are successes.
      setMessage(data.message || 'Thank you for subscribing.');
      setState(data.success ? 'done' : 'error');
    } catch {
      setMessage('We could not reach the server. Please try again.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p role="status" className="mt-4 font-sans text-sm text-gold-300">
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <div className="flex max-w-sm gap-2">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          className="min-w-0 flex-1 border border-white/20 bg-transparent px-3 py-2 font-sans text-sm text-canvas placeholder:text-ink-faint focus:border-gold-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'busy'}
          className="shrink-0 border border-gold-400 px-4 py-2 font-sans text-[11px] font-bold tracking-[0.15em] text-gold-300 uppercase hover:bg-gold-400 hover:text-onyx disabled:opacity-60"
        >
          {state === 'busy' ? 'Sending…' : 'Subscribe'}
        </button>
      </div>
      {state === 'error' && (
        <p role="alert" className="mt-2 font-sans text-sm text-red-300">
          {message}
        </p>
      )}
    </form>
  );
}
