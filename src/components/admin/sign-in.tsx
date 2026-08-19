'use client';

import { useState } from 'react';
import { useAdmin } from '@/lib/admin-auth';
import { Button, Field } from '@/components/admin/ui';

export function AdminSignIn() {
  const { signIn } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);

    const result = await signIn(
      String(form.get('username') || ''),
      String(form.get('password') || '')
    );
    if (!result.ok) setError(result.message);
    setBusy(false);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-sans text-sm font-bold tracking-[0.2em] text-gold-300 uppercase">
        Lavion Admin
      </h1>
      <p className="mt-2 text-xs text-canvas/45">
        Staff only. Customer accounts do not sign in here.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
        <Field label="Username" name="username" autoComplete="username" required autoFocus />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <Button kind="primary" type="submit" disabled={busy} className="w-full">
          {busy ? 'Checking…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 text-[11px] leading-relaxed text-canvas/30">
        The session lasts eight hours and is held in this tab only — reloading
        the page signs you out.
      </p>
    </main>
  );
}
