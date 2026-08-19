'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useHref } from '@/lib/locale-context';
import { AuthCard, SubmitButton, TextLink } from '@/components/form';

export function AccountView() {
  const { user, status, signOut } = useAuth();
  const router = useRouter();
  const link = useHref();

  useEffect(() => {
    // Only once the refresh cookie has had its turn. Redirecting while the
    // status is still 'loading' would bounce a signed-in visitor to the sign-in
    // page on every reload, because a reload always starts with no token.
    if (status === 'anonymous') router.replace(link('/account/sign-in'));
  }, [status, router, link]);

  if (status !== 'authenticated' || !user) {
    return (
      <AuthCard title="Your account">
        <p className="font-sans text-sm text-ink-muted">
          {status === 'loading' ? 'Checking your session…' : 'Please sign in.'}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={`Hello, ${user.name}`}
      intro="Your details, as we hold them."
      footer={
        <p>
          Need to change your password?{' '}
          <TextLink href={link("/account/forgot-password")}>Reset it here</TextLink>
        </p>
      }
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-y border-hairline py-6 font-sans text-sm">
        <dt className="text-ink-faint">Name</dt>
        <dd className="text-ink">{user.name}</dd>
        <dt className="text-ink-faint">Email</dt>
        <dd className="text-ink">{user.email}</dd>
        {user.city && (
          <>
            <dt className="text-ink-faint">City</dt>
            <dd className="text-ink">{user.city}</dd>
          </>
        )}
        <dt className="text-ink-faint">Email confirmed</dt>
        <dd className="text-ink">{user.emailVerified ? 'Yes' : 'Not yet'}</dd>
        {user.providers && user.providers.length > 0 && (
          <>
            <dt className="text-ink-faint">Signs in with</dt>
            <dd className="text-ink capitalize">{user.providers.join(', ')}</dd>
          </>
        )}
      </dl>

      <form
        className="mt-8"
        onSubmit={async e => {
          e.preventDefault();
          await signOut();
          router.push(link('/'));
        }}
      >
        <SubmitButton>Sign out</SubmitButton>
      </form>
    </AuthCard>
  );
}
