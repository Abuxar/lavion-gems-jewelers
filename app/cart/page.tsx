import type { Metadata } from 'next';
import { CartView } from '@/components/cart/cart-view';

/**
 * A bag is one person's, and never the same page twice — there is nothing here
 * for a search engine to index and nothing it could usefully rank.
 */
export const metadata: Metadata = {
  title: 'Your bag',
  robots: { index: false, follow: true }
};

export default function Page() {
  return <CartView />;
}
