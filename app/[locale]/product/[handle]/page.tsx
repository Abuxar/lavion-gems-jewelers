import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { findCategoryByKey } from '@/lib/categories';
import { getAllProducts, getProductByHandle } from '@/lib/catalogue';
import { isEmbeddedImage } from '@/lib/images';
import { productHandle } from '@/lib/handles';
import { alternatesFor, getLocale, href, isLocaleCode, LOCALE_CODES } from '@/lib/locales';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/json-ld';
import { AddToBag } from '@/components/add-to-bag';
import { PriceEnquiry } from '@/components/price-enquiry';
import { SaveButton } from '@/components/wishlist/save-button';

/**
 * A page per piece.
 *
 * Until now the catalogue had no addressable products at all — a ring existed
 * only as a card inside a category listing and as a quick-view modal, so there
 * was nothing to link to, share, or index. Every piece is now a URL of its own,
 * which is what lets a search engine rank the ring rather than the category,
 * and what makes the Product structured data resolve to something.
 */

export async function generateStaticParams() {
  const products = await getAllProducts();
  return LOCALE_CODES.flatMap(locale =>
    products.map(p => ({ locale, handle: productHandle(p) }))
  );
}

/**
 * Left on, unlike the category route: a piece added through the admin panel
 * should get a page immediately rather than waiting for the next deploy. An
 * unknown id still calls notFound(), so this does not reintroduce soft-404s.
 */
export const dynamicParams = true;
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string; handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product || !isLocaleCode(locale)) return {};

  const path = `/product/${productHandle(product)}`;
  const description =
    product.desc || `${product.name} from ${'Lavion Gems & Jewellers'}.`;

  return {
    title: product.name,
    description,
    alternates: {
      canonical: href(locale, path),
      languages: alternatesFor(path, 'https://jewels.lavion.co.uk')
    },
    openGraph: {
      title: product.name,
      description,
      url: href(locale, path),
      type: 'website',
      // An embedded image has no address to share, so the card falls back to
      // the site default rather than advertising a broken one.
      images: isEmbeddedImage(product.img) ? undefined : [product.img]
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product || !isLocaleCode(locale)) notFound();

  const active = getLocale(locale);

  /**
   * The id is what resolves, so /anything-7 would serve the same piece and
   * every variant would be its own indexable duplicate. Only the canonical
   * spelling is served; the rest are sent to it.
   */
  const canonicalHandle = productHandle(product);
  if (handle !== canonicalHandle) {
    permanentRedirect(href(active.code, `/product/${canonicalHandle}`));
  }

  const category = findCategoryByKey(product.category);

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: href(active.code, '/') },
          ...(category
            ? [{ name: category.name, url: href(active.code, `/${category.slug}`) }]
            : []),
          { name: product.name, url: href(active.code, `/product/${canonicalHandle}`) }
        ])}
      />

      <main className="mx-auto max-w-6xl px-6 py-14">
        <nav aria-label="Breadcrumb" className="font-sans text-xs text-ink-faint">
          <Link href={href(active.code, '/')} className="hover:text-gold-600">
            Home
          </Link>
          {category && (
            <>
              <span className="px-2">/</span>
              <Link href={href(active.code, `/${category.slug}`)} className="hover:text-gold-600">
                {category.name}
              </Link>
            </>
          )}
          <span className="px-2">/</span>
          <span className="text-ink-muted">{product.name}</span>
        </nav>

        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div className="relative aspect-square overflow-hidden border border-hairline bg-canvas-soft">
            <Image
              src={product.img}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              unoptimized={isEmbeddedImage(product.img)}
              className="object-cover"
            />
            {product.badge && (
              <span className="absolute top-4 left-4 bg-onyx px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gold-300">
                {product.badge}
              </span>
            )}
          </div>

          <div>
            <h1 className="font-serif text-4xl font-light text-ink">{product.name}</h1>
            {product.desc && (
              <p className="mt-4 font-sans text-sm leading-relaxed text-ink-muted">
                {product.desc}
              </p>
            )}

            <div className="mt-8 border-y border-hairline py-6">
              {/* Gold is priced off the day's bullion rate, so the shop quotes
                  rather than lists. The structured data agrees: it publishes no
                  price while the page shows none. */}
              <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-600">
                Daily rate — enquire
              </p>
              <p className="mt-2 font-sans text-xs text-ink-faint">
                Priced against today&rsquo;s gold rate. Contact us for a quotation.
              </p>
            </div>

            <AddToBag product={product} full />
            <PriceEnquiry product={product} locale={active.code} />

            <div className="mt-4">
              <SaveButton id={product.id} />
            </div>

            {product.stock > 0 && product.stock <= 3 && (
              <p className="mt-3 font-sans text-xs text-gold-600">
                Only {product.stock} left.
              </p>
            )}

            <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 font-sans text-sm">
              <dt className="text-ink-faint">Reference</dt>
              <dd className="text-ink">{product.id}</dd>
              {category && (
                <>
                  <dt className="text-ink-faint">Collection</dt>
                  <dd className="text-ink">{category.name}</dd>
                </>
              )}
              <dt className="text-ink-faint">Availability</dt>
              <dd className="text-ink">
                {product.stock > 0 ? 'In stock' : 'Made to order'}
              </dd>
            </dl>
          </div>
        </div>
      </main>
    </>
  );
}
