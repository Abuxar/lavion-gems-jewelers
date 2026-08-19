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
