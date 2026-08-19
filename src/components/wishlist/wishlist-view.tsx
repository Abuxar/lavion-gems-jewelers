'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/catalogue';
import { isEmbeddedImage } from '@/lib/images';
import { productHandle } from '@/lib/handles';
import { useWishlist } from '@/lib/wishlist';
import { useHref } from '@/lib/locale-context';
import { AddToBag } from '@/components/add-to-bag';

/**
 * The saved pieces, resolved.
 *
 * The catalogue arrives as a prop from the server rather than being fetched
 * here: it is fourteen records, the page already renders on the server, and
 * doing it this way means no request has to leave the browser before the list
 * can be drawn.
 */
export function WishlistView({ products }: { products: Product[] }) {
  const { ids, ready, remove } = useWishlist();
  const link = useHref();

  if (!ready) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-24">
        <p className="font-sans text-sm text-ink-muted">Fetching your saved pieces…</p>
      </main>
    );
  }

  const byId = new Map(products.map(p => [p.id, p]));
  const saved = ids.map(id => byId.get(id)).filter((p): p is Product => Boolean(p));

  /**
   * An id with no product behind it means the piece has been removed from the
   * catalogue since it was saved. Dropping it quietly is right — there is
   * nothing to show and nothing to buy — but it must not take the page down.
   */
  const missing = ids.length - saved.length;

  if (saved.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-serif text-4xl font-light text-ink">Nothing saved yet</h1>
        <p className="mt-4 font-sans text-sm text-ink-muted">
          {missing > 0
            ? 'The pieces you saved are no longer in the collection.'
            : 'Tap “Save” on a piece to keep it here.'}
        </p>
        <Link
          href={link("/")}
          className="mt-10 inline-block bg-onyx px-8 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200"
        >
          Browse the collections
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-serif text-4xl font-light text-ink">Saved pieces</h1>
      <p className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
        {saved.length === 1 ? '1 piece' : `${saved.length} pieces`}
      </p>

      <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {saved.map(p => (
          <li key={p.id} className="flex flex-col border border-hairline bg-canvas-pure">
            <Link href={link(`/product/${productHandle(p)}`)} className="block">
              <div className="relative aspect-square overflow-hidden bg-canvas-soft">
                <Image
                  src={p.img}
                  alt={p.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  unoptimized={isEmbeddedImage(p.img)}
                  className="object-cover"
                />
              </div>
            </Link>
            <div className="flex flex-1 flex-col p-5">
              <Link href={link(`/product/${productHandle(p)}`)}>
                <h2 className="font-serif text-lg text-ink hover:text-gold-600">{p.name}</h2>
              </Link>
              {p.desc && (
                <p className="mt-1 font-sans text-xs leading-relaxed text-ink-muted">{p.desc}</p>
              )}
              <div className="mt-auto">
                <AddToBag product={p} />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="mt-3 font-sans text-xs text-ink-faint underline hover:text-red-800"
                >
                  Remove from saved
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {missing > 0 && (
        <p className="mt-10 font-sans text-xs text-ink-faint">
          {missing === 1
            ? 'One saved piece is no longer in the collection and is not shown.'
            : `${missing} saved pieces are no longer in the collection and are not shown.`}
        </p>
      )}
    </main>
  );
}
