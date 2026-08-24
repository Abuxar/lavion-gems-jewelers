/**
 * What a commission is likely to cost.
 *
 * The studio used to ask the customer to pick their own budget band from a
 * dropdown, which told the shop nothing it could quote against and told the
 * customer nothing at all — a 10 tola 22k set is worth what gold is worth
 * today, and no customer knows that figure off the top of their head.
 *
 * Two very different kinds of number go into an estimate here, and the
 * difference matters:
 *
 *   Metal is priced from live spot. Gold, silver, platinum and palladium all
 *   have a public feed, so the metal line is not a guess — it is arithmetic
 *   on today's market, and it moves during the day.
 *
 *   Stones and labour are priced from a rate card. There is no free public
 *   feed for diamond or coloured-stone prices, so these are the shop's own
 *   judgement figures. They are kept in one table, exposed through the API,
 *   and overridable by the admin without a redeploy — because a hardcoded
 *   diamond price goes stale and quietly starts quoting the shop out of
 *   business.
 *
 * Everything produced here is a RANGE and is labelled as indicative. A firm
 * price needs a jeweller to look at the design; presenting a single figure
 * would imply a precision this cannot have.
 */

const GRAMS_PER_TROY_OZ = 31.1034768;

/* ------------------------------------------------------------------ *
 * The rate card
 * ------------------------------------------------------------------ */

const DEFAULT_CARD = {
  /**
   * Diamond price per carat, in USD, for a natural round brilliant at the
   * G–H / VS baseline. Per-carat price climbs steeply with size — a 2 ct
   * stone is worth far more than two 1 ct stones — so this is a tier table
   * read by the stone's own weight, not a single multiplier.
   */
  diamondTiersUsd: [
    { upTo: 0.25, perCarat: 900 },
    { upTo: 0.50, perCarat: 1700 },
    { upTo: 0.75, perCarat: 2900 },
    { upTo: 1.00, perCarat: 4800 },
    { upTo: 1.50, perCarat: 7000 },
    { upTo: 2.00, perCarat: 10500 },
    { upTo: 3.00, perCarat: 16000 },
    { upTo: 5.00, perCarat: 24000 },
    { upTo: Infinity, perCarat: 32000 }
  ],

  /** Small stones in a pavé or halo are sold by the parcel, far below tier. */
  meleeUsdPerCarat: 620,

  /** Colour and clarity, relative to the G–H / VS baseline above. */
  gradeFactors: {
    'D–F / VVS (Exceptional)': 1.6,
    'G–H / VS (Fine)': 1.0,
    'I–J / SI (Value)': 0.62,
    'Certified stone required': 1.05,
    '': 0.85                        // no preference stated — quote the middle
  },

  /**
   * Non-diamond stones, USD per carat at fine commercial quality. Flat rather
   * than tiered: size premiums on coloured stones depend far more on origin
   * and treatment than on weight, and pretending otherwise would be false
   * precision.
   */
  gemUsdPerCarat: {
    'GIA Certified Diamond': null,              // uses the tier table
    'Lab-Grown Diamond (IGI Certified)': null,  // tier table × labGrownFactor
    'Colombian Emerald': 1400,
    'Burmese Ruby': 2400,
    'Ceylon Royal Blue Sapphire': 1100,
    'South Sea Pearls': 260,
    'Kundan / Polki Glass Stone': 350,
    'No Gemstone (Solid Metal)': 0,
    'Custom Combination': null                  // cannot be priced blind
  },

  /**
   * Lab-grown stones are the same mineral and are graded the same way, but
   * the market prices them at a fraction of natural and that fraction has
   * been falling for years. Worth reviewing more often than anything else
   * on this card.
   */
  labGrownFactor: 0.15,

  /**
   * Labour. Charged as the greatest of three things, because no one of them
   * works alone: a percentage under-charges a light, fiddly 9ct ring, a
   * per-gram rate under-charges a heavy bridal set that takes weeks at the
   * bench, and both under-charge a 4 g solitaire whose real cost is the CAD,
   * the casting and the setting rather than the metal it happens to contain.
   * The minimum is what any bespoke commission costs to put through the
   * workshop at all.
   */
  making: {
    PK: { perGram: 1500, percent: 4, minimum: 12000, currency: 'PKR' },
    UK: { perGram: 28, percent: 22, minimum: 260, currency: 'GBP' },
    EU: { perGram: 32, percent: 22, minimum: 300, currency: 'EUR' }
  },

  /** Some pieces are simply more work per gram than others. */
  itemFactors: {
    'Custom Ring': 1.0,
    'Necklace / Calligraphy Pendant': 1.1,
    'Custom Earrings': 1.15,
    'Bracelet / Bangle': 1.1,
    'Bridal Parure Set': 1.3,
    "Men's Custom Ring/Cuff": 1.0
  },

  /**
   * Setting stones is labour the metal weight does not account for. Kept low
   * per carat because the bulk of the bench time is already in the making
   * minimum above — charging it twice was pricing a kundan set as though
   * every carat were a separate solitaire.
   */
  settingUsdPerCarat: 35,

  /**
   * Duty, tax and assay. A UK customer expects a price with VAT in it, and a
   * piece shipped from Lahore also clears customs and passes an Assay Office
   * before it reaches them. Pakistan is quoted ex-tax, as the local trade does.
   */
  dutyTaxPercent: { PK: 0, UK: 22, EU: 23 },

  /**
   * How wide the range is. Design complexity, stone availability and the
   * exact finish can move a bespoke piece this far either side, and a single
   * figure would promise a precision no one can honour before the sketch.
   */
  spreadPercent: 12,

  /** When these judgement figures were last reviewed. */
  revisedOn: '2026-08-17'
};

