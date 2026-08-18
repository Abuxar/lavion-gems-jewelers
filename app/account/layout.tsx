import type { Metadata } from 'next';

/**
 * Nothing under /account belongs in a search index.
 *
 * These pages are either a form only the owner should reach or a screen that is
 * meaningless without a session, and an indexed sign-in page competes with the
 * pages that actually sell something. The old site had no equivalent — its
 * auth lived in a modal, so there was nothing to exclude.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
