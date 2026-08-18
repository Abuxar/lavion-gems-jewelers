'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import {
  AuthCard,
  Field,
  FormError,
  FormNote,
  SubmitButton,
  TextLink
} from '@/components/form';

export function ForgotPasswordForm() {
  const { api } = useAuth();
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const { ok, data } = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: String(form.get('email') || '') }
    });

    if (ok) {
      /**
       * The same answer whether or not the address has an account. Confirming
       * it would turn this form into a way to test who shops here — the same
       * reason registration stopped saying "that email is taken".
       */
      setNote(data.message || 'If that address has an account, a reset link is on its way.');
    } else {
      setError(data.message || 'We could not send a reset link.');
    }
    setBusy(false);
  }

  return (
    <AuthCard
      title="Reset your password"
      intro="Tell us your email address and we will send you a link."
      footer={
        <p>
          Remembered it? <TextLink href="/account/sign-in">Sign in</TextLink>
        </p>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <FormError>{error}</FormError>
        <FormNote>{note}</FormNote>
        <Field label="Email" id="email" type="email" autoComplete="email" required />
        <SubmitButton busy={busy}>Send reset link</SubmitButton>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm() {
  const { api } = useAuth();
  const router = useRouter();
  const token = useSearchParams()?.get('token') || '';
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') || '');
    if (password !== String(form.get('confirm') || '')) {
      setError('Those two passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);

    const { ok, data } = await api('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password }
    });

    if (ok) {
      // The server signs every other session out on a reset, so there is no
      // session to carry forward — they sign in again with the new password.
      router.push('/account/sign-in?reset=1');
      return;
    }

    setError(data.message || 'That reset link is no longer valid.');
    setBusy(false);
  }

  if (!token) {
    return (
      <AuthCard
        title="Choose a new password"
        footer={
          <p>
            <TextLink href="/account/forgot-password">Request a new link</TextLink>
          </p>
        }
      >
        <FormError>This link is missing its token. Please request a new one.</FormError>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" intro="This link can be used once.">
      <form onSubmit={onSubmit} noValidate>
        <FormError>{error}</FormError>
        <Field
          label="New password"
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <Field
          label="Confirm new password"
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <SubmitButton busy={busy}>Save new password</SubmitButton>
      </form>
    </AuthCard>
  );
}
