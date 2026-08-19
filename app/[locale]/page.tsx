import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';
import { getAllProducts } from '@/lib/catalogue';
import { isEmbeddedImage } from '@/lib/images';
import { productHandle } from '@/lib/handles';
import { alternatesFor, getLocale, href, isLocaleCode, LOCALE_CODES } from '@/lib/locales';
import { SITE } from '@/lib/seo';
import { JsonLd } from '@/components/json-ld';

/**
 * The home page, replacing the migration scaffold that stood here.
 *
 * That scaffold was fine as proof the stack worked and wrong as the front door:
 * it sat at priority 1.0 in the sitemap and told a reader nothing about the
 * shop. This is deliberately restrained — the redesign owns how it looks — but
 * the structure is real: collections, a few pieces, and the words a search
 * engine needs to know what this is.
 */

export const revalidate = 3600;

export function generateStaticParams() {
  return LOCALE_CODES.map(locale => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocaleCode(locale)) return {};

  return {
    // The one page whose title should not be suffixed with the shop name,
    // since it is the shop name.
    title: { absolute: 'Lavion Gems & Jewellers — Fine Gold, Diamond & Gemstone Jewellery' },
    description:
      'Fine gold, diamond and gemstone jewellery. Bridal sets, bespoke commissions and certified stones, shipped to the UK, Europe, the UAE and Pakistan.',
    alternates: {
      canonical: href(locale, '/'),
      languages: alternatesFor('/', SITE.url)
    }
  };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocaleCode(locale)) notFound();
  const active = getLocale(locale);
  const products = await getAllProducts();
  const featured = products.filter(p => p.badge).slice(0, 6);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: SITE.name,
          url: SITE.url,
          publisher: { '@id': `${SITE.url}/#store` }
        }}
      />

      <section className="relative isolate overflow-hidden bg-onyx">
        <Image
          src="/images/hero_campaign.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-gold-300">
            Est. Lahore
          </p>
          <h1 className="mt-5 max-w-2xl font-serif text-4xl leading-tight font-light text-white sm:text-6xl">
            Fine gold, diamond and gemstone jewellery
          </h1>
          <p className="mt-6 max-w-xl font-sans text-sm leading-relaxed text-canvas/80">
            Bridal sets, bespoke commissions and certified stones — handmade by
            master goldsmiths and shipped worldwide.
          </p>
          <Link
            href={href(active.code, "/rings")}
            className="mt-9 inline-block bg-gold-400 px-8 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-onyx hover:bg-gold-300"
          >
            Explore the collections
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-3xl font-light text-ink">Collections</h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(c => (
            <li key={c.slug}>
              <Link href={href(active.code, `/${c.slug}`)} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-canvas-soft">
                  <Image
                    src={c.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <h3 className="mt-3 font-serif text-lg text-ink group-hover:text-gold-600">
                  {c.name}
                </h3>
                <p className="mt-1 font-sans text-xs leading-relaxed text-ink-muted">
                  {c.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {featured.length > 0 && (
        <section className="border-t border-hairline bg-canvas-soft">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="font-serif text-3xl font-light text-ink">Selected pieces</h2>
            <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map(p => (
                <li key={p.id} className="border border-hairline bg-canvas-pure">
                  <Link href={href(active.code, `/product/${productHandle(p)}`)} className="block">
                    <div className="relative aspect-square overflow-hidden bg-canvas-soft">
                      <Image
                        src={p.img}
                        alt={p.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        unoptimized={isEmbeddedImage(p.img)}
                        className="object-cover"
                      />
                      <span className="absolute top-3 left-3 bg-onyx px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-gold-300">
                        {p.badge}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-lg text-ink">{p.name}</h3>
                      {p.desc && (
                        <p className="mt-1 font-sans text-xs leading-relaxed text-ink-muted">
                          {p.desc}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
