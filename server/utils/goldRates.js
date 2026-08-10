/**
 * Gold & silver rate engine.
 *
 * Accuracy notes that matter more than the code:
 *
 *  1. A tola is 11.6638038 g and a troy ounce is 31.1034768 g, so a tola is
 *     EXACTLY 0.375 troy oz. The previous implementation used 0.3621, which
 *     understated every PKR price by 3.44% (~Rs 15,500/tola at current spot).
 *
 *  2. International parity != the Pakistani retail rate. Sarafa association
 *     rates are quoted off the OPEN-MARKET dollar (above interbank) and carry
 *     a dealer premium. No free API publishes the APSGJA figure, so the gap is
 *     closed with an admin-set calibration: a premium percentage and, if
 *     wanted, an explicit open-market USD/PKR. Set those once and the ticker
 *     matches the local market exactly.
 */

// Exact, definitional constants — do not round these.
const GRAMS_PER_TOLA = 11.6638038;
const GRAMS_PER_TROY_OZ = 31.1034768;
const TOLA_PER_TROY_OZ = GRAMS_PER_TOLA / GRAMS_PER_TROY_OZ; // 0.375

const KARAT_PURITY = {
  24: 1,
  22: 22 / 24,
  21: 21 / 24,
  18: 18 / 24
};

// Anything outside these bands means the upstream feed returned junk.
const SANITY = {
  xauUsd: [500, 20000],
  xagUsd: [3, 500],
  usdPkr: [100, 1000],
  usdGbp: [0.3, 2]
};

const inRange = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi;

async function getJson(url, ms = 7000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LavionRates/1.0)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ *
 * Upstream feeds — all free, none requiring an API key
 * ------------------------------------------------------------------ */

const METAL_SOURCES = [
  {
    name: 'gold-api.com',
    spot: true,
    async fetch() {
      const [xau, xag] = await Promise.all([
        getJson('https://api.gold-api.com/price/XAU'),
        getJson('https://api.gold-api.com/price/XAG').catch(() => null)
      ]);
      return {
        xauUsd: parseFloat(xau && xau.price),
        xagUsd: xag ? parseFloat(xag.price) : NaN
      };
    }
  },
  {
    // COMEX futures, not spot: typically ~1-2% above spot in contango. Only a
    // degraded fallback, and flagged as such so the UI can say so.
    name: 'yahoo-futures',
    spot: false,
    async fetch() {
      const one = async (sym) => {
        const j = await getJson(
          `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`
        );
        return parseFloat(j?.chart?.result?.[0]?.meta?.regularMarketPrice);
      };
      const [xau, xag] = await Promise.all([one('GC=F'), one('SI=F').catch(() => NaN)]);
      return { xauUsd: xau, xagUsd: xag };
    }
  }
];

const FX_SOURCES = [
  {
    name: 'open.er-api.com',
    async fetch() {
      const j = await getJson('https://open.er-api.com/v6/latest/USD');
      return { usdPkr: parseFloat(j?.rates?.PKR), usdGbp: parseFloat(j?.rates?.GBP) };
    }
  },
  {
    name: 'exchangerate-api.com',
    async fetch() {
      const j = await getJson('https://api.exchangerate-api.com/v4/latest/USD');
      return { usdPkr: parseFloat(j?.rates?.PKR), usdGbp: parseFloat(j?.rates?.GBP) };
    }
  }
];

async function firstHealthy(sources, validate) {
  const tried = [];
  for (const src of sources) {
    try {
      const data = await src.fetch();
      if (validate(data)) return { ...data, source: src.name, isSpot: src.spot !== false, tried };
      tried.push(`${src.name}: out of range`);
    } catch (e) {
      tried.push(`${src.name}: ${e.message}`);
    }
  }
  return { source: null, tried };
}

/* ------------------------------------------------------------------ *
 * Computation
 * ------------------------------------------------------------------ */

/**
 * Build the full rate table.
 *
 * @param {object} m         { xauUsd, xagUsd }
 * @param {object} fx        { usdPkr, usdGbp }
 * @param {object} cal       { premiumPercent, usdPkrOverride }
 */
