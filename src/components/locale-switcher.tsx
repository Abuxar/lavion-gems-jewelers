'use client';

import { usePathname, useRouter } from 'next/navigation';
import { href, isLocaleCode, LOCALES, type LocaleCode } from '@/lib/locales';
import { useLocale } from '@/lib/locale-context';

/**
 * Lets someone change market without losing their place.
 *
 * It swaps the prefix on the path they are already on rather than sending them
 * to the home page, so a reader looking at a ring in Dubai prices sees the same
 * ring in pounds. That also means the two URLs it moves between are exactly the
 * pair named in each other's hreflang tags.
 */
export function LocaleSwitcher() {
  const current = useLocale();
  const pathname = usePathname() || '/';
  const router = useRouter();

  // Strip whatever prefix is on the current path, leaving the shared part.
  const [, first, ...rest] = pathname.split('/');
  const bare = isLocaleCode(first) ? '/' + rest.join('/') : pathname;

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Country and currency</span>
      <select
        value={current.code}
        onChange={e => router.push(href(e.target.value as LocaleCode, bare || '/'))}
        className="border border-white/20 bg-onyx px-2 py-1 font-sans text-[11px] font-semibold tracking-[0.12em] text-gold-200 uppercase outline-none hover:border-gold-400"
      >
        {LOCALES.map(l => (
          <option key={l.code} value={l.code} className="text-ink">
            {l.code.toUpperCase()} · {l.currency}
          </option>
        ))}
      </select>
    </label>
  );
}
