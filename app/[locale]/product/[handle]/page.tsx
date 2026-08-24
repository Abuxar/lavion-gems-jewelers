import { Fragment } from 'react';
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
          <div>
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

            {/* Only when there are more. A lone thumbnail under the main
                photograph looks like a gallery that failed to load. */}
            {product.images.length > 0 && (
              <ul className="mt-3 grid grid-cols-4 gap-3">
                {product.images.map(src => (
                  <li
                    key={src}
                    className="relative aspect-square overflow-hidden border border-hairline bg-canvas-soft"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      sizes="12vw"
                      unoptimized={isEmbeddedImage(src)}
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
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

            {product.sizes.length > 0 && (
              <div className="mt-8">
                <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
                  Sizes made
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {product.sizes.map(size => (
                    <li
                      key={size}
                      className="border border-hairline px-3 py-1.5 font-sans text-sm text-ink"
                    >
                      {size}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-sans text-xs text-ink-faint">
                  Other sizes are made to order &mdash; ask when you enquire.
                </p>
              </div>
            )}

            {/*
              The specification.

              Every row is conditional and the whole block disappears when a
              piece has none of it. The catalogue predates these fields, so
              rendering the labels regardless would print a column of "Metal —"
              against fourteen pieces and read as a page that had failed to
              load rather than one with nothing to say.
            */}
            <Spec
              rows={[
                ['Reference', product.id],
                ['Collection', category ? category.name : ''],
                ['Metal', product.metal],
                ['Hallmark', product.purity],
                ['Weight', product.grossWeightG !== null ? `${product.grossWeightG} g` : ''],
                ['Stone', product.stone],
                [
                  'Carat weight',
                  product.stoneCarats !== null ? `${product.stoneCarats} ct total` : ''
                ],
                ['Stones set', product.stoneCount !== null ? String(product.stoneCount) : ''],
                ['Quality', product.stoneQuality],
                ['Certificate', product.certificate],
                ['Dimensions', product.dimensions],
                ['Availability', product.stock > 0 ? 'In stock' : 'Made to order'],
                [
                  'Ready in',
                  product.madeToOrderDays !== null
                    ? `${product.madeToOrderDays} working days`
                    : ''
                ]
              ]}
            />
          </div>
        </div>

        {(product.details || product.care) && (
          <div className="mt-16 grid gap-12 border-t border-hairline pt-12 lg:grid-cols-2">
            {product.details && (
              <section>
                <h2 className="font-serif text-2xl font-light text-ink">About this piece</h2>
                {/* Blank lines are paragraph breaks. The admin field is a
                    textarea, and a jeweller writing two paragraphs should get
                    two paragraphs rather than one run-on block. */}
                {splitParagraphs(product.details).map((para, i) => (
                  <p key={i} className="mt-4 font-sans text-sm leading-relaxed text-ink-muted">
                    {para}
                  </p>
                ))}
              </section>
            )}
            {product.care && (
              <section>
                <h2 className="font-serif text-2xl font-light text-ink">Care</h2>
                <p className="mt-4 font-sans text-sm leading-relaxed text-ink-muted">
                  {product.care}
                </p>
              </section>
            )}
          </div>
        )}
      </main>
    </>
  );
}

/** Blank lines separate paragraphs; a single newline is just a wrap. */
function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n/).map(t => t.trim()).filter(Boolean);
}

/** A definition list that omits its blank rows rather than labelling them. */
function Spec({ rows }: { rows: [label: string, value: string][] }) {
  const shown = rows.filter(([, value]) => value !== '' && value !== undefined);
  if (shown.length === 0) return null;

  return (
    <dl className="mt-8 grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 border-t border-hairline pt-6 font-sans text-sm">
      {shown.map(([label, value]) => (
        <Fragment key={label}>
          <dt className="text-ink-faint">{label}</dt>
          <dd className="text-ink">{value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