/* ------------------------------------------------------------------ *
 * Reading a metal name
 * ------------------------------------------------------------------ */

/**
 * Work out what a metal option is actually made of.
 *
 * The three markets name the same thing three ways — "22k Yellow Gold",
 * "22ct Yellow Gold (916)", "750 / 18K Yellow Gold" — so this reads the name
 * rather than matching a fixed list, and a name it cannot read returns null
 * instead of quietly defaulting to gold. Adding a metal to the form should
 * make the estimator say it cannot price it, not make it invent a price.
 */
function readMetal(name) {
  const s = String(name || '');
  if (!s) return null;

  if (/platinum/i.test(s)) return { kind: 'platinum', fineness: millesimal(s) || 0.95 };
  if (/palladium/i.test(s)) return { kind: 'palladium', fineness: millesimal(s) || 0.95 };
  if (/silver/i.test(s)) return { kind: 'silver', fineness: millesimal(s) || 0.925 };

  // Prefer the millesimal number when the name carries one: 375 and 585 are
  // the legally struck figures, where "9ct" and "14ct" are the nominal names.
  const fine = millesimal(s);
  if (fine) return { kind: 'gold', fineness: fine };

  const karat = s.match(/(\d{1,2})\s*(?:k|ct)\b/i);
  if (karat) {
    const k = Number(karat[1]);
    if (k >= 1 && k <= 24) return { kind: 'gold', fineness: k / 24 };
  }
  return null;
}

/** A three-digit fineness mark — 375, 585, 750, 916, 925, 950, 999. */
function millesimal(s) {
  const m = s.match(/\b(333|375|417|585|750|833|875|916|917|925|950|990|999)\b/);
  return m ? Number(m[1]) / 1000 : null;
}

/* ------------------------------------------------------------------ *
 * Currency
 * ------------------------------------------------------------------ */

const CURRENCY = { PK: 'PKR', UK: 'GBP', EU: 'EUR' };

/**
 * How many units of the market's currency one US dollar buys.
 *
 * Pakistan carries the same dealer premium the gold ticker uses, because a
 * bespoke piece is bought at the Sarafa counter price and not at
 * international parity. The UK and Europe buy at parity.
 */
