const express = require('express');
const router = express.Router();
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { isMongoConnected } = require('../config/db');
const Product = require('../models/Product');

/**
 * Two stores, one API.
 *
 * These routes used to read and write server/db/data.json exclusively. That
 * path sits inside the deployment bundle, which is read-only on a serverless
 * host, so every catalog edit made in production was refused — the admin
 * panel's stock controls had nothing durable to write to. Mongo is the store
 * that survives there; the JSON file stays as the local-development fallback
 * so the project still runs with no database configured.
 *
 * Mongo documents carry _id and __v, which the client has no use for; strip
 * them so both stores hand back the same shape.
 */
const FIELDS = 'id name category price stock badge img desc -_id';

function usingMongo() {
  return isMongoConnected();
}

// GET /api/products - Get all products with optional filters
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let products;

    if (usingMongo()) {
      const query = {};
      if (category && category !== 'all') {
        query.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
      }
      if (search) {
        const rx = new RegExp(escapeRegex(search), 'i');
        query.$or = [{ name: rx }, { category: rx }, { desc: rx }];
      }
      products = await Product.find(query).select(FIELDS).lean();
    } else {
      const db = readData();
      products = db.products || [];
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
    }

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    failWith(res, error, 'Failed to fetch products.');
  }
});

/** A search term is user input; without this a stray "(" is a 500. */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = usingMongo()
      ? await Product.findOne({ id: String(req.params.id) }).select(FIELDS).lean()
      : readData().products.find(p => String(p.id) === String(req.params.id));

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, product });
  } catch (error) {
    failWith(res, error, 'Failed to fetch product.');
  }
});

// POST /api/products - Add new product (Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, price, stock, badge, img, desc } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Product name and category are required.' });
    }

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

    if (usingMongo()) {
      await Product.create(newProduct);
    } else {
      const db = readData();
      db.products.push(newProduct);
      writeDataOrThrow(db);
    }

    res.status(201).json({ success: true, message: 'Product added successfully!', product: newProduct });
  } catch (error) {
    failWith(res, error, 'Failed to create product.');
  }
});

// PUT /api/products/:id - Update product (Admin)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Only the fields the catalog actually has. Spreading req.body wholesale
    // let a client introduce arbitrary keys, including id.
    const patch = {};
    for (const key of ['name', 'category', 'badge', 'img', 'desc']) {
      if (req.body[key] !== undefined) patch[key] = req.body[key];
    }
    if (req.body.price !== undefined) patch.price = parseFloat(req.body.price) || 0;
    if (req.body.stock !== undefined) patch.stock = Math.max(0, parseInt(req.body.stock, 10) || 0);

    let updated;

    if (usingMongo()) {
      updated = await Product.findOneAndUpdate(
        { id: String(req.params.id) },
        { $set: patch },
        { new: true }
      ).select(FIELDS).lean();
    } else {
      const db = readData();
      const index = db.products.findIndex(p => String(p.id) === String(req.params.id));
      if (index !== -1) {
        updated = { ...db.products[index], ...patch, id: db.products[index].id };
        db.products[index] = updated;
        writeDataOrThrow(db);
      }
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product updated successfully!', product: updated });
  } catch (error) {
    failWith(res, error, 'Failed to update product.');
  }
});

// DELETE /api/products/:id - Delete product (Admin)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let removed;

    if (usingMongo()) {
      const r = await Product.deleteOne({ id: String(req.params.id) });
      removed = r.deletedCount > 0;
    } else {
      const db = readData();
      const initialLen = db.products.length;
      db.products = db.products.filter(p => String(p.id) !== String(req.params.id));
      removed = db.products.length !== initialLen;
      if (removed) writeDataOrThrow(db);
    }

    if (!removed) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    failWith(res, error, 'Failed to delete product.');
  }
});

module.exports = router;
