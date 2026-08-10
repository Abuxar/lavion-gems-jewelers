const express = require('express');
const router = express.Router();
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/products - Get all products with optional filters
router.get('/', (req, res) => {
  try {
    const { category, search } = req.query;
    const db = readData();
    let products = db.products || [];

    if (category && category !== 'all') {
      products = products.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.desc && p.desc.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    failWith(res, error, 'Failed to fetch products.');
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', (req, res) => {
  const db = readData();
  const product = db.products.find(p => String(p.id) === String(req.params.id));
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  res.json({ success: true, product });
});

// POST /api/products - Add new product (Admin)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { name, category, price, stock, badge, img, desc } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Product name and category are required.' });
    }

    const db = readData();
    const newProduct = {
      id: String(Date.now()),
      name,
      category,
      price: parseFloat(price) || 0,
      stock: parseInt(stock, 10) || 0,
      badge: badge || '',
      img: img || 'images/hero_campaign.png',
      desc: desc || ''
    };

    db.products.push(newProduct);
    writeDataOrThrow(db);

    res.status(201).json({ success: true, message: 'Product added successfully!', product: newProduct });
  } catch (error) {
    failWith(res, error, 'Failed to create product.');
  }
});

// PUT /api/products/:id - Update product (Admin)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readData();
    const index = db.products.findIndex(p => String(p.id) === String(req.params.id));

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const current = db.products[index];
    const updated = {
      ...current,
      ...req.body,
      id: current.id,
      price: req.body.price !== undefined ? parseFloat(req.body.price) : current.price,
      stock: req.body.stock !== undefined ? parseInt(req.body.stock, 10) : current.stock
    };

    db.products[index] = updated;
    writeDataOrThrow(db);

    res.json({ success: true, message: 'Product updated successfully!', product: updated });
  } catch (error) {
    failWith(res, error, 'Failed to update product.');
  }
});

// DELETE /api/products/:id - Delete product (Admin)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = readData();
    const initialLen = db.products.length;
    db.products = db.products.filter(p => String(p.id) !== String(req.params.id));

    if (db.products.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    writeDataOrThrow(db);
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    failWith(res, error, 'Failed to delete product.');
  }
});

module.exports = router;
