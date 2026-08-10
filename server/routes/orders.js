const express = require('express');
const router = express.Router();
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../utils/email');

// GET /api/orders - Get all orders (Admin or Customer Filter)
router.get('/', (req, res) => {
  try {
    const { phone, customer } = req.query;
    const db = readData();
    let orders = db.orders || [];

    if (phone) {
      orders = orders.filter(o => o.phone.includes(phone));
    } else if (customer) {
      orders = orders.filter(o => o.customer.toLowerCase().includes(customer.toLowerCase()));
    }

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    failWith(res, error, 'Failed to fetch orders.');
  }
});

// GET /api/orders/track/:query - Live Order Tracking timeline lookup
router.get('/track/:query', (req, res) => {
  const q = req.params.query.trim().toLowerCase();
  const db = readData();
  const order = db.orders.find(o => o.id.toLowerCase() === q || o.phone.includes(q));

  if (!order) {
    return res.status(404).json({ success: false, message: `No order found matching "${req.params.query}".` });
  }

  res.json({ success: true, order });
});

// POST /api/orders - Create checkout order
router.post('/', (req, res) => {
  try {
    const { customer, phone, email, city, address, payment, items, total } = req.body;

    if (!customer || !phone || !city || !address) {
      return res.status(400).json({ success: false, message: 'Customer name, phone, city, and address are required.' });
    }

    const db = readData();
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

    db.orders.unshift(newOrder);
    writeDataOrThrow(db);

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
router.put('/:id/price', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { price, status } = req.body;
    const db = readData();
    const order = db.orders.find(o => String(o.id) === String(req.params.id));

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.total = parseFloat(price) || 0;
    order.priceConfirmed = true;
    if (status) order.status = status;
    writeDataOrThrow(db);

    res.json({ success: true, message: `Order ${order.id} agreed price set to PKR ${order.total.toLocaleString()}.`, order });
  } catch (error) {
    failWith(res, error, 'Failed to update order price.');
  }
});

// PUT /api/orders/:id/status - Update order status (Admin)
router.put('/:id/status', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const db = readData();
    const order = db.orders.find(o => String(o.id) === String(req.params.id));

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.status = status;
    writeDataOrThrow(db);

    res.json({ success: true, message: `Order ${order.id} status updated to ${status}.`, order });
  } catch (error) {
    failWith(res, error, 'Failed to update order status.');
  }
});

// DELETE /api/orders/:id - Cancel/Delete order (Admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readData();
    const initialLen = db.orders.length;
    db.orders = db.orders.filter(o => String(o.id) !== String(req.params.id));

    if (db.orders.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    writeDataOrThrow(db);
    res.json({ success: true, message: 'Order record deleted successfully.' });
  } catch (error) {
    failWith(res, error, 'Failed to delete order.');
  }
});

module.exports = router;
