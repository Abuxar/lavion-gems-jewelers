import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import { href, type LocaleCode } from '@/lib/locales';
import { SITE } from '@/lib/seo';
import { NewsletterForm } from '@/components/newsletter-form';

export function SiteFooter({ locale }: { locale: LocaleCode }) {
  return (
    <footer className="mt-24 border-t border-hairline bg-onyx text-canvas">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2">
        <div>
          <div className="font-serif text-lg tracking-[0.24em] uppercase">
            Lavion <span className="text-gold-300">Gems</span> &amp; Jewellers
          </div>
          <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink-faint">
            {SITE.tagline}
          </p>
          <p className="mt-3 font-sans text-xs text-gold-300">
            {SITE.address.street}, {SITE.address.city}
          </p>

          <h2 className="mt-8 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            New pieces and the day&rsquo;s rate
          </h2>
          <NewsletterForm />
        </div>
        <div>
          <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            <Link href={href(locale, '/collections')} className="hover:text-gold-300">
              Collections
            </Link>
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-y-2">
            {CATEGORIES.map(c => (
              <li key={c.slug}>
                <Link
                  href={href(locale, `/${c.slug}`)}
                  className="font-sans text-sm text-canvas/80 hover:text-gold-300"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-5 text-center font-sans text-xs text-ink-faint">
        <Link href={href(locale, "/track-order")} className="hover:text-gold-300">
          Track your order
        </Link>
      </div>
      <div className="border-t border-white/10 py-5 text-center font-sans text-xs text-ink-faint">
        © {new Date().getFullYear()} {SITE.name}. All rights reserved.
      </div>
    </footer>
  );
}