function fxFor(region, rates, card) {
  if (region === 'PK') {
    const premium = 1 + (Number(rates.premiumPercent) || 0) / 100;
    const usdPkr = Number(rates.usdPkr);
    return Number.isFinite(usdPkr) ? usdPkr * premium : null;
  }
  if (region === 'UK') return Number.isFinite(Number(rates.usdGbp)) ? Number(rates.usdGbp) : null;
  if (region === 'EU') return Number.isFinite(Number(rates.usdEur)) ? Number(rates.usdEur) : null;
  return null;
}

/** Spot price of one gram of the pure metal, in USD. */
function usdPerGramPure(kind, rates) {
  const spot = {
    gold: rates.xauUsd,
    silver: rates.xagUsd,
    platinum: rates.xptUsd,
    palladium: rates.xpdUsd
  }[kind];
  const n = Number(spot);
  return Number.isFinite(n) && n > 0 ? n / GRAMS_PER_TROY_OZ : null;
}

/* ------------------------------------------------------------------ *
 * Stones
 * ------------------------------------------------------------------ */

/**
 * JSON has no Infinity, so the open-ended top tier comes back from the store
 * as null once an admin has saved the card. Treated as "no upper bound" here
 * rather than left to fall through the loop by luck.
 */
function tierPerCarat(carats, tiers) {
  for (const t of tiers) {
    const ceiling = t.upTo === null || t.upTo === undefined ? Infinity : t.upTo;
    if (carats <= ceiling) return t.perCarat;
  }
  return tiers[tiers.length - 1].perCarat;
}

/**
 * The stones, in USD.
 *
 * The centre stone is priced on its own weight at its own tier; whatever the
 * total carat weight has left over is melee — pavé, halo, shoulders — and is
 * priced far lower. Quoting the whole total at the centre stone's tier would
 * price a halo ring like a parcel of solitaires.
 */
function stoneCostUsd({ gemPreference, centreCt, totalCt, stoneQuality }, card) {
  const gem = String(gemPreference || '');
  const grade = card.gradeFactors[String(stoneQuality || '')] ?? card.gradeFactors[''] ?? 1;
  const lines = [];

  const isDiamond = /diamond/i.test(gem);
  const isLab = /lab-grown/i.test(gem);
  const flat = Object.prototype.hasOwnProperty.call(card.gemUsdPerCarat, gem)
    ? card.gemUsdPerCarat[gem] : undefined;

  // A combination we have not been told the make-up of cannot be priced, and
  // saying so is better than pricing it as though it were a plain solitaire.
  if (gem === 'Custom Combination') {
    return { usd: 0, lines, unpriceable: 'the stone combination you described' };
  }
  if (flat === 0) return { usd: 0, lines, unpriceable: null };
  if (flat === undefined && !isDiamond) {
    return { usd: 0, lines, unpriceable: gem || 'the stones' };
  }

  const centre = Math.max(0, Number(centreCt) || 0);
  const total = Math.max(0, Number(totalCt) || 0);
  const melee = Math.max(0, total - centre);

  const perCaratFor = ct => {
    if (!isDiamond) return flat;
    const base = tierPerCarat(ct, card.diamondTiersUsd) * grade;
    return isLab ? base * card.labGrownFactor : base;
  };

  let usd = 0;
  if (centre > 0) {
    const amount = centre * perCaratFor(centre);
    usd += amount;
    lines.push({ key: 'centre', carats: centre, usd: amount });
  }
  if (melee > 0) {
    const per = isDiamond
      ? card.meleeUsdPerCarat * grade * (isLab ? card.labGrownFactor : 1)
      : flat;
    const amount = melee * per;
    usd += amount;
    lines.push({ key: 'melee', carats: melee, usd: amount });
  }

  // Only the stones actually named get a setting charge.
  const setCarats = centre + melee;
  if (setCarats > 0) {
    const setting = setCarats * card.settingUsdPerCarat;
    usd += setting;
    lines.push({ key: 'setting', carats: setCarats, usd: setting });
  }

  return { usd, lines, unpriceable: null };
}

