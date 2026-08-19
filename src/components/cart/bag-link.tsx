'use client';

import Link from 'next/link';
import { useHref } from '@/lib/locale-context';
import { useCart } from '@/lib/cart';

/** The bag count in the header. Renders nothing until storage has been read. */
export function BagLink() {
  const { count, ready } = useCart();
  const link = useHref();
  return (
    <Link
      href={link("/cart")}
      className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-200 hover:text-white"
    >
      Bag{ready && count > 0 ? ` (${count})` : ''}
    </Link>
  );
}
