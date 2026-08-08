const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

let lastFetchTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

async function fetchLiveGoldRatesFromMarket() {
  try {
    let xauUsd = 0;
    let usdPkr = 0;
    let usdGbp = 0;

    // Fetch Gold Spot Price (XAU/USD)
    try {
      const goldRes = await fetch('https://api.gold-api.com/price/XAU').then(r => r.json());
      if (goldRes && goldRes.price) xauUsd = parseFloat(goldRes.price);
    } catch (e) {
      console.error('[GoldRate] Primary Gold API error:', e.message);
    }

    if (!xauUsd) {
      try {
        const goldFallback = await fetch('https://data-asg.goldprice.org/dbXRates/USD').then(r => r.json());
        if (goldFallback && goldFallback.items && goldFallback.items[0]) {
          xauUsd = parseFloat(goldFallback.items[0].xauPrice);
        }
      } catch (e) {}
    }

    // Fetch Live Exchange Rates (USD to PKR & GBP)
    try {
      const fxRes = await fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json());
      if (fxRes && fxRes.rates) {
        if (fxRes.rates.PKR) usdPkr = parseFloat(fxRes.rates.PKR);
        if (fxRes.rates.GBP) usdGbp = parseFloat(fxRes.rates.GBP);
      }
    } catch (e) {
      console.error('[GoldRate] FX API error:', e.message);
    }

    if (!usdPkr || !usdGbp) {
      try {
        const fxFallback = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(r => r.json());
        if (fxFallback && fxFallback.rates) {
          if (!usdPkr && fxFallback.rates.PKR) usdPkr = parseFloat(fxFallback.rates.PKR);
          if (!usdGbp && fxFallback.rates.GBP) usdGbp = parseFloat(fxFallback.rates.GBP);
        }
      } catch (e) {}
    }

    // Default fallbacks if network unreachable
    if (!xauUsd) xauUsd = 4340;
    if (!usdPkr) usdPkr = 277.8;
    if (!usdGbp) usdGbp = 0.743;

    // Live Gold Market calculation (PKR & GBP)
    const baseTolaPkr = xauUsd * usdPkr * 0.3621;
    const baseTolaGbp = xauUsd * usdGbp * 0.3621;

    const r24Pkr = Math.round(baseTolaPkr);
    const r24Gbp = Math.round(baseTolaGbp);

    const rates = {
      rate24kPerTola: r24Pkr,
      rate24kPer10g: Math.round(r24Pkr / 1.16638),
      rate24kPer1g: Math.round(r24Pkr / 11.6638),
      rate22kPerTola: Math.round(r24Pkr * (22 / 24)),
      rate18kPerTola: Math.round(r24Pkr * (18 / 24)),
      rateSilverPerTola: Math.round(30 * usdPkr * 0.3621) || 4850,
      // GBP (£) Rates
      rate24kPerTolaGBP: r24Gbp,
      rate24kPer10gGBP: Math.round(r24Gbp / 1.16638),
      rate24kPer1gGBP: Math.round(r24Gbp / 11.6638),
      rate22kPerTolaGBP: Math.round(r24Gbp * (22 / 24)),
      rate18kPerTolaGBP: Math.round(r24Gbp * (18 / 24)),
      xauUsd: Math.round(xauUsd),
      usdPkr: Math.round(usdPkr * 100) / 100,
      usdGbp: Math.round(usdGbp * 1000) / 1000,
      lastUpdated: new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }) + ' PKT (Live Gold Market)'
    };

    const db = readData();
    db.goldRates = rates;
    writeData(db);
    lastFetchTime = Date.now();

    return rates;
  } catch (err) {
    console.error('[GoldRate] Live fetch error:', err.message);
    const db = readData();
    return db.goldRates || {
      rate24kPerTola: 463800,
      rate24kPer10g: 397641,
      rate24kPer1g: 39764,
      rate22kPerTola: 425150,
      rate18kPerTola: 347850,
      rateSilverPerTola: 4850,
      lastUpdated: 'Live Market Data'
    };
  }
}

// GET /api/gold-rates - Get active live market gold rates
router.get('/', async (req, res) => {
  const db = readData();
  const now = Date.now();

  if (!db.goldRates || (now - lastFetchTime > CACHE_TTL_MS)) {
    const liveRates = await fetchLiveGoldRatesFromMarket();
    return res.json({ success: true, goldRates: liveRates, live: true });
  }

  res.json({ success: true, goldRates: db.goldRates, live: true });
});

// POST /api/gold-rates/sync - Sync with live Sarafa Market Pakistan rate
router.post('/sync', async (req, res) => {
  try {
    const liveRates = await fetchLiveGoldRatesFromMarket();
    res.json({ success: true, message: `Synced with live Sarafa market rate (Rs. ${liveRates.rate24kPerTola.toLocaleString()}/Tola)`, goldRates: liveRates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to sync live rates.', error: error.message });
  }
});

// PUT /api/gold-rates - Manual rate override (Admin)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { rate24kPerTola } = req.body;
    const r24 = parseFloat(rate24kPerTola) || 463800;

    const rates = {
      rate24kPerTola: Math.round(r24),
      rate24kPer10g: Math.round(r24 / 1.16638),
      rate24kPer1g: Math.round(r24 / 11.6638),
      rate22kPerTola: Math.round(r24 * (22 / 24)),
      rate18kPerTola: Math.round(r24 * (18 / 24)),
      rateSilverPerTola: 4850,
      lastUpdated: new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }) + ' PKT (Manual)'
    };

    const db = readData();
    db.goldRates = rates;
    writeData(db);
    lastFetchTime = Date.now();

    res.json({ success: true, message: 'Gold rates updated successfully!', goldRates: rates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update gold rates.', error: error.message });
  }
});

module.exports = router;
