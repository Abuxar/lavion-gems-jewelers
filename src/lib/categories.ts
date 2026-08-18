/**
 * The category registry — plain data, deliberately free of any database import.
 *
 * The header, footer and sitemap all need to know what the collections are and
 * none of them needs to know what is in stock. Keeping this separate from
 * catalogue.ts means those three do not pull mongoose and the whole server
 * module graph in behind them, which is what broke the sitemap build.
 */
export type Category = {
  /** The URL segment, which is also what Google has already indexed. */
  slug: string;
  /** The value stored on the product record, which does not always match. */
  key: string;
  name: string;
  title: string;
  description: string;
  /** Root-relative, out of public/. Used for the collection tiles on the home page. */
  image: string;
};

/**
 * Slug and stored category are not the same string, and the difference is not
 * cosmetic: /asian-jewellery holds products filed under "asian". These pairings
 * are taken from the renderCategoryPage() call on each existing page so the
 * URLs Google already knows keep resolving to the same goods.
 */
export const CATEGORIES: Category[] = [
  {
    slug: 'rings',
    image: '/images/featured_rings.png',
    key: 'rings',
    name: 'Rings',
    title: 'Fine Rings Collection',
    description:
      'From GIA solitaire engagement rings to handcrafted 22K gold emerald and Burmese ruby statement bands.'
  },
  {
    slug: 'necklaces',
    image: '/images/hero_necklace.png',
    key: 'necklaces',
    name: 'Necklaces',
    title: 'Necklaces & Pendants',
    description:
      'Diamond halo necklaces, gold chains and gemstone pendants finished by hand.'
  },
  {
    slug: 'earrings',
    image: '/images/featured_earrings.png',
    key: 'earrings',
    name: 'Earrings',
    title: 'Earrings',
    description:
      'Diamond pavé drops, gold studs and gemstone chandeliers for every occasion.'
  },
  {
    slug: 'bracelets',
    image: '/images/featured_bracelets.png',
    key: 'bracelets',
    name: 'Bracelets',
    title: 'Bracelets & Bangles',
    description:
      'Diamond-set bangles, gold cuffs and heritage kara in 22K and 18K gold.'
  },
  {
    slug: 'asian-jewellery',
    image: '/images/asian_jewellery.png',
    key: 'asian',
    name: 'Asian Jewellery',
    title: 'Asian & Bridal Jewellery',
    description:
      'Kundan, polki and jadau bridal sets in 22K gold, made in the traditional way.'
  },
  {
    slug: 'western-jewellery',
    image: '/images/western_jewellery.png',
    key: 'western',
    name: 'Western Jewellery',
    title: 'Western Jewellery',
    description:
      'Minimalist platinum and diamond pieces, art deco cuffs and contemporary settings.'
  },
  {
    slug: 'high-jewellery',
    image: '/images/hero_campaign.png',
    key: 'high',
    name: 'High Jewellery',
    title: 'High Jewellery & Bespoke Creations',
    description:
      'Rare gemstones, one-of-a-kind parures and handcrafted gold heirlooms by master goldsmiths.'
  },
  {
    slug: 'gems',
    image: '/images/gems.png',
    key: 'gems',
    name: 'Gems',
    title: 'Certified Gemstones',
    description:
      'Unmounted sapphires, emeralds and rubies, certified and ready to be set.'
  },
  {
    slug: 'diamonds',
    image: '/images/diamonds.png',
    key: 'diamonds',
    name: 'Diamonds',
    title: 'Certified Diamonds',
    description:
      'GIA certified solitaires and diamond jewellery in platinum and white gold.'
  }
];

export function findCategory(slug: string): Category | undefined {
  return CATEGORIES.find(c => c.slug === slug);
}

/** The reverse lookup: a product stores `key`, a breadcrumb needs the rest. */
export function findCategoryByKey(key: string): Category | undefined {
  return CATEGORIES.find(c => c.key.toLowerCase() === key.toLowerCase());
}
