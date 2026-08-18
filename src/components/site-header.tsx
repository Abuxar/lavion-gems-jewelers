import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

/**
 * One header, rendered by the root layout.
 *
 * The markup it replaces was pasted into fifteen separate files, so adding a
 * category meant fifteen edits and the drift that comes with them. The styling
 * here is deliberately plain — it is built from the theme tokens and expects to
 * be replaced wholesale by the redesign. The structure is the part worth
 * keeping.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-hairline bg-onyx">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-xl tracking-[0.28em] text-white uppercase">
          Lavion <span className="text-gold-300">Gems</span>
        </Link>
      </div>
      <nav aria-label="Collections" className="border-t border-white/10">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-7 gap-y-2 px-6 py-3">
          {CATEGORIES.map(c => (
            <li key={c.slug}>
              <Link
                href={`/${c.slug}`}
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
