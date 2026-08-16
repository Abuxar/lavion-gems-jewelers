/**
 * Weights and markets, in one place.
 *
 * The studio takes a weight in whichever unit the customer already thinks in —
 * tola across Pakistan and the Gulf, grams across the UK and Europe — so two
 * briefs cannot be compared, priced or handed to the bench until they are
 * reduced to a single unit. Grams is that unit: it is what the bench scale
 * reads and what every assay office works in.
 *
 * The conversions are duplicated in customized-jewellery.html so the customer
 * sees the equivalent as they type. These are fixed definitions rather than
 * logic, but this file is the authority: the browser's number is only a
 * preview, and the value stored is always the one recomputed here.
 */

const GRAMS_PER_UNIT = {
  g: 1,
  tola: 11.6638038,          // the subcontinental tola, still the trade unit in Lahore
  masha: 11.6638038 / 12,    // a twelfth of a tola, used for small settings
  ozt: 31.1034768            // troy ounce, how bullion itself is quoted
};

const UNIT_LABEL = { g: 'g', tola: 'tola', masha: 'masha', ozt: 'ozt' };

/** A metric carat has been exactly 0.2 g since 1907. */
const GRAMS_PER_CARAT = 0.2;

/**
 * Bounds, not guesses. A full bridal parure — necklace, tikka, jhumar, two
 * bangles and earrings — lands under 500 g even in heavy 22k, so 5 kg is a
 * decimal point in the wrong place rather than an order. 100 ct is past every
 * stone this bench will ever set.
 */
const MAX_GRAMS = 5000;
const MAX_CARAT = 100;

const REGIONS = {
  PK: { code: 'PK', label: 'Pakistan & Middle East', currency: 'PKR', defaultUnit: 'tola' },
  UK: { code: 'UK', label: 'United Kingdom', currency: 'GBP', defaultUnit: 'g' },
  EU: { code: 'EU', label: 'Europe', currency: 'EUR', defaultUnit: 'g' }
};

/** Normalise whatever arrived to one of the three markets. */
function normaliseRegion(value) {
  const key = String(value || '').trim().toUpperCase();
  return REGIONS[key] ? key : 'PK';
}

function isKnownUnit(unit) {
  return Object.prototype.hasOwnProperty.call(GRAMS_PER_UNIT, String(unit || ''));
}

/**
 * A weight the customer typed, in grams.
 *
 * Returns null for anything absent or unusable rather than 0, so a caller can
 * tell "they did not say" apart from "they said nothing weighs anything".
 */
function toGrams(value, unit) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const factor = GRAMS_PER_UNIT[String(unit || 'g')];
  if (!factor) return null;
  return round(amount * factor, 3);
}

/** Round without the trailing float noise that 0.1 + 0.2 arithmetic leaves. */
function round(n, places) {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

/** Trim a number for display: 10 rather than 10.000, 11.66 rather than 11.6638. */
function tidy(n, places = 2) {
  return String(round(Number(n) || 0, places));
}

/**
 * "10 tola (116.64 g)" — the unit the customer chose, with the bench's unit
 * beside it, because the goldsmith quoting the piece works in grams and the
 * customer who wrote "10" does not.
 */
function describeMetalWeight({ metalWeight, metalWeightUnit, metalWeightGrams }) {
  if (!metalWeight || !metalWeightGrams) return '';
  const unit = UNIT_LABEL[metalWeightUnit] || 'g';
  if (metalWeightUnit === 'g') return `${tidy(metalWeight)} g`;
  return `${tidy(metalWeight)} ${unit} (${tidy(metalWeightGrams)} g)`;
}

/** "1.2 ct centre · 2.5 ct total · G–H / VS" — omitting whatever was left blank. */
function describeStones({ centreStoneCarat, totalCarat, stoneQuality }) {
  const parts = [];
  if (centreStoneCarat) parts.push(`${tidy(centreStoneCarat)} ct centre stone`);
  if (totalCarat) parts.push(`${tidy(totalCarat)} ct total`);
  if (stoneQuality) parts.push(stoneQuality);
  return parts.join(' · ');
}

module.exports = {
  GRAMS_PER_UNIT,
  GRAMS_PER_CARAT,
  UNIT_LABEL,
  MAX_GRAMS,
  MAX_CARAT,
  REGIONS,
  normaliseRegion,
  isKnownUnit,
  toGrams,
  round,
  tidy,
  describeMetalWeight,
  describeStones
};
