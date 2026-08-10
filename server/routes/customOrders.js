const express = require('express');
const router = express.Router();
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendCustomOrderEmail } = require('../utils/email');

// POST /api/custom-orders - Submit bespoke custom request
router.post('/', (req, res) => {
  try {
    const { itemType, metal, goldPurity, gemPreference, customText, budgetRange, notes, customerName, customerPhone, customerCity, customerEmail } = req.body;

    if (!customerName || !customerPhone || !itemType) {
      return res.status(400).json({ success: false, message: 'Name, phone, and item type are required.' });
    }

    const refId = `CUST-${Math.floor(10000 + Math.random() * 90000)}`;
    const newRequest = {
      id: refId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || '',
      customerCity: customerCity || 'Pakistan',
      itemType,
      metal: metal || '22k Gold',
      goldPurity: goldPurity || '22k',
      gemPreference: gemPreference || 'None',
      customText: customText || '',
      budgetRange: budgetRange || 'Flexible',
      notes: notes || '',
      date: new Date().toISOString().split('T')[0],
      status: 'Submitted'
    };

    const db = readData();
    if (!db.customOrders) db.customOrders = [];
    db.customOrders.unshift(newRequest);

    // Also register order in master orders for tracking
    db.orders.unshift({
      id: refId,
      customer: customerName,
      phone: customerPhone,
      city: customerCity || 'Pakistan',
      address: 'Bespoke Order Request',
      payment: 'Custom Quotation',
      items: `Bespoke Custom ${itemType} (${metal})`,
      total: 0,
      status: 'Submitted',
      date: new Date().toISOString().split('T')[0]
    });

    writeDataOrThrow(db);

    // Send custom order notification email (non-blocking)
    sendCustomOrderEmail(newRequest);

    res.status(201).json({
      success: true,
      message: 'Bespoke order submitted successfully! Ref: ' + refId,
      customOrder: newRequest
    });
  } catch (error) {
    failWith(res, error, 'Failed to submit custom order.');
  }
});

// GET /api/custom-orders - View all bespoke requests (Admin)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const db = readData();
  res.json({ success: true, count: (db.customOrders || []).length, customOrders: db.customOrders || [] });
});

module.exports = router;