/* ------------------------------------------------------------------ *
 * The estimate
 * ------------------------------------------------------------------ */

/** Deep-merge admin overrides onto the defaults, one level of nesting. */
function mergeCard(overrides) {
  const card = { ...DEFAULT_CARD };
  if (!overrides || typeof overrides !== 'object') return card;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined) continue;
    card[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? { ...DEFAULT_CARD[key], ...value }
      : value;
  }
  return card;
}

/**
 * Price a commission.
 *
 * Returns { priced } false rather than throwing when something is missing —
 * a customer who has not entered a weight yet is the normal case, not an
 * error, and the form needs to say what it still needs rather than break.
 */
function estimate(input, rates, overrides) {
  const card = mergeCard(overrides);
  const region = ['PK', 'UK', 'EU'].includes(input.region) ? input.region : 'PK';
  const currency = CURRENCY[region];

  const grams = Number(input.grams) || 0;
  const needs = [];
  if (!grams) needs.push('a metal weight');

  const metal = readMetal(input.metal);
  if (!metal) needs.push('a metal we can price');

  const fx = fxFor(region, rates || {}, card);
  const perGramUsd = metal ? usdPerGramPure(metal.kind, rates || {}) : null;
  // Only worth reporting a missing feed for a metal we could otherwise price;
  // saying both "we cannot read this metal" and "we have no price for it" is
  // one problem described twice.
  if (metal && (!fx || !perGramUsd)) {
    needs.push(`today's ${metal.kind} price`);
  }

  if (needs.length) {
    return { priced: false, needs, currency, region, revisedOn: card.revisedOn };
  }

  // --- metal -------------------------------------------------------------
  const metalUsd = grams * metal.fineness * perGramUsd;

  // --- stones ------------------------------------------------------------
  const stones = stoneCostUsd({
    gemPreference: input.gemPreference,
    centreCt: input.centreCt,
    totalCt: input.totalCt,
    stoneQuality: input.stoneQuality
  }, card);

  // --- labour ------------------------------------------------------------
  const makingRule = card.making[region];
  const itemFactor = card.itemFactors[input.itemType] || 1;
  // The per-gram and minimum figures are quoted in the market's own currency,
  // so they are converted to USD before being compared with the percentage.
  const makingUsd = Math.max(
    (makingRule.perGram / fx) * grams,
    metalUsd * makingRule.percent / 100,
    (makingRule.minimum || 0) / fx
  ) * itemFactor;

  // --- duty and tax ------------------------------------------------------
  const beforeTax = metalUsd + stones.usd + makingUsd;
  const taxPercent = card.dutyTaxPercent[region] || 0;
  const taxUsd = beforeTax * taxPercent / 100;

  const totalUsd = beforeTax + taxUsd;
  const toLocal = usd => usd * fx;

  const spread = card.spreadPercent / 100;
  const mid = toLocal(totalUsd);

  const lines = [
    { label: `Metal — ${round1(grams)} g at ${Math.round(metal.fineness * 1000)} fineness`, amount: toLocal(metalUsd) }
  ];
  if (stones.usd > 0) {
    const stoneLabel = stones.lines.filter(l => l.key !== 'setting')
      .map(l => `${round2(l.carats)} ct`).join(' + ');
    lines.push({ label: `Stones — ${stoneLabel}`, amount: toLocal(stones.usd - settingOf(stones)) });
    if (settingOf(stones) > 0) {
      lines.push({ label: 'Stone setting', amount: toLocal(settingOf(stones)) });
    }
  }
  lines.push({ label: 'Craftsmanship & finishing', amount: toLocal(makingUsd) });
  if (taxUsd > 0) {
    lines.push({
      label: region === 'UK' ? 'Duty, VAT & hallmarking' : 'Duty & VAT',
      amount: toLocal(taxUsd)
    });
  }

  return {
    priced: true,
    region,
    currency,
    low: roundMoney(mid * (1 - spread), currency),
    high: roundMoney(mid * (1 + spread), currency),
    mid: roundMoney(mid, currency),
    lines: lines.map(l => ({ label: l.label, amount: roundMoney(l.amount, currency) })),
    unpriceable: stones.unpriceable,
    spreadPercent: card.spreadPercent,
    revisedOn: card.revisedOn,
    basis: {
      metal: metal.kind,
      fineness: metal.fineness,
      grams: round2(grams),
      pricePerGram: roundMoney(toLocal(perGramUsd * metal.fineness), currency),
      asOf: rates && rates.lastUpdated ? rates.lastUpdated : null
    }
  };
}

