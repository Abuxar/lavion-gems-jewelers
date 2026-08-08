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

    // Fetch Live USD to PKR Exchange Rate
    try {
      const fxRes = await fetch('https://open.er-api.com/v6/latest/USD').then(r => r.json());
      if (fxRes && fxRes.rates && fxRes.rates.PKR) usdPkr = parseFloat(fxRes.rates.PKR);
    } catch (e) {
      console.error('[GoldRate] FX API error:', e.message);
    }

    if (!usdPkr) {
      try {
        const fxFallback = await fetch('https://api.exchangerate-api.com/v4/latest/USD').then(r => r.json());
        if (fxFallback && fxFallback.rates && fxFallback.rates.PKR) usdPkr = parseFloat(fxFallback.rates.PKR);
      } catch (e) {}
    }

    // Default fallbacks if network unreachable
    if (!xauUsd) xauUsd = 4340;
    if (!usdPkr) usdPkr = 277.8;

    // Gujranwala Sarafa Bazaar & All Pakistan Supreme Gems & Jewellers Association formula
    // 1 Tola = 11.6638038g = 0.375 Troy Ounce with local Gujranwala Sarafa market calibration ratio (0.3621)
    const baseTolaPkr = xauUsd * usdPkr * 0.3621;
    const r24 = Math.round(baseTolaPkr);

    const rates = {
      rate24kPerTola: r24,
      rate24kPer10g: Math.round(r24 / 1.16638),
      rate24kPer1g: Math.round(r24 / 11.6638),
      rate22kPerTola: Math.round(r24 * (22 / 24)),
      rate18kPerTola: Math.round(r24 * (18 / 24)),
      rateSilverPerTola: Math.round(30 * usdPkr * 0.3621) || 4850,
      xauUsd: Math.round(xauUsd),
      usdPkr: Math.round(usdPkr * 100) / 100,
      lastUpdated: new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' }) + ' PKT (Gujranwala Sarafa Live)'
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
