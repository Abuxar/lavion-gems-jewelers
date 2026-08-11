const express = require('express');
const router = express.Router();
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { isMongoConnected, ensureMongo } = require('../config/db');
const { sendCustomOrderEmail } = require('../utils/email');
const CustomOrder = require('../models/CustomOrder');
const Order = require('../models/Order');

/**
 * Two stores, one API — the same arrangement the catalog and order routes use.
 *
 * This route wrote only to server/db/data.json, which lives inside the
 * deployment bundle and is read-only on a serverless host. Every bespoke
 * request submitted from the studio page therefore came back 503 and was lost,
 * while the browser showed a confirmation with a reference number regardless.
 * Mongo is the store that survives in production; the JSON file stays as the
 * local-development fallback.
 */
function usingMongo() {
  return isMongoConnected();
}

const FIELDS = '-_id -__v';

function newRefId() {
  return `CUST-${Math.floor(10000 + Math.random() * 90000)}`;
}

/** Trim and cap a free-text field so one request cannot store a novel. */
function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

// POST /api/custom-orders - Submit bespoke custom request
router.post('/', async (req, res) => {
  try {
    const {
      itemType, metal, goldPurity, gemPreference, customText,
      budgetRange, notes, referenceUrl, referenceImage,
      customerName, customerPhone, customerCity, customerEmail
    } = req.body || {};

    if (!customerName || !customerPhone || !itemType) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone number and jewellery type are required.'
      });
    }

    const refId = newRefId();
    const today = new Date().toISOString().split('T')[0];

    const request = {
      id: refId,
      customerName: clean(customerName, 120),
      customerPhone: clean(customerPhone, 40),
      customerEmail: clean(customerEmail, 160),
      customerCity: clean(customerCity, 80) || 'Pakistan',
      itemType: clean(itemType, 80),
      metal: clean(metal, 80) || '22k Gold',
      goldPurity: clean(goldPurity, 40) || '22k',
      gemPreference: clean(gemPreference, 80) || 'None',
      customText: clean(customText, 200),
      budgetRange: clean(budgetRange, 80) || 'Flexible',
      notes: clean(notes, 2000),
      referenceUrl: clean(referenceUrl, 500),
      // Only ever an inline image. A remote URL here would let a stored value
      // pull content from somewhere else when the admin panel renders it.
      referenceImage: /^data:image\/(png|jpe?g|webp);base64,/i.test(String(referenceImage || ''))
        ? String(referenceImage).slice(0, 260000)
        : '',
      date: today,
      status: 'Submitted'
    };

    // A parallel entry in the order book, so a bespoke request is trackable
    // through the same lookup as a normal purchase.
    const tracking = {
      id: refId,
      customer: request.customerName,
      email: request.customerEmail,
      phone: request.customerPhone,
      city: request.customerCity,
      address: 'Bespoke consultation request',
      payment: 'Custom Quotation',
      items: `Bespoke ${request.itemType} (${request.metal}, ${request.gemPreference})`,
      total: 0,
      status: 'Submitted',
      date: today
    };

    /**
     * Wait for the database rather than falling straight through to the file
     * store. The shared middleware gives a reconnect 3.5s, which a cold
     * serverless instance can miss — and the fallback it lands on cannot be
     * written to in production, so the customer's brief is refused for no
     * reason other than timing. A commission is worth a second attempt; a
     * catalogue read is not, which is why this waits here and not globally.
     */
    if (!usingMongo()) await ensureMongo().catch(() => false);

    if (usingMongo()) {
      await CustomOrder.create(request);
      await Order.create(tracking);
    } else {
      const db = readData();
      if (!db.customOrders) db.customOrders = [];
      if (!db.orders) db.orders = [];
      db.customOrders.unshift(request);
      db.orders.unshift(tracking);
      writeDataOrThrow(db);
    }

    // Notification must not decide the outcome: the request is already stored,
    // and a mail provider outage is not the customer's problem to see.
    Promise.resolve()
      .then(() => sendCustomOrderEmail(request))
      .catch(e => console.error('custom order email failed:', e.message));

    res.status(201).json({
      success: true,
      message: `Bespoke request received. Reference ${refId}.`,
      customOrder: request
    });
  } catch (error) {
    console.error('custom order error:', error);

    // "The catalog is read-only on this deployment, a database is required" is
    // a note for whoever runs the site, not for the customer reading it. Say
    // what they can actually do instead.
    if (error && error.code === 'DB_READ_ONLY') {
      return res.status(503).json({
        success: false,
        message: 'We could not reach our design desk just now. Please try again in a moment, ' +
          'or send us the details on WhatsApp at +92 324 1769500 and we will take them there.',
        code: 'STORE_UNAVAILABLE'
      });
    }

    failWith(res, error, 'Failed to submit the bespoke request.');
  }
});

// GET /api/custom-orders - View all bespoke requests (Admin)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let customOrders;
    if (usingMongo()) {
      customOrders = await CustomOrder.find().select(FIELDS).sort({ createdAt: -1 }).lean();
    } else {
      customOrders = readData().customOrders || [];
    }
    res.json({ success: true, count: customOrders.length, customOrders });
  } catch (error) {
    failWith(res, error, 'Failed to load bespoke requests.');
  }
});

module.exports = router;
