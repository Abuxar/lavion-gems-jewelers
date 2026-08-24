const express = require('express');
const router = express.Router();
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { isMongoConnected } = require('../config/db');
const Category = require('../models/Category');
const Product = require('../models/Product');

/**
 * Collections, both kinds.
 *
 * The nine the site ships with are part of the build: one page each on the old
 * site, one route on the new one, and URLs that have been indexed for years.
 * Their wording is not part of the build, though, and there was no reason a
 * shop should need a deploy to rename "Precious Gems" — so their name,
 * description and tile are editable and stored here as overrides, keyed by the
 * same slug.
 *
 * What cannot change is the slug. It is what every link points at, what every
 * product record files against, and what Google has. A rename that moved it
 * would break all three at once and silently.
 *
 * Anything the shop invents beyond those nine is stored here outright and gets
 * a page at /collection/<slug>.
 *
 * Reading is public — the storefront needs the list — and writing is admin
 * only. Mongo where connected, the JSON file for local development.
 */
const FIELDS = 'slug name description image order -_id';

function usingMongo() {
  return isMongoConnected();
}

/**
 * The built-ins, exactly as src/lib/categories.ts has them.
 *
 * `key` is what a product record stores and is not always the slug: the page
 * at /asian-jewellery holds pieces filed under "asian". That split predates
 * this and is kept because both halves are load-bearing — the slug is the URL,
 * the key is the data.
 */
const BUILT_IN_DEFAULTS = [
  { slug: 'rings', key: 'rings', name: 'Rings' },
  { slug: 'necklaces', key: 'necklaces', name: 'Necklaces' },
  { slug: 'earrings', key: 'earrings', name: 'Earrings' },
  { slug: 'bracelets', key: 'bracelets', name: 'Bracelets' },
  { slug: 'asian-jewellery', key: 'asian', name: 'Asian Jewellery' },
  { slug: 'western-jewellery', key: 'western', name: 'Western Jewellery' },
  { slug: 'high-jewellery', key: 'high', name: 'High Jewellery' },
  { slug: 'gems', key: 'gems', name: 'Gems' },
  { slug: 'diamonds', key: 'diamonds', name: 'Diamonds' },
  { slug: 'customized', key: 'customized', name: 'Customized' }
];

const BUILT_IN_SLUGS = BUILT_IN_DEFAULTS.map(c => c.slug);
/** Both spellings are reserved: the slug and the key a product files against. */
const RESERVED = [...new Set([
  ...BUILT_IN_SLUGS,
  ...BUILT_IN_DEFAULTS.map(c => c.key),
  'collections', 'collection', 'product', 'admin', 'all'
])];

const isBuiltIn = slug => BUILT_IN_SLUGS.includes(slug);

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const byOrder = (a, b) =>
  (a.order ?? 100) - (b.order ?? 100) || String(a.name).localeCompare(String(b.name));

async function loadStored() {
  if (usingMongo()) return Category.find({}).select(FIELDS).lean();
  return readData().categories || [];
}

/**
 * Every collection the site has, built-in first and in their long-standing
 * order, then whatever the shop added.
 *
 * A built-in carries builtIn:true so a panel can lock its address and offer
 * "reset" where it would otherwise offer "remove", and `key` so a product
 * filed under "asian" is matched to /asian-jewellery.
 */
