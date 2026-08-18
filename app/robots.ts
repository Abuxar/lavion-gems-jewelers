import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /api is machine-facing and returns no-store; /admin is a login screen
      // that has no business in an index. The static robots.txt this replaces
      // listed neither admin path.
      disallow: ['/api/', '/admin', '/admin-panel']
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url
  };
}
