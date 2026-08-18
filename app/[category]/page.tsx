import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORIES, findCategory } from '@/lib/categories';
import { getProductsByCategory, isEmbeddedImage } from '@/lib/catalogue';
import { productHandle } from '@/lib/handles';
import { breadcrumbJsonLd, categoryJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/json-ld';

/**
 * Nine pages became this one.
 *
 * rings, necklaces, earrings, bracelets, asian-jewellery, western-jewellery,
 * high-jewellery, gems and diamonds were separate files differing by a heading,
 * a paragraph and one argument to renderCategoryPage(). Adding a tenth meant
 * copying a file; changing the card meant editing nine.
 */

/** Built at deploy time, so each category is a real static page for a crawler. */
export function generateStaticParams() {
  return CATEGORIES.map(c => ({ category: c.slug }));
}

/**
 * Anything not in that list is a genuine 404 rather than an empty catalogue
 * page. Left on, a dynamic segment answers 200 for every URL ever guessed at,
 * and a crawler will happily index thousands of soft-404s.
 */
export const dynamicParams = false;

/** Stock and prices move; a page rebuilt hourly is fresh enough for a catalogue. */
export const revalidate = 3600;

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const category = findCategory(slug);
  if (!category) return {};

  return {
    title: category.title,
    description: category.description,
    // Relative, and resolved against metadataBase in the root layout. The old
    // pages hard-coded absolute URLs, which is how all seventeen ended up still
    // pointing at the vercel.app preview domain.
    alternates: { canonical: `/${category.slug}` },
    openGraph: {
      title: category.title,
      description: category.description,
      url: `/${category.slug}`,
      type: 'website'
    }
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const category = findCategory(slug);
  if (!category) notFound();

  const products = await getProductsByCategory(category);

  return (
    <>
      <JsonLd data={categoryJsonLd(category, products)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: '/' },
          { name: category.name, url: `/${category.slug}` }
        ])}
      />

      <main className="mx-auto max-w-6xl px-6 py-16">
        <header className="border-b border-hairline pb-10">
          <h1 className="font-serif text-4xl font-light text-ink sm:text-5xl">
            {category.title}
          </h1>
          <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-ink-muted">
            {category.description}
          </p>
        </header>

        <p className="mt-8 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
          {products.length === 1 ? '1 piece' : `${products.length} pieces`}
        </p>

        {products.length === 0 ? (
          <p className="mt-10 font-sans text-sm text-ink-muted">
            Nothing is listed here at the moment. Please{' '}
            <a href="/" className="text-gold-600 underline">
              browse our other collections
            </a>
            .
          </p>
        ) : (
          <ul className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <li key={p.id} className="border border-hairline bg-canvas-pure">
                <Link href={`/product/${productHandle(p)}`} className="block">
                  <div className="relative aspect-square overflow-hidden bg-canvas-soft">
                  <Image
                    src={p.img}
                    alt={p.name}
                    fill
                    // Tells the optimiser which widths are actually needed, so a
                    // phone is not sent the desktop rendition of a 1024px photo.
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    // Only what is above the fold on a phone is worth preloading;
                    // the rest stays lazy so it does not compete with the hero.
                    priority={i < 3}
                    // An admin-uploaded image arrives embedded in the record
                    // rather than as a URL, and there is nothing for the
                    // optimiser to fetch and resize.
                    unoptimized={isEmbeddedImage(p.img)}
                    className="object-cover"
                  />
                  {p.badge && (
                    <span className="absolute top-3 left-3 bg-onyx px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gold-300">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-serif text-lg text-ink">{p.name}</h2>
                  {p.desc && (
                    <p className="mt-1 font-sans text-xs leading-relaxed text-ink-muted">
                      {p.desc}
                    </p>
                  )}
                  {/* Gold is priced off the day's bullion rate, so the shop
                      quotes rather than lists. Kept as-is from the old cards. */}
                  <p className="mt-4 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-gold-600">
                    Daily rate — enquire
                  </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