function merge(stored) {
  const overrides = new Map(stored.map(c => [c.slug, c]));

  const builtIns = BUILT_IN_DEFAULTS.map(def => {
    const o = overrides.get(def.slug) || {};
    return {
      slug: def.slug,
      key: def.key,
      name: o.name || def.name,
      description: o.description || '',
      image: o.image || '',
      order: Number.isFinite(o.order) ? o.order : 0,
      builtIn: true,
      // So a panel can say whether it is showing the shop's wording or the
      // one the site shipped with, and offer to put it back.
      customised: Boolean(o.name || o.description || o.image)
    };
  });

  const custom = stored
    .filter(c => !isBuiltIn(c.slug))
    .map(c => ({
      slug: c.slug,
      key: c.slug,
      name: c.name,
      description: c.description || '',
      image: c.image || '',
      order: Number.isFinite(c.order) ? c.order : 100,
      builtIn: false,
      customised: true
    }))
    .sort(byOrder);

  return [...builtIns, ...custom];
}

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    res.json({ success: true, categories: merge(await loadStored()) });
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
    // page wins the URL — and its pieces would appear twice under one name.
    if (RESERVED.includes(slug)) {
      return res.status(409).json({
        success: false,
        message: `"${slug}" is already part of the site. Rename that collection instead, or pick another name.`
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

    res.status(201).json({
      success: true,
      message: `Collection "${name}" created.`,
      category: { ...record, key: slug, builtIn: false, customised: true }
    });
  } catch (error) {
    failWith(res, error, 'Could not create the collection.');
  }
});

/**
 * PUT /api/categories/:slug (Admin)
 *
 * Works for both kinds. For a built-in this writes an override record rather
 * than editing anything in the build, so resetting is a matter of deleting it.
 * The slug is never taken from the body: it is the address.
 */
router.put('/:slug', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const slug = slugify(req.params.slug);
    const patch = {};
    for (const key of ['name', 'description', 'image']) {
      if (req.body[key] !== undefined) patch[key] = String(req.body[key]).trim();
    }
    if (req.body.order !== undefined) patch.order = Number(req.body.order) || 0;

    if (patch.name === '') {
      return res.status(400).json({ success: false, message: 'A collection needs a name.' });
    }

    if (usingMongo()) {
      // upsert: a built-in has no record until the first time it is edited.
      await Category.findOneAndUpdate(
        { slug },
        { $set: { ...patch, slug } },
        { new: true, upsert: isBuiltIn(slug) }
      );
    } else {
      const db = readData();
      db.categories = db.categories || [];
      const i = db.categories.findIndex(c => c.slug === slug);
      if (i !== -1) db.categories[i] = { ...db.categories[i], ...patch, slug };
      else if (isBuiltIn(slug)) db.categories.push({ slug, ...patch });
      writeDataOrThrow(db);
    }

    const category = merge(await loadStored()).find(c => c.slug === slug);
    if (!category) return res.status(404).json({ success: false, message: 'No such collection.' });

    res.json({ success: true, message: `${category.name} saved.`, category });
  } catch (error) {
    failWith(res, error, 'Could not update the collection.');
  }
});

/**
 * DELETE /api/categories/:slug (Admin)
 *
 * A built-in cannot be deleted — its page is part of the build and would go on
 * serving under a name nobody could change back. Deleting one only clears the
 * shop's wording and restores what the site shipped with, which is what the
 * panel offers instead.
 */
router.delete('/:slug', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const slug = slugify(req.params.slug);

    if (isBuiltIn(slug)) {
      if (usingMongo()) {
        await Category.findOneAndDelete({ slug });
      } else {
        const db = readData();
        db.categories = (db.categories || []).filter(c => c.slug !== slug);
        writeDataOrThrow(db);
      }
      const category = merge(await loadStored()).find(c => c.slug === slug);
      return res.json({
        success: true,
        reset: true,
        message: `${category.name} is back to the wording the site ships with.`,
        category
      });
    }

    /**
     * A collection with pieces in it is not removed quietly. Those pieces stay
     * in the catalogue but drop out of every listing that used it — the kind
     * of disappearance nobody thinks to look for — so the count is reported
     * and a second, deliberate request is required.
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
module.exports.BUILT_IN_DEFAULTS = BUILT_IN_DEFAULTS;
module.exports.BUILT_IN_SLUGS = BUILT_IN_SLUGS;
module.exports.RESERVED = RESERVED;
module.exports.slugify = slugify;
module.exports.merge = merge;
module.exports.loadStored = loadStored;
