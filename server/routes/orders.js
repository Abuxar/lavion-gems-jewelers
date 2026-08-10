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

// GET /api/orders - Get all orders (Admin or Customer Filter)
router.get('/', async (req, res) => {
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

// GET /api/orders/track/:query - Live Order Tracking timeline lookup
// Express 4 does not catch a rejected async handler, so the try/catch is what
// keeps a database hiccup from hanging the request instead of answering it.
router.get('/track/:query', async (req, res) => {
  try {
    const q = req.params.query.trim().toLowerCase();
    let order;

    if (usingMongo()) {
      order = await Order.findOne({
        $or: [
          { id: new RegExp('^' + escapeRegex(q) + '$', 'i') },
          { phone: new RegExp(escapeRegex(q)) }
        ]
      }).select(FIELDS).lean();
    } else {
      const db = readData();
      order = db.orders.find(o => o.id.toLowerCase() === q || o.phone.includes(q));
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
