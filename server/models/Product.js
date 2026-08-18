const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  badge: { type: String, default: '' },
  img: { type: String, default: 'images/hero_campaign.png' },
  desc: { type: String, default: '' }
}, { timestamps: true });

/**
 * Registered once, however many times this file is evaluated.
 *
 * The API bundle and the page bundle are compiled separately, so each has its
 * own copy of this module while sharing one mongoose instance. The second copy
 * to load was calling model() on a name already taken:
 *
 *   OverwriteModelError: Cannot overwrite `Product` model once compiled.
 *
 * Under plain Node the require cache made this impossible, which is why it
 * appeared only once pages started reading the catalogue directly.
 */
module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);
