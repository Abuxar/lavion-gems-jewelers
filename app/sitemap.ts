import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@/lib/categories';
import { getAllProducts } from '@/lib/catalogue';
import { productHandle } from '@/lib/handles';
import { alternatesFor, href, LOCALES } from '@/lib/locales';
import { SITE } from '@/lib/seo';

/**
 * Generated from the same sources the routes are, so the sitemap cannot
 * describe pages that do not exist or omit ones that do. The hand-written
 * sitemap.xml it replaces had already drifted — it still listed .html URLs and
 * the old preview domain.
 *
 * Every entry carries its own language alternates. A sitemap is the other place
 * Google accepts hreflang, and stating it in both is what keeps four
 * near-identical English pages from being read as duplicates of each other.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getAllProducts();

  const paths: { path: string; priority: number }[] = [
    { path: '/', priority: 1 },
    ...CATEGORIES.map(c => ({ path: `/${c.slug}`, priority: 0.8 })),
    // Below the collections they sit in, but present — an unlisted page is one
    // a crawler has to stumble upon rather than be told about.
    ...products.map(p => ({ path: `/product/${productHandle(p)}`, priority: 0.6 })),
    { path: '/track-order', priority: 0.4 }
  ];

  return LOCALES.flatMap(locale =>
    paths.map(({ path, priority }) => ({
      url: `${SITE.url}${href(locale.code, path)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority,
      alternates: { languages: alternatesFor(path, SITE.url) }
    }))
  );
}
