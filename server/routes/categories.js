const express = require('express');
const router = express.Router();
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { isMongoConnected } = require('../config/db');
const Category = require('../models/Category');
const Product = require('../models/Product');

/**
 * Collections the shop has made up itself.
 *
 * Reading is public — the storefront needs the list to render the menu — and
 * writing is admin only, like the catalogue. The same two-store arrangement as
 * everything else: Mongo where it is connected, the JSON file for local
 * development without a database.
 */
const FIELDS = 'slug name description image order -_id';

function usingMongo() {
  return isMongoConnected();
}

/** The eight that ship with the site. A new one may not collide with them. */
const BUILT_IN = [
  'rings', 'necklaces', 'earrings', 'bracelets',
  'asian', 'asian-jewellery', 'western', 'western-jewellery',
  'gems', 'diamonds', 'high-jewellery', 'customized', 'collections'
];

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const byOrder = (a, b) =>
  (a.order ?? 100) - (b.order ?? 100) || String(a.name).localeCompare(String(b.name));

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    let categories;
    if (usingMongo()) {
      categories = await Category.find({}).select(FIELDS).lean();
    } else {
      categories = (readData().categories || []);
    }
    res.json({ success: true, categories: categories.slice().sort(byOrder) });
  } catch (error) {
    failWith(res, error, 'Could not load the collections.');
  }
});

// POST /api/categories (Admin)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = String((req.body && req.body.name) || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, message: 'A collection needs a name.' });
    }

    const slug = slugify(req.body.slug || name);
    if (!slug) {
      return res.status(400).json({ success: false, message: 'That name has no letters or numbers in it.' });
    }

    // A collection that shadows a built-in would be unreachable — the built-in
    // page wins the URL — and its products would appear in two places under
    // one name. Saying so beats creating something that silently does nothing.
    if (BUILT_IN.includes(slug)) {
      return res.status(409).json({
        success: false,
        message: `"${slug}" is one of the collections that ships with the site. Pick another name.`
      });
    }

    const record = {
      slug,
      name,
      description: String(req.body.description || '').trim(),
      image: String(req.body.image || '').trim(),
      order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 100
    };

    if (usingMongo()) {
      if (await Category.findOne({ slug })) {
        return res.status(409).json({ success: false, message: `"${slug}" already exists.` });
      }
      await Category.create(record);
    } else {
      const db = readData();
      db.categories = db.categories || [];
      if (db.categories.some(c => c.slug === slug)) {
        return res.status(409).json({ success: false, message: `"${slug}" already exists.` });
      }
      db.categories.push(record);
      writeDataOrThrow(db);
    }

    res.status(201).json({ success: true, message: `Collection "${name}" created.`, category: record });
  } catch (error) {
    failWith(res, error, 'Could not create the collection.');
  }
});

// PUT /api/categories/:slug (Admin)
router.put('/:slug', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const slug = slugify(req.params.slug);
    const patch = {};
    for (const key of ['name', 'description', 'image']) {
      if (req.body[key] !== undefined) patch[key] = String(req.body[key]).trim();
    }
    if (req.body.order !== undefined) patch.order = Number(req.body.order) || 0;

    let updated;
    if (usingMongo()) {
      updated = await Category.findOneAndUpdate({ slug }, { $set: patch }, { new: true })
        .select(FIELDS).lean();
    } else {
      const db = readData();
      db.categories = db.categories || [];
      const i = db.categories.findIndex(c => c.slug === slug);
      if (i !== -1) {
        updated = { ...db.categories[i], ...patch, slug };
        db.categories[i] = updated;
        writeDataOrThrow(db);
      }
    }

    if (!updated) return res.status(404).json({ success: false, message: 'No such collection.' });
    res.json({ success: true, message: 'Collection updated.', category: updated });
  } catch (error) {
    failWith(res, error, 'Could not update the collection.');
  }
});

// DELETE /api/categories/:slug (Admin)
router.delete('/:slug', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const slug = slugify(req.params.slug);

    /**
     * A collection with pieces in it is not deleted quietly.
     *
     * Removing it would leave those products filed under a collection that no
     * longer exists — they would vanish from every listing while still being
     * in the catalogue, which is the kind of disappearance nobody thinks to
     * look for. The count is reported so the admin can move them first.
     */
    const inUse = usingMongo()
      ? await Product.countDocuments({ $or: [{ category: slug }, { categories: slug }] })
      : (readData().products || []).filter(p =>
          p.category === slug || (Array.isArray(p.categories) && p.categories.includes(slug))
        ).length;

    if (inUse > 0 && req.query.force !== '1') {
      return res.status(409).json({
        success: false,
        inUse,
        message: `${inUse} piece${inUse === 1 ? '' : 's'} still filed under this collection. Move them first, or delete it anyway.`
      });
    }

    let removed = false;
    if (usingMongo()) {
      removed = !!(await Category.findOneAndDelete({ slug }));
    } else {
      const db = readData();
      db.categories = db.categories || [];
      const before = db.categories.length;
      db.categories = db.categories.filter(c => c.slug !== slug);
      removed = db.categories.length < before;
      if (removed) writeDataOrThrow(db);
    }

    if (!removed) return res.status(404).json({ success: false, message: 'No such collection.' });
    res.json({ success: true, message: 'Collection removed.' });
  } catch (error) {
    failWith(res, error, 'Could not remove the collection.');
  }
});

module.exports = router;
module.exports.BUILT_IN = BUILT_IN;
module.exports.slugify = slugify;
