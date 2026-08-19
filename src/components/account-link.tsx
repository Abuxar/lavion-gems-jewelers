'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useHref } from '@/lib/locale-context';

/**
 * The only part of the header that knows whether anyone is signed in.
 *
 * Keeping it to this one small client component leaves the rest of the header —
 * the brand and the whole collection nav — as server-rendered markup, so a
 * crawler still sees every category link without running any JavaScript.
 */
export function AccountLink() {
  const { user, status } = useAuth();
  const link = useHref();

  // Neither label is right while the refresh cookie is still being checked, and
  // guessing means the wrong one flashes up and then swaps.
  if (status === 'loading') {
    return <span className="font-sans text-[11px] uppercase tracking-[0.18em] text-gold-200/40">&nbsp;</span>;
  }

  return (
    <Link
      href={link(user ? '/account' : '/account/sign-in')}
      className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-200 hover:text-white"
    >
      {user ? user.name.split(' ')[0] : 'Sign in'}
    </Link>
  );
}
