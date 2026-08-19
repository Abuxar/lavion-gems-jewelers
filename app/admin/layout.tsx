import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { AdminAuthProvider } from '@/lib/admin-auth';
import '../globals.css';

/**
 * A second root layout, for the one part of the site that is not a shop.
 *
 * /admin sits outside app/[locale] on purpose: it serves one person in one
 * language against one currency, so multiplying it by four markets would buy
 * nothing. It carries no site header, no footer, no rate ticker and no
 * structured data — none of that is for the person editing the catalogue.
 */

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Admin',
  // robots.txt disallows it too, but a disallowed page can still be indexed
  // from a link elsewhere. This is the instruction that actually keeps it out.
  robots: { index: false, follow: false, nocache: true }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="min-h-screen bg-onyx font-sans text-canvas antialiased">
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
