import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyForm } from '@/components/auth/verify-form';

export const metadata: Metadata = { title: 'Confirm your email' };

/**
 * The form reads the address out of the query string, and a component that
 * reads search params cannot be prerendered — its output depends on a URL that
 * does not exist at build time. The boundary lets the rest of the page render
 * statically and this part fill in on arrival.
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
