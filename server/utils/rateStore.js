/**
 * The live rate table, its cache and its persistence.
 *
 * This used to live inside routes/goldRates.js, which was fine while the
 * ticker was the only thing that wanted rates. The bespoke estimator wants
 * them too, and a route importing another route to get at them would be the
 * wrong shape — so the store moved here and both routes read from it.
 *
 * Keeping one memo also keeps one upstream call: an estimate and a ticker
 * refresh landing in the same request no longer fetch spot gold twice.
 */
const { readData, writeDataOrThrow } = require('./db');
const { isMongoConnected } = require('../config/db');
const GoldRate = require('../models/GoldRate');
const engine = require('./goldRates');

// Short enough to feel live, long enough not to hammer free upstreams.
const CACHE_TTL_MS = 5 * 60 * 1000;

let memo = { rates: null, at: 0 };

async function loadStored() {
  if (isMongoConnected()) {
    const doc = await GoldRate.findOne().sort({ updatedAt: -1 }).lean();
    if (doc) return doc;
  }
  const db = readData();
  return db.goldRates || null;
}

async function saveStored(rates) {
  if (isMongoConnected()) {
    await GoldRate.findOneAndUpdate({}, { $set: rates }, { upsert: true, new: true, sort: { updatedAt: -1 } });
  }
  // Mirror to the file DB so local development keeps working without Mongo.
  try {
    const db = readData();
    db.goldRates = { ...(db.goldRates || {}), ...rates };
    writeDataOrThrow(db);
  } catch (e) {
    // Read-only filesystem (Vercel) — Mongo is the source of truth there.
  }
}

async function loadCalibration() {
  const stored = await loadStored();
  return {
    premiumPercent: Number(stored?.premiumPercent) || 0,
    usdPkrOverride: Number(stored?.usdPkrOverride) || null
  };
}

/** Refresh from upstream, falling back to the last good stored table. */
async function refresh(force = false) {
  const fresh = !force && memo.rates && (Date.now() - memo.at < CACHE_TTL_MS);
  if (fresh) return { rates: memo.rates, cached: true, warnings: [] };

  const cal = await loadCalibration();
  const { ok, rates, warnings } = await engine.fetchRates(cal);

  if (!ok) {
    const stored = await loadStored();
    if (stored) {
      return {
        rates: { ...stored, lastUpdated: (stored.lastUpdated || '') + ' (cached — feed unavailable)' },
        cached: true,
        warnings
      };
    }
    return { rates: null, cached: false, warnings };
  }

  // Carry calibration through so the client can display it.
  rates.premiumPercent = cal.premiumPercent;
  rates.usdPkrOverride = cal.usdPkrOverride;

  memo = { rates, at: Date.now() };
  await saveStored(rates);
  return { rates, cached: false, warnings };
}

/** Drop the cache so the next read rebuilds — used after a calibration change. */
function invalidate() {
  memo = { rates: null, at: 0 };
}

/** Replace the cached table outright, after a manual override. */
function put(rates) {
  memo = { rates, at: Date.now() };
}

module.exports = { loadStored, saveStored, loadCalibration, refresh, invalidate, put };
