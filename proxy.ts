import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_LOCALE, isLocaleCode } from '@/lib/locales';

/**
 * Puts every request into a locale without putting a prefix on the UK.
 *
 * Pages live under app/[locale], so a request needs a locale segment to match
 * anything. An unprefixed path is rewritten — not redirected — to the default
 * locale, so /rings keeps its address while being served by /gb/rings. Those
 * URLs predate the migration and are the ones already indexed.
 *
 * /gb/* is the exception, and it redirects rather than rewriting. Serving the
 * same page at both /rings and /gb/rings would be two URLs for one page, which
 * is the duplicate-content problem the whole hreflang arrangement exists to
 * avoid. There is one address for the UK page and it is the short one.
 *
 * Named proxy() in proxy.ts rather than middleware() in middleware.ts: Next 16
 * renamed the convention and warns on every boot under the old one. Nothing
 * about the behaviour changes — it runs in the same place for the same reason.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first, ...rest] = pathname.split('/');

  if (first === DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + rest.join('/');
    return NextResponse.redirect(url, 308);
  }

  if (isLocaleCode(first)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  /**
   * Everything except the API, Next's own assets, and the files that must keep
   * their exact path. robots.txt and sitemap.xml are route handlers outside the
   * locale tree — there is one of each for the whole site, and rewriting them
   * into a locale would make them 404.
   */
  /**
   * /admin is excluded because it is not a market-facing page: it lives outside
   * the locale tree, in one language, and rewriting it to /gb/admin would 404.
   */
  matcher: ['/((?!api|_next|images|admin|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)']
};
