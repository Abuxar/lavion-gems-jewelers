const express = require('express');
const router = express.Router();
const { failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const engine = require('../utils/goldRates');
const pricing = require('../utils/pricing');
// The table, its cache and its persistence live in utils/rateStore so the
// bespoke estimator can read the same rates without importing this route.
const { loadStored, saveStored, refresh, invalidate, put } = require('../utils/rateStore');

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
    failWith(res, error, 'Could not load gold rates.');
  }
});

/**
 * GET /api/gold-rates/rate-card
 *
 * Everything the studio page needs to price a commission in the browser:
 * today's metal spot, the FX it converts at, and the stone and labour table.
 *
 * The estimate is computed client-side from this so it updates as the
 * customer types rather than after a round trip — a cold serverless call can
 * take seconds, and an estimate that lags the form reads as broken. The
 * server recomputes it from the same card when the brief is submitted, so
 * what gets stored is never whatever the browser happened to say.
 */
router.get('/rate-card', async (req, res) => {
  try {
    const { rates, warnings } = await refresh(false);
    if (!rates) {
      return res.status(503).json({
        success: false,
        message: 'Live metal rates are temporarily unavailable, so we cannot estimate right now.',
        warnings
      });
    }
    const stored = await loadStored();
    const card = pricing.mergeCard(stored && stored.rateCard);
    res.json({
      success: true,
      card,
      /**
       * The same card, converted at today's dollar rate.
       *
       * The per-carat figures are in USD and the shop quotes in PKR, GBP and
       * EUR, so what a stone actually costs a customer moves every time the
       * FX feed refreshes — it just had nowhere to be seen. This is that,
       * plus how long the USD figures have gone unreviewed.
       */
      stoneMarket: pricing.stoneMarket(card, rates),
      rates: {
        xauUsd: rates.xauUsd, xagUsd: rates.xagUsd,
        xptUsd: rates.xptUsd, xpdUsd: rates.xpdUsd,
        usdPkr: rates.usdPkr, usdGbp: rates.usdGbp, usdEur: rates.usdEur,
        premiumPercent: rates.premiumPercent || 0,
        rate24kPerTola: rates.rate24kPerTola,
        rate22kPerTola: rates.rate22kPerTola,
        lastUpdated: rates.lastUpdated,
        isSpot: rates.isSpot !== false
      }
    });
  } catch (error) {
    console.error('[GoldRate] rate-card error:', error);
    failWith(res, error, 'Could not load the bespoke rate card.');
  }
});

/**
 * PATCH /api/gold-rates/rate-card — adjust the judgement half of the card.
 *
 * Metal needs no such control: it comes from a live feed. Stone prices,
 * labour and duty are the shop's own numbers, and they have to be changeable
 * from the admin panel or they silently rot until someone notices the studio
 * has been quoting last year's diamond market.
 */
router.patch('/rate-card', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const patch = req.body && req.body.card;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      return res.status(400).json({ success: false, message: 'Send a card object with the values to change.' });
    }

    // Only keys the card actually defines, so a typo becomes an error the
    // admin sees rather than a setting that appears to save and does nothing.
    const unknown = Object.keys(patch).filter(k => !(k in pricing.DEFAULT_CARD));
    if (unknown.length) {
      return res.status(400).json({
        success: false,
        message: `Not part of the rate card: ${unknown.join(', ')}.`
      });
    }

    // Read once: the stored overrides are both what the patch merges onto and
    // what gets written back, and re-reading between the two invites a second
    // admin's change to be silently overwritten.
    const existing = ((await loadStored()) || {}).rateCard || {};

    /**
     * The shop's clock, not the browser's and not UTC.
     *
     * "Last revised" is stamped here rather than accepted from the client:
     * an admin saving at three in the morning in Lahore is still on UTC
     * yesterday, and a panel that answers a save by showing yesterday's date
     * reads as a save that did not take. Asia/Karachi is the same zone the
     * gold ticker timestamps itself in.
     */
    patch.revisedOn = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

    const nextOverrides = { ...existing, ...patch };
    const merged = pricing.mergeCard(nextOverrides);

    // A negative price or a spread wider than the estimate is meaningless,
    // and would be discovered by a customer rather than here.
    const problems = [];
    if (!(merged.spreadPercent >= 0 && merged.spreadPercent <= 60)) {
      problems.push('The spread must be between 0% and 60%.');
    }
    if (!(merged.labGrownFactor > 0 && merged.labGrownFactor <= 1)) {
      problems.push('The lab-grown factor must be above 0 and no more than 1.');
    }
    for (const [region, rule] of Object.entries(merged.making || {})) {
      if (!(rule.perGram >= 0) || !(rule.percent >= 0) || !((rule.minimum || 0) >= 0)) {
        problems.push(`The ${region} making charges must not be negative.`);
      }
    }
    for (const [region, pct] of Object.entries(merged.dutyTaxPercent || {})) {
      if (!(pct >= 0 && pct <= 100)) problems.push(`${region} duty must be between 0% and 100%.`);
    }
    for (const [gem, price] of Object.entries(merged.gemUsdPerCarat || {})) {
      if (price !== null && !(price >= 0)) problems.push(`The price for ${gem} must not be negative.`);
    }
    if (problems.length) {
      return res.status(400).json({ success: false, message: problems.join(' ') });
    }

    await saveStored({ rateCard: nextOverrides });

    // The converted view goes back with the save so the panel can repaint from
    // the server's own arithmetic rather than recomputing the conversion in
    // the browser and risking the two disagreeing on screen. A failed rate
    // refresh must not fail the save — the card is stored either way.
    let stoneMarket = null;
    try {
      const { rates } = await refresh(false);
      if (rates) stoneMarket = pricing.stoneMarket(merged, rates);
    } catch (e) {
      console.error('[GoldRate] stone market recompute after save:', e.message);
    }

    res.json({
      success: true,
      message: 'Bespoke rate card updated.',
      card: merged,
      stoneMarket
    });
  } catch (error) {
    console.error('[GoldRate] rate-card patch error:', error);
    failWith(res, error, 'Could not save the rate card.');
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
    failWith(res, error, 'Failed to sync live rates.');
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
    put(rates);
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
    invalidate(); // force a rebuild on the next read

    const { rates, warnings } = await refresh(true);
    res.json({
      success: true,
      message: `Calibration saved. 24K now Rs. ${rates ? rates.rate24kPerTola.toLocaleString() : 'n/a'} per tola.`,
      goldRates: rates,
      warnings
    });
  } catch (error) {
    console.error('[GoldRate] calibration error:', error);
    failWith(res, error, 'Could not save calibration.');
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
    invalidate();
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
    failWith(res, error, 'Calibration failed.');
  }
});

module.exports = router;
