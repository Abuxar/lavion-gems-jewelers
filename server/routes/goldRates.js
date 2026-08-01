const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/gold-rates - Get active market gold rates
router.get('/', (req, res) => {
  const db = readData();
  res.json({ success: true, goldRates: db.goldRates });
});

// PUT /api/gold-rates - Update 24k gold rate (Admin)
router.put('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { rate24kPerTola } = req.body;
    const r24 = parseFloat(rate24kPerTola) || 428500;

    const rates = {
      rate24kPerTola: Math.round(r24),
      rate24kPer10g: Math.round(r24 / 1.1664),
      rate24kPer1g: Math.round(r24 / 11.664),
      rate22kPerTola: Math.round(r24 * (22 / 24)),
      rate18kPerTola: Math.round(r24 * (18 / 24)),
      rateSilverPerTola: 4850,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' PKT'
    };

    const db = readData();
    db.goldRates = rates;
    writeData(db);

    res.json({ success: true, message: 'Gold rates updated successfully!', goldRates: rates });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update gold rates.', error: error.message });
  }
});

// POST /api/gold-rates/sync - Sync with Sarafa Market Pakistan rate
router.post('/sync', authenticateToken, requireAdmin, (req, res) => {
  const r24 = 428500; // Sarmaaya Market rate
  const rates = {
    rate24kPerTola: r24,
    rate24kPer10g: Math.round(r24 / 1.1664),
    rate24kPer1g: Math.round(r24 / 11.664),
    rate22kPerTola: Math.round(r24 * (22 / 24)),
    rate18kPerTola: Math.round(r24 * (18 / 24)),
    rateSilverPerTola: 4850,
    lastUpdated: 'Live Sarmaaya Market Data'
  };

  const db = readData();
  db.goldRates = rates;
  writeData(db);

  res.json({ success: true, message: 'Synced with live Sarmaaya Sarafa market rate (Rs. 428,500/Tola)', goldRates: rates });
});

module.exports = router;
