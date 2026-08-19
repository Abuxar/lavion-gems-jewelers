'use client';

import { useWishlist } from '@/lib/wishlist';

/**
 * The heart, as a labelled button.
 *
 * It says "Save" or "Saved" rather than relying on a filled-in icon alone: an
 * outline versus a solid shape is not a difference everyone can see, and a
 * button whose entire meaning is its colour tells a screen reader nothing.
 */
export function SaveButton({ id, className = '' }: { id: string; className?: string }) {
  const { has, toggle, ready } = useWishlist();
  const saved = ready && has(id);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => toggle(id)}
      className={`font-sans text-[11px] font-semibold uppercase tracking-[0.18em] ${
        saved ? 'text-gold-600' : 'text-ink-faint hover:text-gold-600'
      } ${className}`}
    >
      {saved ? '♥ Saved' : '♡ Save'}
    </button>
  );
}
