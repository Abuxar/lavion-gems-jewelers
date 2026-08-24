const mongoose = require('mongoose');

/**
 * What a jeweller actually quotes on.
 *
 * The catalogue used to hold eight fields, of which only `desc` said anything
 * about the piece — one line, "22k Gold & Colombian Emerald Ring". That was
 * enough for a card in a grid and for the quick-view modal, and it is why the
 * modal and a full page would have shown the same thing: there was nothing
 * else to show.
 *
 * Everything below is optional and every renderer drops what is blank, because
 * the fourteen pieces already in the catalogue predate all of it and must not
 * start rendering empty rows labelled "Metal —".
 *
 * Declared once here and exported, so the API, the two admin forms and the two
 * product pages cannot drift apart on what a piece is made of.
 */
const SPEC_TEXT = [
  /** "22K Yellow Gold", "Platinum 950", "18K White Gold". */
  'metal',
  /** The hallmark as struck: "916", "750", "PT950". */
  'purity',
  /** "Colombian Emerald", "GIA Certified Diamond". */
  'stone',
  /** Colour and clarity, in the shop's own words: "G–H / VS". */
  'stoneQuality',
  /** Certificate body and number, "GIA 2185746321". */
  'certificate',
  /** "Band 2.4 mm", "Drop 38 mm". */
  'dimensions',
  /** The long description, in full sentences. Paragraphs split on blank lines. */
  'details',
  /** How to keep it: "Avoid perfume and chlorine; polish with a soft cloth." */
  'care'
];

const SPEC_NUMBERS = [
  /** Finished weight of the piece in grams, stones included. */
  'grossWeightG',
  /** Total carat weight of every stone. */
  'stoneCarats',
  /** How many stones are set. */
  'stoneCount',
  /** Working days before a made-to-order piece ships. */
  'madeToOrderDays'
];

const SPEC_LISTS = [
  /** Ring or bangle sizes that can be made: ["12", "14", "16"]. */
  'sizes',
  /** Further photographs. `img` stays the one the grid and the card use. */
  'images'
];

const SPEC_FIELDS = [...SPEC_TEXT, ...SPEC_NUMBERS, ...SPEC_LISTS];

const ProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  /**
   * The collection a piece belongs to, and the one its page and breadcrumb
   * name. Required, unchanged, and still what every existing listing filters
   * on — a ring must not fall out of /rings because someone also filed it
   * under "bridal".
   */
  category: { type: String, required: true },
  /**
   * Any further collections it also appears in.
   *
   * Kept alongside `category` rather than replacing it: one primary is what
   * lets a piece have a single breadcrumb, one canonical page and one place
   * in the sitemap, while still showing up in as many listings as the shop
   * wants. The primary is always included when this is read back.
   */
  categories: { type: [String], default: [] },
  price: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  badge: { type: String, default: '' },
  img: { type: String, default: 'images/hero_campaign.png' },
  desc: { type: String, default: '' },

  // ---- the specification ----
  ...Object.fromEntries(SPEC_TEXT.map(k => [k, { type: String, default: '' }])),
  // null rather than 0: a ring that weighs nothing is not the same statement as
  // a ring whose weight nobody has recorded, and 0 g would be printed as a fact.
  ...Object.fromEntries(SPEC_NUMBERS.map(k => [k, { type: Number, default: null }])),
  ...Object.fromEntries(SPEC_LISTS.map(k => [k, { type: [String], default: [] }]))
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
const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

Product.SPEC_TEXT = SPEC_TEXT;
Product.SPEC_NUMBERS = SPEC_NUMBERS;
Product.SPEC_LISTS = SPEC_LISTS;
Product.SPEC_FIELDS = SPEC_FIELDS;

module.exports = Product;
