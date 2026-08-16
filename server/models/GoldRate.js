const mongoose = require('mongoose');

/**
 * The single live rate table, plus the calibration that maps international
 * parity onto the local Sarafa quote. One document, upserted in place.
 */
const GoldRateSchema = new mongoose.Schema({
  // --- PKR ---
  rate24kPerTola: { type: Number, default: 452000 },
  rate24kPer10g: { type: Number, default: 387000 },
  rate24kPer1g: { type: Number, default: 38700 },
  rate22kPerTola: { type: Number, default: 414000 },
  rate22kPer10g: { type: Number, default: 355000 },
  rate21kPerTola: { type: Number, default: 395000 },
  rate18kPerTola: { type: Number, default: 339000 },
  rateSilverPerTola: { type: Number, default: null },

  // --- GBP ---
  rate24kPerTolaGBP: { type: Number, default: null },
  rate24kPer10gGBP: { type: Number, default: null },
  rate24kPer1gGBP: { type: Number, default: null },
  rate22kPerTolaGBP: { type: Number, default: null },
  rate18kPerTolaGBP: { type: Number, default: null },

  // --- inputs, kept for transparency and for manual recomputation ---
  // Platinum, palladium and the euro appear in no ticker on the site; they
  // are here because the bespoke estimator prices commissions against them.
  xauUsd: { type: Number, default: null },
  xagUsd: { type: Number, default: null },
  xptUsd: { type: Number, default: null },
  xpdUsd: { type: Number, default: null },
  usdPkr: { type: Number, default: null },
  usdGbp: { type: Number, default: null },
  usdEur: { type: Number, default: null },

  /**
   * Admin overrides for the bespoke rate card — stone prices per carat,
   * making charges, duty. Stones have no public live feed the way metal does,
   * so these are judgement figures that have to be adjustable without a
   * redeploy or they go stale and quote the shop out of business.
   * Only the keys the admin has actually changed are stored; the rest fall
   * back to the defaults in utils/pricing.js.
   */
  rateCard: { type: mongoose.Schema.Types.Mixed, default: null },

  // --- calibration to the local market ---
  premiumPercent: { type: Number, default: 0 },
  usdPkrOverride: { type: Number, default: null },
  usdPkrIsOverride: { type: Boolean, default: false },

  // --- provenance ---
  source: { type: String, default: '' },
  isSpot: { type: Boolean, default: true },
  fetchedAt: { type: String, default: '' },
  lastUpdated: { type: String, default: 'Awaiting first sync' }
}, { timestamps: true });

module.exports = mongoose.models.GoldRate || mongoose.model('GoldRate', GoldRateSchema);
