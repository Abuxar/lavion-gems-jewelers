import type { Metadata } from 'next';
import { getLocale } from '@/lib/locales';
import { getFx } from '@/lib/money';
import { CartView } from '@/components/cart/cart-view';

/**
 * A bag is one person's, and never the same page twice — there is nothing here
 * for a search engine to index and nothing it could usefully rank.
 */
export const metadata: Metadata = {
  title: 'Your bag',
  robots: { index: false, follow: true }
};

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  // Rates are read here rather than in the bag itself: the bag runs in the
  // browser, and the rate document is only reachable from the server.
  const [fx, active] = [await getFx(), getLocale(locale)];
  return <CartView currency={active.currency} fx={fx} />;
}
