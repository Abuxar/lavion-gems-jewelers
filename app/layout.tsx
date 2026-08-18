import type { Metadata } from 'next';
import { Cormorant_Garamond, Montserrat } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { JsonLd } from '@/components/json-ld';
import { AuthProvider } from '@/lib/auth';
import { jewelleryStoreJsonLd } from '@/lib/seo';
import './globals.css';

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

/**
 * One definition, inherited by every page.
 *
 * The old site repeated canonical, og: and twitter: tags by hand across
 * seventeen files, which is why they all still pointed at the vercel.app
 * preview domain long after the real one went live. `metadataBase` makes every
 * relative URL below resolve against the production host, so that class of
 * mistake cannot recur.
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://jewels.lavion.co.uk'),
  title: {
    default: 'Lavion Gems & Jewellers',
    template: '%s | Lavion Gems & Jewellers'
  },
  description:
    'Fine gold, diamond and gemstone jewellery — bridal sets, bespoke commissions and certified stones.',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    siteName: 'Lavion Gems & Jewellers',
    type: 'website',
    locale: 'en_GB'
  },
  twitter: {
    card: 'summary_large_image'
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body className="flex min-h-screen flex-col">
        {/* Described once, for every page, rather than not at all. */}
        <JsonLd data={jewelleryStoreJsonLd()} />
        <AuthProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
