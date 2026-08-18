import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@/lib/categories';
import { getAllProducts } from '@/lib/catalogue';
import { productHandle } from '@/lib/handles';
import { SITE } from '@/lib/seo';

/**
 * Generated from the same sources the routes are, so the sitemap cannot
 * describe pages that do not exist or omit ones that do. The hand-written
 * sitemap.xml it replaces had already drifted — it still listed .html URLs and
 * the old preview domain.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getAllProducts();

  return [
    {
      url: SITE.url,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1
    },
    ...CATEGORIES.map(c => ({
      url: `${SITE.url}/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8
    })),
    // Below the collections they sit in, but present — an unlisted page is one
    // a crawler has to stumble upon rather than be told about.
    ...products.map(p => ({
      url: `${SITE.url}/product/${productHandle(p)}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6
    }))
  ];
}
