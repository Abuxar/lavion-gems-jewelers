import type { Fx } from './currency';

/* eslint-disable @typescript-eslint/no-require-imports */
const { ensureMongo, isMongoConnected } = require('../../server/config/db');
const GoldRateModel = require('../../server/models/GoldRate');

/**
 * Today's exchange rates, read from the store.
 *
 * These are the same live rates the gold ticker already runs on — the rate
 * document holds usdPkr, usdGbp and usdEur, refreshed from the FX feed — rather
 * than the constants the old front end carried. Those were typed in once and
 * never moved: its GBP figure is about 5% away from today's, and a jewellery
 * price is not a good place to be 5% wrong.
 *
 * The document is read rather than the feed being called, so rendering a page
 * never waits on a third party.
 */

/**
 * A last-resort table, used only when the rate document cannot be read at all.
 * It exists so a page still shows a plausible figure rather than zero. Anything
 * priced from it is approximate, which is one more reason every total on the
 * site is labelled an estimate confirmed before payment.
 */
const FALLBACK: Fx = { usdPkr: 278, usdGbp: 0.74, usdEur: 0.86, asOf: null };

export async function getFx(): Promise<Fx> {
  try {
    await ensureMongo();
    if (isMongoConnected()) {
      const doc = await GoldRateModel.findOne({})
        .select('usdPkr usdGbp usdEur updatedAt -_id')
        .lean();
      if (doc && doc.usdPkr > 0) {
        return {
          usdPkr: doc.usdPkr,
          usdGbp: doc.usdGbp || FALLBACK.usdGbp,
          usdEur: doc.usdEur || FALLBACK.usdEur,
          asOf: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null
        };
      }
    }
  } catch {
    // Fall through — an approximate figure beats a page that will not render.
  }
  return FALLBACK;
}

/**
 * The bullion quotes themselves, for the rate ticker.
 *
 * Every figure is nullable on purpose. Silver has no default in the schema and
 * the karat lines can be absent before the first sync, and a ticker that prints
 * "PKR 0 / Tola" on a jewellery site is worse than one that omits the line —
 * it is a price, and it is wrong. Callers drop what is missing.
 */
export type GoldRates = {
  perTola24k: number | null;
  per10g24k: number | null;
  per1g24k: number | null;
  perTola22k: number | null;
  perTola18k: number | null;
  silverPerTola: number | null;
  asOf: string | null;
};

const RATE_FIELDS =
  'rate24kPerTola rate24kPer10g rate24kPer1g rate22kPerTola rate18kPerTola rateSilverPerTola updatedAt -_id';

/** A quote is only usable if it is a real positive number. */
function quote(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

const NO_RATES: GoldRates = {
  perTola24k: null,
  per10g24k: null,
  per1g24k: null,
  perTola22k: null,
  perTola18k: null,
  silverPerTola: null,
  asOf: null
};

export async function getGoldRates(): Promise<GoldRates> {
  try {
    await ensureMongo();
    if (isMongoConnected()) {
      const doc = await GoldRateModel.findOne({}).select(RATE_FIELDS).lean();
      if (doc) {
        return {
          perTola24k: quote(doc.rate24kPerTola),
          per10g24k: quote(doc.rate24kPer10g),
          per1g24k: quote(doc.rate24kPer1g),
          perTola22k: quote(doc.rate22kPerTola),
          perTola18k: quote(doc.rate18kPerTola),
          silverPerTola: quote(doc.rateSilverPerTola),
          asOf: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null
        };
      }
    }
  } catch {
    // No ticker is the honest outcome here. Unlike a price, a bullion quote has
    // no sensible fallback: a stale or invented rate is the one thing a shop
    // that sells at the day's rate must never publish.
  }
  return NO_RATES;
}
