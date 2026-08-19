'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth, type User } from '@/lib/auth';
import { useHref } from '@/lib/locale-context';
import { AuthCard, Field, FormError, SubmitButton, TextLink } from '@/components/form';

export function RegisterForm() {
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

    const { ok, data } = await api<{
      needsVerification?: boolean;
      email?: string;
      accessToken?: string;
      user?: User;
    }>('/api/auth/register', {
      method: 'POST',
      body: {
        name: String(form.get('name') || ''),
        email,
        city: String(form.get('city') || ''),
        password: String(form.get('password') || '')
      }
    });

    /**
     * The ordinary outcome: no session, a code in the inbox, and the same reply
     * whether or not the address was already taken. The server answers that way
     * on purpose, so this form must not try to distinguish the two either.
     */
    if (ok && data.needsVerification) {
      router.push(link(`/account/verify?email=${encodeURIComponent(data.email || email)}&sent=1`));
      return;
    }

    /** Only reached when the code could not be sent and the account was opened anyway. */
    if (ok && data.accessToken && data.user) {
      applySession(data.accessToken, data.user);
      router.push(link('/account'));
      return;
    }

    setError(data.message || 'We could not create your account.');
    setBusy(false);
  }

  return (
    <AuthCard
      title="Create an account"
      intro="We will email you a six-digit code to confirm your address."
      footer={
        <p>
          Already registered? <TextLink href={link("/account/sign-in")}>Sign in</TextLink>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FormError>{error}</FormError>
        <Field label="Full name" id="name" autoComplete="name" required />
        <Field label="Email" id="email" type="email" autoComplete="email" required />
        <Field label="City" id="city" autoComplete="address-level2" />
        <Field
          label="Password"
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
    </AuthCard>
  );
}
