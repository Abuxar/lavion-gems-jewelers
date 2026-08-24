const mongoose = require('mongoose');

/**
 * Collections the shop has made up itself.
 *
 * The eight that came with the site are hardcoded — in src/lib/categories.ts
 * for the Next build, and as one .html file each for the old one — and they
 * stay that way. Their URLs are indexed, their copy is written, and moving
 * them into a database would gain nothing and risk the addresses Google
 * already knows.
 *
 * This is for the ninth. A shop that decides to group a few pieces as "Bridal"
 * should not need a deploy, so a category made here is stored, served by the
 * API, and rendered by a page that reads it — /collection/<slug> on both
 * sites, which keeps it clear of the eight built-in URLs.
 */
const CategorySchema = new mongoose.Schema({
  /**
   * The URL segment and the value stored on a product's `category` field.
   *
   * One string for both, unlike the built-ins where /asian-jewellery holds
   * products filed under "asian" — that split exists because those URLs were
   * indexed before the data was tidied, and there is no reason to inherit it
   * for something new.
   */
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  /** Root-relative path or a data URI, exactly like a product image. */
  image: { type: String, default: '' },
  /** Lowest first. Ties fall back to the name. */
  order: { type: Number, default: 100 }
}, { timestamps: true });

module.exports = mongoose.models.Category || mongoose.model('Category', CategorySchema);
