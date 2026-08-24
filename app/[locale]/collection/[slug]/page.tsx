import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductsBySlug } from '@/lib/catalogue';
import { getLocale, href, isLocaleCode } from '@/lib/locales';
import { productHandle } from '@/lib/handles';
import { ProductCard } from '@/components/product-card';

/* eslint-disable @typescript-eslint/no-require-imports */
const { ensureMongo, isMongoConnected } = require('../../../../server/config/db');
const CategoryModel = require('../../../../server/models/Category');

/**
 * A page for a collection the shop invented.
 *
 * The eight that ship with the site keep their own route and their own indexed
 * URLs — /rings, /diamonds and the rest, from the category registry. This
 * serves the ninth, so inventing a collection in the admin panel does not need
 * a deploy.
 *
 * The same address as the old site uses, /collection/<slug>, so a link made
 * before the cutover still resolves after it.
 */

type Stored = { slug: string; name: string; description?: string };

async function getCollection(slug: string): Promise<Stored | null> {
  try {
    await ensureMongo();
    if (!isMongoConnected()) return null;
    return await CategoryModel.findOne({ slug: slug.toLowerCase() })
      .select('slug name description -_id')
      .lean();
  } catch {
    return null;
  }
}

/**
 * Rendered on demand rather than at build time: a collection created this
 * afternoon should have a page this afternoon, not after the next deploy.
 */
export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocaleCode(locale)) return {};
  const collection = await getCollection(slug);
  if (!collection) return { title: 'Collection', robots: { index: false, follow: true } };

  return {
    title: collection.name,
    description: collection.description || `${collection.name} at Lavion Gems & Jewellers.`,
    alternates: { canonical: href(locale, `/collection/${collection.slug}`) }
  };
}

export default async function CollectionPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocaleCode(locale)) notFound();

  const [collection, products] = await Promise.all([
    getCollection(slug),
    getProductsBySlug(slug)
  ]);

  // A collection nobody created and nothing is filed under does not exist. One
  // with pieces but no record still renders — a built-in slug reached through
  // this address, say — under a tidied-up name.
  if (!collection && products.length === 0) notFound();

  const active = getLocale(locale);
  const name =
    collection?.name || slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <nav aria-label="Breadcrumb" className="font-sans text-xs text-ink-faint">
        <Link href={href(active.code, '/')} className="hover:text-gold-600">
          Home
        </Link>
        <span className="px-2">/</span>
        <Link href={href(active.code, '/collections')} className="hover:text-gold-600">
          Collections
        </Link>
        <span className="px-2">/</span>
        <span className="text-ink-muted">{name}</span>
      </nav>

      <header className="mt-8">
        <h1 className="font-serif text-4xl font-light text-ink">{name}</h1>
        {collection?.description && (
          <p className="mt-3 max-w-[60ch] font-sans text-sm leading-relaxed text-ink-muted">
            {collection.description}
          </p>
        )}
        <p className="mt-4 font-sans text-[11px] tracking-[0.18em] text-ink-faint uppercase">
          {products.length} {products.length === 1 ? 'piece' : 'pieces'}
        </p>
      </header>

      {products.length > 0 ? (
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <li key={p.id}>
              <ProductCard
                product={p}
                href={href(active.code, `/product/${productHandle(p)}`)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 font-sans text-sm text-ink-muted">
          Nothing is filed under this collection yet.
        </p>
      )}
    </main>
  );
}
