import type { Category } from './categories';
import type { Product } from './catalogue';

export const SITE = {
  name: 'Lavion Gems & Jewellers',
  url: 'https://jewels.lavion.co.uk',
  tagline: 'Fine gold, diamond and gemstone jewellery.',
  address: {
    street: '282 Y Block, Phase 3, DHA',
    city: 'Lahore',
    country: 'PK'
  }
} as const;

/**
 * Whether a product's price is published in structured data.
 *
 * It is off because the pages do not show one — they say "Daily Rate Inquire",
 * since a gold piece is priced off the day's bullion rate. Structured data is
 * required to agree with what the reader can see, and a price in the markup
 * that appears nowhere on the page is the kind of mismatch that earns a manual
 * action rather than a rich result.
 *
 * The cost of leaving it off is real and worth knowing: price and availability
 * in the search result are what make a shopping listing stand out, and this
 * forfeits them. Turning it on is a business decision about showing prices, not
 * a technical one — and the moment the pages show a price, this should follow.
 */
const PUBLISH_PRICES = false;

type JsonLd = Record<string, unknown>;

/** The shop itself. Drives the knowledge panel and "jewellers near me". */
export function jewelleryStoreJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    '@id': `${SITE.url}/#store`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.tagline,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.city,
      addressCountry: SITE.address.country
    },
    // The shop ships to all four markets it sells into. Without this the only
    // geography Google can infer is the one in the postal address.
    areaServed: [
      { '@type': 'Country', name: 'United Kingdom' },
      { '@type': 'Country', name: 'United Arab Emirates' },
      { '@type': 'Country', name: 'Pakistan' },
      { '@type': 'Place', name: 'Europe' }
    ]
  };
}

export function productJsonLd(product: Product): JsonLd {
  const node: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${SITE.url}/product/${product.id}`,
    name: product.name,
    sku: product.id,
    brand: { '@type': 'Brand', name: SITE.name }
  };

  /**
   * Only a real, fetchable URL belongs here.
   *
   * An admin-uploaded photo is stored embedded in the record, and prefixing the
   * site URL to it produces "https://…/data:image/jpeg;base64,…", which is not
   * an address of anything. It would also paste the entire image into the page
   * markup a second time — 53 KB of base64 for the one product that has one.
   * Google drops a Product with no image from rich results, which is the
   * correct outcome: the fix is to host the file, not to describe it wrongly.
   */
  if (!product.img.startsWith('data:')) {
    node.image = product.img.startsWith('http')
      ? product.img
      : `${SITE.url}${product.img}`;
  }

  if (product.desc) node.description = product.desc;

  if (PUBLISH_PRICES) {
    node.offers = {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'PKR',
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@id': `${SITE.url}/#store` }
    };
  }

  return node;
}

/**
 * A category page is a listing, not a product, and saying so lets the products
 * on it be understood as its members rather than as nine competing pages.
 */
export function categoryJsonLd(category: Category, products: Product[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: category.title,
    description: category.description,
    url: `${SITE.url}/${category.slug}`,
    isPartOf: { '@id': `${SITE.url}/#store` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: productJsonLd(p)
      }))
    }
  };
}

export function breadcrumbJsonLd(trail: { name: string; url: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: `${SITE.url}${step.url}`
    }))
  };
}