const settingOf = stones => (stones.lines.find(l => l.key === 'setting') || { usd: 0 }).usd;

/**
 * Round to something a person would say out loud.
 *
 * A quotation reading "PKR 4,183,617" claims a precision this does not have,
 * and an estimate that moves by three rupees when gold ticks looks broken.
 * Rupees round to the nearest thousand, pounds and euros to the nearest ten.
 */
function roundMoney(amount, currency) {
  const n = Number(amount) || 0;
  const step = currency === 'PKR' ? 1000 : 10;
  return Math.max(0, Math.round(n / step) * step);
}

const round1 = n => Math.round(Number(n) * 10) / 10;
const round2 = n => Math.round(Number(n) * 100) / 100;

/** How the range is written out, once, so every surface words it the same. */
function formatRange(est) {
  if (!est || !est.priced) return '';
  const money = n => `${est.currency} ${Number(n).toLocaleString('en-US')}`;
  return `${money(est.low)} – ${money(est.high)}`;
}


/* ------------------------------------------------------------------ *
 * The stone market view
 * ------------------------------------------------------------------ */

/**
 * How long the judgement figures may go unreviewed before the panel says so.
 *
 * A quarter. Diamond prices do move — the published indices drift a few per
 * cent a quarter and lab-grown has fallen every year — but they do not move
 * hourly the way spot metal does, so nagging weekly would train the admin to
 * ignore the warning. What must not happen is the studio quoting a rate card
 * nobody has looked at since last year.
 */
const STONE_REVIEW_DAYS = 90;

/**
 * What is live here, and what is not.
 *
 * Gold has a public spot price because an ounce of gold is an ounce of gold.
 * A diamond is not fungible — two stones of the same weight differ in cut,
 * colour, clarity and fluorescence, and the trade prices them off the
 * Rapaport Price List, which is a paid subscription whose redistribution is
 * contractually restricted. Coloured stones have no index at all; origin and
 * treatment matter more than weight. So there is no free feed to point at,
 * and inventing one would put a "live" badge over guesses on quotes for real
 * money.
 *
 * What IS live is the half nobody was being shown. The card is written in
 * USD; the shop quotes in PKR, GBP and EUR; and the dollar rate is refreshed
 * with the metal feed every five minutes. So what a stone costs the customer
 * already moves on its own — this turns that into something you can see.
 *
 * Every price carries a `source`, so if a licensed feed is ever subscribed to
 * it can mark its own lines `feed` and the panel will distinguish them
 * without a rewrite.
 */
