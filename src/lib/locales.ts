/**
 * The four markets the shop sells into, as URL locales.
 *
 * One domain, sub-paths — not four domains and not four subdomains. Everything
 * earned by one page helps the others, which matters most for the markets that
 * are hardest to rank in.
 *
 * The UK sits at the root with no prefix. That is partly because lavion.co.uk
 * is a UK domain and Google reads a country-code TLD as a UK signal it will not
 * let you override, and partly because those URLs already exist: /rings has
 * been the ring page all along and moving it to /gb/rings would throw away
 * whatever it has accumulated for no gain.
 */
export type LocaleCode = 'gb' | 'pk' | 'ae' | 'eu';

export type Locale = {
  code: LocaleCode;
  /** Empty for the default locale, which is served from the root. */
  prefix: string;
  label: string;
  currency: 'GBP' | 'PKR' | 'AED' | 'EUR';
  /** The hreflang value. */
  hrefLang: string;
  /** The html lang attribute. */
  htmlLang: string;
};

export const DEFAULT_LOCALE: LocaleCode = 'gb';

export const LOCALES: Locale[] = [
  {
    code: 'gb',
    prefix: '',
    label: 'United Kingdom',
    currency: 'GBP',
    hrefLang: 'en-GB',
    htmlLang: 'en-GB'
  },
  {
    code: 'pk',
    prefix: '/pk',
    label: 'Pakistan',
    currency: 'PKR',
    hrefLang: 'en-PK',
    htmlLang: 'en-PK'
  },
  {
    code: 'ae',
    prefix: '/ae',
    label: 'United Arab Emirates',
    currency: 'AED',
    hrefLang: 'en-AE',
    htmlLang: 'en-AE'
  },
  {
    /**
     * Europe is a region rather than a country, so it takes plain "en" — the
     * fallback for an English speaker no more specific tag matches. Naming a
     * single country here would claim one market and abandon the rest.
     */
    code: 'eu',
    prefix: '/eu',
    label: 'Europe',
    currency: 'EUR',
    hrefLang: 'en',
    htmlLang: 'en'
  }
];

export const LOCALE_CODES = LOCALES.map(l => l.code);

export function getLocale(code: string | undefined): Locale {
  return LOCALES.find(l => l.code === code) ?? LOCALES[0];
}

/** True for a path segment that names a locale, e.g. "pk". */
export function isLocaleCode(segment: string): segment is LocaleCode {
  return (LOCALE_CODES as string[]).includes(segment);
}

/**
 * Build a link for a locale.
 *
 * Every internal link goes through this, because a link that drops the prefix
 * silently returns the reader to the UK site — and does it without saying so,
 * which is worse than a broken link.
 */
export function href(locale: LocaleCode, path = '/'): string {
  const { prefix } = getLocale(locale);
  const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${clean}` || '/';
}

/**
 * Every locale's URL for the same page, for hreflang.
 *
 * Google wants each variant to list all of them, itself included, or it treats
 * the set as unrelated pages that happen to look alike — which is how
 * near-identical English pages across four markets end up competing with each
 * other instead of each serving its own.
 */
export function alternatesFor(path: string, siteUrl: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    languages[l.hrefLang] = `${siteUrl}${href(l.code, path)}`;
  }
  languages['x-default'] = `${siteUrl}${href(DEFAULT_LOCALE, path)}`;
  return languages;
}
