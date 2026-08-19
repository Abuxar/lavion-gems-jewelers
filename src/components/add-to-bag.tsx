'use client';

import { useState } from 'react';
import type { Product } from '@/lib/catalogue';
import { useCart } from '@/lib/cart';

/**
 * The one interactive part of an otherwise static product page.
 *
 * The product itself is passed down as already-rendered server data rather than
 * fetched here, so the page stays a prerendered document that a crawler reads
 * in full — only this button needs JavaScript.
 */
export function AddToBag({ product, full = false }: { product: Product; full?: boolean }) {
  const { add } = useCart();
  const [said, setSaid] = useState<{ ok: boolean; message: string } | null>(null);

  const outOfStock = product.stock <= 0;

  return (
    <div className={full ? 'mt-8' : 'mt-4'}>
      <button
        type="button"
        disabled={outOfStock}
        onClick={() => {
          const result = add(product);
          setSaid(result);
          // The confirmation is transient on purpose: it answers "did that
          // work?" and then stops competing with the page.
          setTimeout(() => setSaid(null), 4000);
        }}
        className="w-full bg-onyx px-6 py-3.5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-gold-200 transition-colors hover:bg-charcoal disabled:cursor-not-allowed disabled:opacity-50"
      >
        {outOfStock ? 'Out of stock' : 'Add to bag'}
      </button>
      {said && (
        <p
          role="status"
          className={`mt-3 font-sans text-xs ${said.ok ? 'text-gold-600' : 'text-red-800'}`}
        >
          {said.message}
        </p>
      )}
    </div>
  );
}
