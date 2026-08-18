import type { MetadataRoute } from 'next';
import { CATEGORIES } from '@/lib/categories';
import { SITE } from '@/lib/seo';

/**
 * Generated from the same category list the routes are generated from, so the
 * sitemap cannot describe pages that do not exist or omit ones that do. The
 * hand-written sitemap.xml it replaces had already drifted — it still listed
 * .html URLs and the old preview domain.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

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
    }))
  ];
}
