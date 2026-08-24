import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/catalogue';
import { isEmbeddedImage } from '@/lib/images';

/**
 * One piece in a grid.
 *
 * Lifted out of the category page when the collection page needed the same
 * card. Two copies of forty lines of image sizing and badge placement is two
 * places for them to drift, and the difference would show as one grid quietly
 * loading heavier images than the other.
 */
export function ProductCard({
  product,
  href,
  priority = false
}: {
  product: Product;
  href: string;
  /** True only for the handful above the fold; see the note on sizes below. */
  priority?: boolean;
}) {
  return (
    <div className="border border-hairline bg-canvas-pure">
      <Link href={href} className="block">
        <div className="relative aspect-square overflow-hidden bg-canvas-soft">
          <Image
            src={product.img}
            alt={product.name}
            fill
            // Tells the optimiser which widths are actually needed, so a phone
            // is not sent the desktop rendition of a 1024px photo.
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            // Only what is above the fold on a phone is worth preloading; the
            // rest stays lazy so it does not compete with the hero.
            priority={priority}
            // An admin-uploaded image arrives embedded in the record rather
            // than as a URL, and there is nothing for the optimiser to fetch
            // and resize.
            unoptimized={isEmbeddedImage(product.img)}
            className="object-cover"
          />
          {product.badge && (
            <span className="absolute top-3 left-3 bg-onyx px-3 py-1 font-sans text-[10px] font-bold tracking-[0.15em] text-gold-300 uppercase">
              {product.badge}
            </span>
          )}
        </div>
        <div className="p-5">
          <h2 className="font-serif text-lg text-ink">{product.name}</h2>
          {product.desc && (
            <p className="mt-1 font-sans text-xs leading-relaxed text-ink-muted">{product.desc}</p>
          )}
          {/* Gold is priced off the day's bullion rate, so the shop quotes
              rather than lists. Kept as-is from the old cards. */}
          <p className="mt-4 font-sans text-[11px] font-semibold tracking-[0.15em] text-gold-600 uppercase">
            Daily rate &mdash; enquire
          </p>
        </div>
      </Link>
    </div>
  );
}
