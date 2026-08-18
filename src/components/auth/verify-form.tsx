'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, type User } from '@/lib/auth';
import { AuthCard, FormError, FormNote, TextLink } from '@/components/form';

const RESEND_LABEL = 'Send a new code';

export function VerifyForm() {
  const { api, applySession } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const email = params?.get('email') || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(
    params?.get('sent') ? 'We have sent a six-digit code to your inbox.' : null
  );
  const [busy, setBusy] = useState(false);

  const [resendBusy, setResendBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Tick the resend cooldown down to zero, then re-enable the button. */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submitCode = useCallback(
    async (value: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setNote(null);

      const { ok, data } = await api<{ accessToken?: string; user?: User }>(
        '/api/auth/verify-otp',
        { method: 'POST', body: { email, code: value } }
      );

      if (ok && data.accessToken && data.user) {
        applySession(data.accessToken, data.user);
        router.push('/account');
        return;
      }

      // A rejected code is cleared rather than left in place, so the next
      // attempt starts from an empty field instead of needing to be edited.
      setCode('');
      setError(data.message || 'That code is not right.');
      setBusy(false);
      inputRef.current?.focus();
    },
    [api, applySession, busy, email, router]
  );

  function onChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    // Six digits is the whole code; making someone press a button as well is
    // a step that carries no information.
    if (digits.length === 6) void submitCode(digits);
  }

  async function onResend() {
    if (resendBusy || cooldown > 0) return;
    setResendBusy(true);
    setError(null);

    const { ok, data } = await api<{ retryAfter?: number }>('/api/auth/resend-otp', {
      method: 'POST',
      body: { email }
    });

    setNote(data.message || 'If that address still needs confirming, a new code is on its way.');
    // The server names the wait when it declines; otherwise assume the full one.
    setCooldown(!ok && data.retryAfter ? data.retryAfter : 60);
    setResendBusy(false);
  }

  if (!email) {
    return (
      <AuthCard
        title="Confirm your email"
        intro="We need to know which address to confirm."
        footer={
          <p>
            <TextLink href="/account/sign-in">Go to sign in</TextLink>
          </p>
        }
      >
        <FormError>This link is missing an email address.</FormError>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Confirm your email"
      intro={`Enter the six-digit code we sent to ${email}.`}
      footer={
        <p>
          Wrong address? <TextLink href="/account/register">Start again</TextLink>
        </p>
      }
    >
      <FormError>{error}</FormError>
      <FormNote>{note}</FormNote>

      <label
        htmlFor="otp-code"
        className="mb-2 block font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-faint"
      >
        Confirmation code
      </label>
      <input
        id="otp-code"
        ref={inputRef}
        value={code}
        onChange={e => onChange(e.target.value)}
        disabled={busy}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        aria-label="Six-digit confirmation code"
        /* The trailing letter-space is counted in the element's width, so the
           digits sit visibly left of centre without an equal indent to correct it. */
        className="w-full border border-hairline bg-canvas-pure py-4 text-center font-mono text-2xl tracking-[14px] indent-[14px] text-ink outline-none focus:border-gold-400 disabled:opacity-60"
      />

      <button
        type="button"
        onClick={onResend}
        disabled={resendBusy || cooldown > 0}
        className="mt-6 w-full border border-hairline px-6 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink-muted hover:border-gold-400 disabled:opacity-60"
      >
        {/* A button that goes silent while it works reads as broken, at exactly
            the moment someone is already worried the code has not arrived. */}
        {resendBusy ? 'Sending…' : cooldown > 0 ? `${RESEND_LABEL} (${cooldown}s)` : RESEND_LABEL}
      </button>
    </AuthCard>
  );
}
