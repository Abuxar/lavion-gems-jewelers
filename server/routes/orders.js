const express = require('express');
const router = express.Router();
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/email');
const { isMongoConnected } = require('../config/db');
const Order = require('../models/Order');

/**
 * Same two-store arrangement as the catalog: Mongo where it is connected, the
 * JSON file for local development. That file lives inside the deployment
 * bundle and is read-only on a serverless host, so writing there in production
 * silently dropped every order a customer placed, along with every admin
 * status change.
 */
const FIELDS = 'id customer phone email city address payment items total status priceConfirmed date -_id';

function usingMongo() {
  return isMongoConnected();
}

/** Lookup terms are user input; an unescaped '(' would otherwise be a 500. */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/orders — the whole order book. Admin only.
 *
 * This was open. Anyone who asked got every order ever placed, with the
 * customer's name, phone number, email address, city, full street address,
 * payment method and total. Worse than reachable: main.js called it on every
 * page load and wrote the results into localStorage, so the shop's entire
 * customer list was handed to every visitor and left sitting in their browser.
 *
 * Nothing customer-facing needs this. Someone tracking their own order uses
 * /track/:query, which returns one order and only to a person who already
 * knows its number. The sibling route in customOrders.js was already guarded
 * this way; this one was simply missed.
 */
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { phone, customer } = req.query;
    let orders;

    if (usingMongo()) {
      const query = {};
      if (phone) query.phone = new RegExp(escapeRegex(phone));
      else if (customer) query.customer = new RegExp(escapeRegex(customer), 'i');
      orders = await Order.find(query).sort({ createdAt: -1 }).select(FIELDS).lean();
    } else {
      const db = readData();
      orders = db.orders || [];
      if (phone) {
        orders = orders.filter(o => o.phone.includes(phone));
      } else if (customer) {
        orders = orders.filter(o => o.customer.toLowerCase().includes(customer.toLowerCase()));
      }
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    failWith(res, error, 'Failed to fetch orders.');
  }
});

/**
 * GET /api/orders/track/:query — the public tracking lookup.
 *
 * This is the one order route with no login behind it, because a customer
 * tracking their delivery has nothing to sign in with. That makes the fields it
 * returns the fields anyone who knows — or guesses — a mobile number can read,
 * so it answers with the progress of the order and nothing else. It used to
 * hand back the full record: home address, email address and payment method
 * included.
 *
 * Enough is kept to recognise your own order (name, city, what was ordered,
 * what it costs) and to draw the timeline. A customer's own device still holds
 * the complete record from checkout, which is what the invoice prints from.
 */
const PUBLIC_TRACK_FIELDS = [
  'id', 'customer', 'city', 'items', 'total', 'status', 'priceConfirmed', 'date'
];

function publicView(order) {
  const out = {};
  for (const key of PUBLIC_TRACK_FIELDS) {
    if (order[key] !== undefined) out[key] = order[key];
  }
  return out;
}

// Express 4 does not catch a rejected async handler, so the try/catch is what
// keeps a database hiccup from hanging the request instead of answering it.
router.get('/track/:query', async (req, res) => {
  try {
    const q = req.params.query.trim().toLowerCase();
    let order;

    if (usingMongo()) {
      // Projected in the query rather than trimmed afterwards, so the sensitive
      // fields are never read out of the database to begin with.
      order = await Order.findOne({
        $or: [
          { id: new RegExp('^' + escapeRegex(q) + '$', 'i') },
          { phone: new RegExp(escapeRegex(q)) }
        ]
      }).select(PUBLIC_TRACK_FIELDS.join(' ') + ' -_id').lean();
    } else {
      const db = readData();
      order = db.orders.find(o => o.id.toLowerCase() === q || o.phone.includes(q));
      // The file store has no projection; the record is whole, so trim it here.
      if (order) order = publicView(order);
    }

    if (!order) {
      return res.status(404).json({ success: false, message: `No order found matching "${req.params.query}".` });
    }

    res.json({ success: true, order });
  } catch (error) {
    failWith(res, error, 'Order lookup failed.');
  }
});

// POST /api/orders - Create checkout order
router.post('/', async (req, res) => {
  try {
    const { customer, phone, email, city, address, payment, items, total } = req.body;

    if (!customer || !phone || !city || !address) {
      return res.status(400).json({ success: false, message: 'Customer name, phone, city, and address are required.' });
    }

    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer,
      phone,
      email: email || '',
      city,
      address,
      payment: payment || 'Cash on Delivery',
      items: items || 'Standard Order',
      total: parseFloat(total) || 0,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0]
    };

    if (usingMongo()) {
      await Order.create(newOrder);
    } else {
      const db = readData();
      db.orders.unshift(newOrder);
      writeDataOrThrow(db);
    }

    // Send order confirmation email (non-blocking)
    sendOrderConfirmationEmail(newOrder);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Reference ID: ' + newOrder.id,
      order: newOrder
    });
  } catch (error) {
    failWith(res, error, 'Failed to place order.');
  }
});

// PUT /api/orders/:id/price - Update agreed quotation price (Admin)
// These two were labelled "(Admin)" but enforced nothing, so any visitor could
// set any order's agreed price or mark it Delivered.
router.put('/:id/price', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { price, status } = req.body;
    const patch = { total: parseFloat(price) || 0, priceConfirmed: true };
    if (status) patch.status = status;

    let order;
    if (usingMongo()) {
      order = await Order.findOneAndUpdate(
        { id: String(req.params.id) }, { $set: patch }, { new: true }
      ).select(FIELDS).lean();
    } else {
      const db = readData();
      order = db.orders.find(o => String(o.id) === String(req.params.id));
      if (order) {
        Object.assign(order, patch);
        writeDataOrThrow(db);
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: `Order ${order.id} agreed price set to PKR ${order.total.toLocaleString()}.`, order });
  } catch (error) {
    failWith(res, error, 'Failed to update order price.');
  }
});

// PUT /api/orders/:id/status - Update order status (Admin)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    let order;
    if (usingMongo()) {
      order = await Order.findOneAndUpdate(
        { id: String(req.params.id) }, { $set: { status } }, { new: true }
      ).select(FIELDS).lean();
    } else {
      const db = readData();
      order = db.orders.find(o => String(o.id) === String(req.params.id));
      if (order) {
        order.status = status;
        writeDataOrThrow(db);
      }
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: `Order ${order.id} status updated to ${status}.`, order });
  } catch (error) {
    failWith(res, error, 'Failed to update order status.');
  }
});

// DELETE /api/orders/:id - Cancel/Delete order (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let removed;

    if (usingMongo()) {
      removed = (await Order.deleteOne({ id: String(req.params.id) })).deletedCount > 0;
    } else {
      const db = readData();
      const initialLen = db.orders.length;
      db.orders = db.orders.filter(o => String(o.id) !== String(req.params.id));
      removed = db.orders.length !== initialLen;
      if (removed) writeDataOrThrow(db);
    }

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    res.json({ success: true, message: 'Order record deleted successfully.' });
  } catch (error) {
    failWith(res, error, 'Failed to delete order.');
  }
});

module.exports = router;