function stoneMarket(card, rates) {
  const fx = {
    PKR: fxFor('PK', rates, card),
    GBP: fxFor('UK', rates, card),
    EUR: fxFor('EU', rates, card)
  };

  /** One USD figure, alongside what it is worth in each market today. */
  const priced = (usd, source = 'card') => {
    const n = Number(usd);
    if (!Number.isFinite(n)) return null;
    const local = {};
    for (const [code, rate] of Object.entries(fx)) {
      local[code] = Number.isFinite(rate) ? roundMoney(n * rate, code) : null;
    }
    return { usd: n, local, source };
  };

  const tiers = Array.isArray(card.diamondTiersUsd) ? card.diamondTiersUsd : [];

  /** "0.50 – 0.75 ct" rather than a bare ceiling, which reads as a price band. */
  const bands = tiers.map((t, i) => {
    const from = i === 0 ? 0 : tiers[i - 1].upTo;
    const to = t.upTo === null || t.upTo === undefined ? null : t.upTo;
    const label = to === null
      ? `${Number(from).toFixed(2)} ct and above`
      : `${Number(from).toFixed(2)} – ${Number(to).toFixed(2)} ct`;
    return { label, from: Number(from), to, perCarat: t.perCarat };
  });

  const labFactor = Number(card.labGrownFactor);
  const hasLab = Number.isFinite(labFactor) && labFactor > 0;

  // Only stones the card can actually put a number on. The nulls are the
  // entries priced from the tier table or refused outright ("Custom
  // Combination"), and listing them here as blank rows would suggest the
  // feed had failed to fill them in.
  const gems = Object.entries(card.gemUsdPerCarat || {})
    .filter(([, usd]) => Number.isFinite(Number(usd)) && Number(usd) > 0)
    .map(([name, usd]) => ({ name, ...priced(usd) }));

  return {
    /**
     * The FX behind every converted figure, so the panel can show its
     * working rather than asking to be trusted.
     */
    fx: {
      usdPkr: fx.PKR,
      usdGbp: fx.GBP,
      usdEur: fx.EUR,
      // Pakistan buys at the Sarafa counter, not at international parity, so
      // the same premium the gold ticker carries is in the PKR figure above.
      pkrPremiumPercent: Number(rates.premiumPercent) || 0,
      asOf: rates.lastUpdated || null,
      isSpot: rates.isSpot !== false
    },
    review: reviewState(card.revisedOn),
    diamond: {
      // `perCarat` is deliberately not spread through: it is the natural
      // anchor, and carrying it onto a lab-grown row would print the natural
      // price beside the lab-grown one as though both applied. `usd` is the
      // price of that row, whichever table it is in.
      natural: bands.map(({ label, from, to, perCarat }) => ({
        label, from, to, ...priced(perCarat)
      })),
      labGrown: hasLab
        ? bands.map(({ label, from, to, perCarat }) => ({
            label, from, to, ...priced(perCarat * labFactor)
          }))
        : [],
      labGrownFactor: hasLab ? labFactor : null,
      melee: priced(card.meleeUsdPerCarat),
      setting: priced(card.settingUsdPerCarat)
    },
    gems,
    /**
     * Named so the panel does not have to hardcode the explanation, and so a
     * later licensed feed can change this one string rather than the copy in
     * two admin panels.
     */
    anchor: {
      source: 'card',
      label: 'Your rate card',
      note: 'Per-carat figures in USD are the shop’s own. Diamonds have no public spot feed — the trade prices off the Rapaport list, which is a paid licence.'
    }
  };
}

/** Days since the judgement figures were last reviewed, and whether that is too long. */
function reviewState(revisedOn) {
  const parsed = revisedOn ? Date.parse(`${revisedOn}T00:00:00Z`) : NaN;
  if (!Number.isFinite(parsed)) {
    return { revisedOn: revisedOn || null, daysSince: null, staleAfterDays: STONE_REVIEW_DAYS, stale: true };
  }
  const daysSince = Math.max(0, Math.floor((Date.now() - parsed) / 86400000));
  return {
    revisedOn,
    daysSince,
    staleAfterDays: STONE_REVIEW_DAYS,
    stale: daysSince > STONE_REVIEW_DAYS
  };
}

module.exports = {
  DEFAULT_CARD,
  CURRENCY,
  STONE_REVIEW_DAYS,
  readMetal,
  mergeCard,
  estimate,
  stoneMarket,
  formatRange,
  roundMoney
};
