import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORIES, findCategory } from '@/lib/categories';
import { getProductsByCategory } from '@/lib/catalogue';
import { productHandle } from '@/lib/handles';
import { ProductCard } from '@/components/product-card';
import { alternatesFor, getLocale, href, isLocaleCode, LOCALE_CODES } from '@/lib/locales';
import { breadcrumbJsonLd, categoryJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/json-ld';

/**
 * Nine pages became this one, and now serves four markets from it.
 *
 * rings, necklaces, earrings, bracelets, asian-jewellery, western-jewellery,
 * high-jewellery, gems and diamonds were separate files differing by a heading,
 * a paragraph and one argument to renderCategoryPage(). Adding a tenth meant
 * copying a file; changing the card meant editing nine — and doing it per
 * market would have meant thirty-six.
 */

/** Every collection in every market, all prerendered. */
export function generateStaticParams() {
  return LOCALE_CODES.flatMap(locale =>
    CATEGORIES.map(c => ({ locale, category: c.slug }))
  );
}

/**
 * Anything not in that list is a genuine 404 rather than an empty catalogue
 * page. Left on, a dynamic segment answers 200 for every URL ever guessed at,
 * and a crawler will happily index thousands of soft-404s.
 */
export const dynamicParams = false;

/** Stock and prices move; a page rebuilt hourly is fresh enough for a catalogue. */
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string; category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category: slug } = await params;
  const found = findCategory(slug);
  if (!found || !isLocaleCode(locale)) return {};

  const path = `/${found.slug}`;

  return {
    title: found.title,
    description: found.description,
    alternates: {
      // Relative, resolved against metadataBase. The old pages hard-coded
      // absolute URLs, which is how all seventeen ended up still naming the
      // vercel.app preview domain.
      canonical: href(locale, path),
      languages: alternatesFor(path, 'https://jewels.lavion.co.uk')
    },
    openGraph: {
      title: found.title,
      description: found.description,
      url: href(locale, path),
      type: 'website'
    }
  };
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category: slug } = await params;
  const category = findCategory(slug);
  if (!category || !isLocaleCode(locale)) notFound();

  const products = await getProductsByCategory(category);
  const active = getLocale(locale);

  return (
    <>
      <JsonLd data={categoryJsonLd(category, products)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: href(active.code, '/') },
          { name: category.name, url: href(active.code, `/${category.slug}`) }
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
            <Link href={href(active.code, '/')} className="text-gold-600 underline">
              browse our other collections
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard
                  product={p}
                  href={href(active.code, `/product/${productHandle(p)}`)}
                  priority={i < 3}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