function computeRates(m, fx, cal = {}) {
  const premium = 1 + (Number(cal.premiumPercent) || 0) / 100;

  // Local retail is quoted off the open-market dollar when one is supplied.
  const usdPkr = inRange(Number(cal.usdPkrOverride), SANITY.usdPkr)
    ? Number(cal.usdPkrOverride)
    : fx.usdPkr;

  const pureTolaPkr = m.xauUsd * usdPkr * TOLA_PER_TROY_OZ * premium;
  const pureTolaGbp = m.xauUsd * fx.usdGbp * TOLA_PER_TROY_OZ;

  const perKarat = (base, k) => Math.round(base * KARAT_PURITY[k]);
  const r24Pkr = Math.round(pureTolaPkr);
  const r24Gbp = Math.round(pureTolaGbp);

  const silverTolaPkr = Number.isFinite(m.xagUsd)
    ? Math.round(m.xagUsd * usdPkr * TOLA_PER_TROY_OZ * premium)
    : null;

  return {
    // --- PKR ---
    rate24kPerTola: r24Pkr,
    rate24kPer10g: Math.round((pureTolaPkr / GRAMS_PER_TOLA) * 10),
    rate24kPer1g: Math.round(pureTolaPkr / GRAMS_PER_TOLA),
    rate22kPerTola: perKarat(pureTolaPkr, 22),
    rate22kPer10g: Math.round((pureTolaPkr * KARAT_PURITY[22] / GRAMS_PER_TOLA) * 10),
    rate21kPerTola: perKarat(pureTolaPkr, 21),
    rate18kPerTola: perKarat(pureTolaPkr, 18),
    rateSilverPerTola: silverTolaPkr,

    // --- GBP ---
    rate24kPerTolaGBP: r24Gbp,
    rate24kPer10gGBP: Math.round((pureTolaGbp / GRAMS_PER_TOLA) * 10),
    rate24kPer1gGBP: Math.round(pureTolaGbp / GRAMS_PER_TOLA),
    rate22kPerTolaGBP: perKarat(pureTolaGbp, 22),
    rate18kPerTolaGBP: perKarat(pureTolaGbp, 18),

    // --- provenance, so the UI can be honest about what it is showing ---
    xauUsd: Math.round(m.xauUsd * 100) / 100,
    xagUsd: Number.isFinite(m.xagUsd) ? Math.round(m.xagUsd * 100) / 100 : null,
    usdPkr: Math.round(usdPkr * 100) / 100,
    usdGbp: Math.round(fx.usdGbp * 10000) / 10000,
    premiumPercent: Number(cal.premiumPercent) || 0,
    usdPkrIsOverride: usdPkr !== fx.usdPkr,
    fetchedAt: new Date().toISOString()
  };
}

function karachiTimeLabel(suffix) {
  const t = new Date().toLocaleTimeString('en-PK', {
    timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit'
  });
  return `${t} PKT (${suffix})`;
}

/**
 * Fetch every input and build the table.
 * Returns { ok, rates, warnings[] } — never throws.
 */
async function fetchRates(cal = {}) {
  const warnings = [];

  const metals = await firstHealthy(METAL_SOURCES, d => inRange(d.xauUsd, SANITY.xauUsd));
  const fx = await firstHealthy(FX_SOURCES, d => inRange(d.usdPkr, SANITY.usdPkr) && inRange(d.usdGbp, SANITY.usdGbp));

  if (!metals.source) {
    warnings.push('All metal price sources failed: ' + metals.tried.join('; '));
    return { ok: false, rates: null, warnings };
  }
  if (!fx.source) {
    warnings.push('All FX sources failed: ' + fx.tried.join('; '));
    return { ok: false, rates: null, warnings };
  }

  if (!inRange(metals.xagUsd, SANITY.xagUsd)) {
    warnings.push('Silver price unavailable; silver rate omitted rather than guessed.');
    metals.xagUsd = NaN;
  }
  if (!metals.isSpot) {
    warnings.push(`Spot feed unavailable — using ${metals.source} futures, which run above spot.`);
  }
  if (metals.tried.length) warnings.push(...metals.tried);
  if (fx.tried.length) warnings.push(...fx.tried);

  const rates = computeRates(metals, fx, cal);
  rates.source = `${metals.source} + ${fx.source}`;
  rates.isSpot = metals.isSpot;
  rates.lastUpdated = karachiTimeLabel(metals.isSpot ? 'Live Market' : 'Futures Est.');

  return { ok: true, rates, warnings };
}

/** Rebuild the whole table from a manually entered 24k/tola figure. */
function fromManual24k(rate24kPerTola, previous = {}) {
  const base = Number(rate24kPerTola);
  if (!Number.isFinite(base) || base <= 0) throw new Error('A positive 24k per-tola rate is required.');

  const usdGbp = Number(previous.usdGbp) || 0.7422;
  const usdPkr = Number(previous.usdPkr) || 277.76;
  const gbpPerPkr = usdGbp / usdPkr;
  const baseGbp = base * gbpPerPkr;

  const perKarat = (b, k) => Math.round(b * KARAT_PURITY[k]);

  return {
    rate24kPerTola: Math.round(base),
    rate24kPer10g: Math.round((base / GRAMS_PER_TOLA) * 10),
    rate24kPer1g: Math.round(base / GRAMS_PER_TOLA),
    rate22kPerTola: perKarat(base, 22),
    rate22kPer10g: Math.round((base * KARAT_PURITY[22] / GRAMS_PER_TOLA) * 10),
    rate21kPerTola: perKarat(base, 21),
    rate18kPerTola: perKarat(base, 18),
    rateSilverPerTola: previous.rateSilverPerTola ?? null,

    rate24kPerTolaGBP: Math.round(baseGbp),
    rate24kPer10gGBP: Math.round((baseGbp / GRAMS_PER_TOLA) * 10),
    rate24kPer1gGBP: Math.round(baseGbp / GRAMS_PER_TOLA),
    rate22kPerTolaGBP: perKarat(baseGbp, 22),
    rate18kPerTolaGBP: perKarat(baseGbp, 18),

    xauUsd: previous.xauUsd ?? null,
    xagUsd: previous.xagUsd ?? null,
    usdPkr,
    usdGbp,
    premiumPercent: previous.premiumPercent ?? 0,
    usdPkrIsOverride: false,
    source: 'manual',
    isSpot: false,
    fetchedAt: new Date().toISOString(),
    lastUpdated: karachiTimeLabel('Manual')
  };
}

module.exports = {
  GRAMS_PER_TOLA,
  GRAMS_PER_TROY_OZ,
  TOLA_PER_TROY_OZ,
  KARAT_PURITY,
  computeRates,
  fetchRates,
  fromManual24k
};
