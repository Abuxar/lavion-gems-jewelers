'use client';

import { createContext, useContext } from 'react';
import { DEFAULT_LOCALE, getLocale, href, type LocaleCode } from './locales';

/**
 * Which market the reader is in, for the parts of the page that run in the
 * browser.
 *
 * Server components take the locale from the route segment, but the header,
 * footer, bag and saved-pieces links are client components with no params of
 * their own. Without this they would build unprefixed links and quietly return
 * a reader in Dubai to the UK site mid-journey.
 */
const LocaleContext = createContext<LocaleCode>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children
}: {
  locale: LocaleCode;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return getLocale(useContext(LocaleContext));
}

/** Build a link that stays in the reader's market. */
export function useHref() {
  const locale = useContext(LocaleContext);
  return (path: string) => href(locale, path);
}
