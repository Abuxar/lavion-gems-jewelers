'use client';

import Link from 'next/link';
import { useWishlist } from '@/lib/wishlist';

/** The saved-pieces count in the header. Silent until storage has been read. */
export function SavedLink() {
  const { ids, ready } = useWishlist();
  return (
    <Link
      href="/wishlist"
      className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-200 hover:text-white"
    >
      Saved{ready && ids.length > 0 ? ` (${ids.length})` : ''}
    </Link>
  );
}
