'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth, type User } from '@/lib/auth';
import { useHref } from '@/lib/locale-context';
import { AuthCard, Field, FormError, SubmitButton, TextLink } from '@/components/form';

export function SignInForm() {
  const { api, applySession } = useAuth();
  const router = useRouter();
  const link = useHref();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '');
    const { ok, data } = await api<{ accessToken?: string; user?: User; email?: string }>(
      '/api/auth/login',
      { method: 'POST', body: { email, password: String(form.get('password') || '') } }
    );

    /**
     * An unconfirmed account is not a failed sign-in. The password was right;
     * the server has just sent a fresh code and is waiting for it. Showing the
     * error and stopping would strand someone who has done nothing wrong.
     */
    if (data.code === 'EMAIL_UNVERIFIED') {
      const target = data.email || email;
      router.push(link(`/account/verify?email=${encodeURIComponent(target)}&sent=1`));
      return;
    }

    if (ok && data.accessToken && data.user) {
      applySession(data.accessToken, data.user);
      router.push(link('/account'));
      return;
    }

    setError(data.message || 'We could not sign you in.');
    setBusy(false);
  }

  return (
    <AuthCard
      title="Sign in"
      intro="Access your order history, saved pieces and bespoke commissions."
      footer={
        <>
          <p>
            New here? <TextLink href={link("/account/register")}>Create an account</TextLink>
          </p>
          <p className="mt-2">
            <TextLink href={link("/account/forgot-password")}>Forgotten your password?</TextLink>
          </p>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FormError>{error}</FormError>
        <Field
          label="Email"
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          id="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <SubmitButton busy={busy}>Sign in</SubmitButton>
      </form>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-hairline" />
        <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          or
        </span>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      {/*
        A real link, not a fetch. The provider flow is a redirect the server
        starts by setting a one-time state cookie, and an XHR would follow it
        into Google's page and hand back HTML nobody can use.
      */}
      <a
        href="/api/auth/google"
        className="block w-full border border-hairline bg-canvas-pure px-6 py-3.5 text-center font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink hover:border-gold-400"
      >
        Continue with Google
      </a>
    </AuthCard>
  );
}
