import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import { href, type LocaleCode } from '@/lib/locales';
import { AccountLink } from '@/components/account-link';
import { BagLink } from '@/components/cart/bag-link';
import { SavedLink } from '@/components/wishlist/saved-link';
import { LocaleSwitcher } from '@/components/locale-switcher';

/**
 * One header, rendered by the layout.
 *
 * The markup it replaces was pasted into fifteen separate files, so adding a
 * category meant fifteen edits and the drift that comes with them. The styling
 * here is deliberately plain — it is built from the theme tokens and expects to
 * be replaced wholesale by the redesign. The structure is the part worth
 * keeping.
 *
 * It stays a server component so the brand and every collection link sit in the
 * HTML a crawler is served. Only the counters below know anything about the
 * reader, and those are client components of their own.
 */
export function SiteHeader({ locale }: { locale: LocaleCode }) {
  return (
    <header className="border-b border-hairline bg-onyx">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href={href(locale, '/')}
          className="font-serif text-xl tracking-[0.28em] text-white uppercase"
        >
          Lavion <span className="text-gold-300">Gems</span>
        </Link>
        <div className="flex items-center gap-6">
          <LocaleSwitcher />
          <AccountLink />
          <SavedLink />
          <BagLink />
        </div>
      </div>
      <nav aria-label="Collections" className="border-t border-white/10">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-7 gap-y-2 px-6 py-3">
          <li>
            <Link
              href={href(locale, '/collections')}
              className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white hover:text-gold-300"
            >
              All
            </Link>
          </li>
          {CATEGORIES.map(c => (
            <li key={c.slug}>
              <Link
                href={href(locale, `/${c.slug}`)}
                className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-200 hover:text-white"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
