import type { Metadata } from 'next';
import { getAllProducts } from '@/lib/catalogue';
import { WishlistView } from '@/components/wishlist/wishlist-view';

/** One person's saved pieces — nothing here for a search engine to rank. */
export const metadata: Metadata = {
  title: 'Saved pieces',
  robots: { index: false, follow: true }
};

export const revalidate = 3600;

export default async function Page() {
  // The list is stored as bare ids, so the catalogue has to come with the page
  // for those ids to mean anything.
  const products = await getAllProducts();
  return <WishlistView products={products} />;
}
