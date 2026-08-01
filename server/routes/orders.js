const express = require('express');
const router = express.Router();
const { readData, writeData } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

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
    res.status(500).json({ success: false, message: 'Failed to fetch orders.', error: error.message });
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
    const { customer, phone, city, address, payment, items, total } = req.body;

    if (!customer || !phone || !city || !address) {
      return res.status(400).json({ success: false, message: 'Customer name, phone, city, and address are required.' });
    }

    const db = readData();
    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer,
      phone,
      city,
      address,
      payment: payment || 'Cash on Delivery',
      items: items || 'Standard Order',
      total: parseFloat(total) || 0,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0]
    };

    db.orders.unshift(newOrder);
    writeData(db);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully! Reference ID: ' + newOrder.id,
      order: newOrder
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to place order.', error: error.message });
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
    writeData(db);

    res.json({ success: true, message: `Order ${order.id} status updated to ${status}.`, order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order status.', error: error.message });
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

    writeData(db);
    res.json({ success: true, message: 'Order record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete order.', error: error.message });
  }
});

module.exports = router;
