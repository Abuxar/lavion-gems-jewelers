import type { Locale } from './locales';

/**
 * Converting and formatting money, with no database behind it.
 *
 * Split out from money.ts because the bag and the tracking page run in the
 * browser and need exactly these two functions, while money.ts reads the rate
 * document through mongoose. Importing that from a client component drags the
 * whole server module graph into the bundle and the build fails on 'fs'.
 */

/** The dirham is pegged to the dollar, not floated. This is the peg, not a quote. */
export const USD_AED_PEG = 3.6725;

export type Fx = {
  usdPkr: number;
  usdGbp: number;
  usdEur: number;
  /** When the underlying rate document was last written. */
  asOf: string | null;
};

/** Rupees into the locale's currency. */
export function convert(amountPkr: number, currency: Locale['currency'], fx: Fx): number {
  if (currency === 'PKR') return amountPkr;
  const usd = amountPkr / fx.usdPkr;
  switch (currency) {
    case 'GBP':
      return usd * fx.usdGbp;
    case 'EUR':
      return usd * fx.usdEur;
    case 'AED':
      return usd * USD_AED_PEG;
  }
}

/**
 * Rounded the way each currency is actually quoted.
 *
 * A ring at "PKR 285,000" reads correctly with no decimals; the same figure as
 * "£1,024.37" reads like a calculation rather than a price, so the smaller
 * currencies are shown whole too.
 */
export function formatMoney(amount: number, currency: Locale['currency']): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  }).format(Math.round(amount));
}

/** Convert and format in one step, which is how callers always want it. */
export function priceIn(amountPkr: number, currency: Locale['currency'], fx: Fx): string {
  return formatMoney(convert(amountPkr, currency, fx), currency);
}
