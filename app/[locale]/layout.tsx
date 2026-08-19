import type { Metadata } from 'next';
import { Cormorant_Garamond, Montserrat } from 'next/font/google';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { JsonLd } from '@/components/json-ld';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { WishlistProvider } from '@/lib/wishlist';
import { LocaleProvider } from '@/lib/locale-context';
import { alternatesFor, getLocale, isLocaleCode, LOCALE_CODES } from '@/lib/locales';
import { jewelleryStoreJsonLd, SITE } from '@/lib/seo';
import '../globals.css';

/**
 * The same two faces the site already uses, but self-hosted by Next rather than
 * fetched from Google's CDN at render time. That removes a third-party
 * connection from the critical path and, because the metrics are known ahead of
 * time, removes the layout shift when the webfont replaces the fallback.
 */
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap'
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap'
});

export function generateStaticParams() {
  return LOCALE_CODES.map(locale => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;

  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: SITE.name,
      template: `%s | ${SITE.name}`
    },
    description:
      'Fine gold, diamond and gemstone jewellery — bridal sets, bespoke commissions and certified stones.',
    alternates: {
      canonical: '/',
      // Every variant lists all of them, itself included. Without that Google
      // treats four near-identical English pages as duplicates competing with
      // each other rather than as one page serving four markets.
      languages: alternatesFor('/', SITE.url)
    },
    openGraph: {
      siteName: SITE.name,
      type: 'website',
      locale: getLocale(locale).htmlLang.replace('-', '_')
    },
    twitter: { card: 'summary_large_image' }
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  // A path like /xx would otherwise render the whole site under a locale that
  // does not exist, at an address a crawler would happily index.
  if (!isLocaleCode(locale)) notFound();

  const active = getLocale(locale);

  return (
    <html
      lang={active.htmlLang}
      className={`${cormorant.variable} ${montserrat.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        {/* Described once, for every page, rather than not at all. */}
        <JsonLd data={jewelleryStoreJsonLd()} />
        <LocaleProvider locale={active.code}>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <SiteHeader locale={active.code} />
                <div className="flex-1">{children}</div>
                <SiteFooter locale={active.code} />
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
