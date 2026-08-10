const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { isMongoConnected } = require('../config/db');
const GoldRate = require('../models/GoldRate');
const engine = require('../utils/goldRates');

// Short enough to feel live, long enough not to hammer free upstreams.
const CACHE_TTL_MS = 5 * 60 * 1000;

let memo = { rates: null, at: 0 };

/* ------------------------------------------------------------------ *
 * Persistence — Mongo when available, JSON file otherwise
 * ------------------------------------------------------------------ */

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
    writeData(db);
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

/* ------------------------------------------------------------------ *
 * Routes
 * ------------------------------------------------------------------ */

// GET /api/gold-rates
router.get('/', async (req, res) => {
  try {
    const { rates, cached, warnings } = await refresh(req.query.force === '1');
    if (!rates) {
      return res.status(503).json({
        success: false,
        message: 'Live rates are temporarily unavailable.',
        warnings
      });
    }
    res.json({ success: true, goldRates: rates, live: !cached, cached, warnings });
  } catch (error) {
    console.error('[GoldRate] GET error:', error);
    res.status(500).json({ success: false, message: 'Could not load gold rates.' });
  }
});

// POST /api/gold-rates/sync — force an upstream refresh
router.post('/sync', async (req, res) => {
  try {
    const { rates, warnings } = await refresh(true);
    if (!rates) {
      return res.status(503).json({ success: false, message: 'Rate feeds are unreachable.', warnings });
    }
    res.json({
      success: true,
      message: `Synced — Rs. ${rates.rate24kPerTola.toLocaleString()} per tola (24K)`,
      goldRates: rates,
      warnings
    });
  } catch (error) {
    console.error('[GoldRate] sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync live rates.' });
  }
});

/**
 * PUT /api/gold-rates — manual override of the 24k per-tola figure.
 * Everything else is recomputed from it so the karats stay consistent.
 */
router.put('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const previous = (await loadStored()) || {};
    const rates = engine.fromManual24k(req.body.rate24kPerTola, previous);
    memo = { rates, at: Date.now() };
    await saveStored(rates);
    res.json({ success: true, message: 'Gold rates updated.', goldRates: rates });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /api/gold-rates/calibration — the knob that makes the ticker match
 * the local Sarafa quote exactly.
 *
 * premiumPercent  : uplift over international parity (dealer premium + the
 *                   gap between interbank and open-market USD)
 * usdPkrOverride  : quote against the open-market dollar instead of interbank
 */
router.patch('/calibration', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { premiumPercent, usdPkrOverride } = req.body || {};

    const premium = premiumPercent === undefined || premiumPercent === null || premiumPercent === ''
      ? 0 : Number(premiumPercent);
    if (!Number.isFinite(premium) || premium < -20 || premium > 50) {
      return res.status(400).json({ success: false, message: 'Premium must be between -20% and 50%.' });
    }

    let override = null;
    if (usdPkrOverride !== undefined && usdPkrOverride !== null && usdPkrOverride !== '') {
      override = Number(usdPkrOverride);
      if (!Number.isFinite(override) || override < 100 || override > 1000) {
        return res.status(400).json({ success: false, message: 'USD/PKR override must be between 100 and 1000.' });
      }
    }

    await saveStored({ premiumPercent: premium, usdPkrOverride: override });
    memo = { rates: null, at: 0 }; // force a rebuild on the next read

    const { rates, warnings } = await refresh(true);
    res.json({
      success: true,
      message: `Calibration saved. 24K now Rs. ${rates ? rates.rate24kPerTola.toLocaleString() : 'n/a'} per tola.`,
      goldRates: rates,
      warnings
    });
  } catch (error) {
    console.error('[GoldRate] calibration error:', error);
    res.status(500).json({ success: false, message: 'Could not save calibration.' });
  }
});

/**
 * POST /api/gold-rates/calibrate-to — give it today's Sarafa 24k/tola figure
 * and it solves for the premium that reproduces it, instead of making the
 * shopkeeper work out a percentage by hand.
 */
router.post('/calibrate-to', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const target = Number(req.body.rate24kPerTola);
    if (!Number.isFinite(target) || target <= 0) {
      return res.status(400).json({ success: false, message: 'Provide the market 24k rate per tola.' });
    }

    // Parity with no premium, so we can measure the gap.
    const { ok, rates: parity, warnings } = await engine.fetchRates({ premiumPercent: 0 });
    if (!ok) {
      return res.status(503).json({ success: false, message: 'Cannot reach the rate feed to calibrate.', warnings });
    }

    const premium = Math.round(((target / parity.rate24kPerTola) - 1) * 10000) / 100;
    if (premium < -20 || premium > 50) {
      return res.status(400).json({
        success: false,
        message: `That target implies a ${premium}% premium over the international parity of Rs. ${parity.rate24kPerTola.toLocaleString()}, which looks wrong. Check the figure.`
      });
    }

    await saveStored({ premiumPercent: premium });
    memo = { rates: null, at: 0 };
    const refreshed = await refresh(true);

    res.json({
      success: true,
      message: `Calibrated to Rs. ${target.toLocaleString()} per tola (premium ${premium}% over parity).`,
      premiumPercent: premium,
      parity24k: parity.rate24kPerTola,
      goldRates: refreshed.rates
    });
  } catch (error) {
    console.error('[GoldRate] calibrate-to error:', error);
    res.status(500).json({ success: false, message: 'Calibration failed.' });
  }
});

module.exports = router;
