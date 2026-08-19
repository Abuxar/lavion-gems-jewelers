import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from '@/components/auth/password-forms';

export const metadata: Metadata = { title: 'Choose a new password' };

/** The reset token arrives in the query string — see the note on /account/verify. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
