import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';
import { getCategories } from '@/lib/collections';
import { countByCategory } from '@/lib/catalogue';
import { alternatesFor, getLocale, href, isLocaleCode, LOCALE_CODES } from '@/lib/locales';
import { breadcrumbJsonLd, collectionsIndexJsonLd } from '@/lib/seo';
import { JsonLd } from '@/components/json-ld';

/**
 * The hub the nine collections hang off.
 *
 * collections.html existed on the old site and had no equivalent here, so every
 * collection was reachable only through the header. A hub gives them a second
 * route in with descriptive text around each link, and gives the site one page
 * that is genuinely about "jewellery collections" rather than about rings —
 * which is the query it can plausibly answer.
 */

export function generateStaticParams() {
  return LOCALE_CODES.map(locale => ({ locale }));
}

export const dynamicParams = false;
export const revalidate = 3600;

type Props = { params: Promise<{ locale: string }> };

const TITLE = 'All Jewellery Collections';
const DESCRIPTION =
  'Rings, necklaces, earrings and bracelets, bridal and western jewellery, high jewellery, certified gemstones and diamonds — every collection at Lavion Gems & Jewellers.';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: {
      canonical: href(locale, '/collections'),
      languages: alternatesFor('/collections', 'https://jewels.lavion.co.uk')
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: href(locale, '/collections'),
      type: 'website'
    }
  };
}

export default async function CollectionsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();

  const active = getLocale(locale);
  // One pass over the catalogue for all nine counts, rather than nine queries.
  const counts = await countByCategory();
  // The same nine, with whatever the shop has renamed applied.
  const categories = await getCategories();

  return (
    <>
      <JsonLd data={collectionsIndexJsonLd(TITLE, DESCRIPTION)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', url: href(active.code, '/') },
          { name: 'Collections', url: href(active.code, '/collections') }
        ])}
      />

      <main className="mx-auto max-w-6xl px-6 py-16">
        <header className="border-b border-hairline pb-10">
          <h1 className="font-serif text-4xl font-light text-ink sm:text-5xl">{TITLE}</h1>
          <p className="mt-4 max-w-2xl font-sans text-sm leading-relaxed text-ink-muted">
            {DESCRIPTION}
          </p>
        </header>

        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c, i) => {
            const count = counts[c.key.toLowerCase()] ?? 0;
            return (
              <li key={c.slug} className="border border-hairline bg-canvas-pure">
                <Link href={href(active.code, `/${c.slug}`)} className="block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-canvas-soft">
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      priority={i < 3}
                      className="object-cover"
                    />
                  </div>
                  <div className="p-5">
                    <h2 className="font-serif text-lg text-ink">{c.title}</h2>
                    <p className="mt-1 font-sans text-xs leading-relaxed text-ink-muted">
                      {c.description}
                    </p>
                    <p className="mt-4 font-sans text-[11px] font-semibold tracking-[0.15em] text-gold-600 uppercase">
                      {/* An empty collection says so rather than promising "0 pieces",
                          which reads like a fault rather than a fact. */}
                      {count === 0 ? 'Currently unlisted' : count === 1 ? '1 piece' : `${count} pieces`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
