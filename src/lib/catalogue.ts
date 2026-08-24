/**
 * The catalogue, read straight from the store rather than over HTTP.
 *
 * A server component asking its own /api endpoint would spend a second function
 * invocation to reach code already running in this process, and on a protected
 * preview deployment that request is answered by the SSO redirect rather than
 * by the API — a page that works in production and mysteriously fails in
 * preview. Reading the store directly avoids both.
 *
 * The two-store fallback mirrors routes/products.js deliberately: Mongo when it
 * is reachable, the JSON file when it is not, so the site still renders on a
 * machine with no database configured.
 */
import type { Category } from './categories';
import { idFromHandle } from './handles';

// The server is CommonJS and lives outside the TypeScript project, so it comes
// in through require rather than import.
/* eslint-disable @typescript-eslint/no-require-imports */
const { ensureMongo, isMongoConnected } = require('../../server/config/db');
const ProductModel = require('../../server/models/Product');
const { readData } = require('../../server/utils/db');

export type Product = {
  id: string;
  name: string;
  category: string;
  /**
   * Further collections it also appears in, beyond its home one.
   *
   * `category` stays the home collection — the breadcrumb, the canonical page
   * and the sitemap entry all come from it — so a piece never falls out of
   * /rings because someone also filed it under "bridal".
   */
  categories: string[];
  price: number;
  stock: number;
  badge: string;
  /** Always root-relative, e.g. /images/featured_rings.png */
  img: string;
  desc: string;
  /**
   * The specification, as a jeweller would quote it. Every one of these is
   * optional and most pieces predate all of them, so a renderer must drop what
   * is blank rather than print "Metal —".
   *
   * Empty string for absent text, null for an absent number — a ring that
   * weighs nothing is not the same statement as one whose weight nobody has
   * recorded, and 0 g would be printed as a fact.
   */
  metal: string;
  purity: string;
  stone: string;
  stoneQuality: string;
  certificate: string;
  dimensions: string;
  details: string;
  care: string;
  grossWeightG: number | null;
  stoneCarats: number | null;
  stoneCount: number | null;
  madeToOrderDays: number | null;
  sizes: string[];
  /** Further photographs; `img` stays the one the grid and the card use. */
  images: string[];
};

/**
 * Product images are stored the way the old pages referenced them — relative,
 * with no leading slash, because those pages sat at the site root. Under Next
 * the same files are served out of public/, where the path has to be absolute
 * or it resolves against the current route and 404s on every category page.
 */
function normaliseImage(img: unknown): string {
  const path = typeof img === 'string' && img.trim() ? img.trim() : 'images/hero_campaign.png';
  // A data: URI is already the image, not a location — the admin panel's
  // uploader stores one that way. Prefixing a slash turns it into the path
  // "/data:image/jpeg;base64,..." and the picture silently fails to load.
  if (/^(https?:\/\/|data:)/i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

/** Blank, absent and whitespace all mean the same thing: do not render it. */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** null unless it is a real, non-negative number. */
function measure(value: unknown): number | null {
  const n = Number(value);
  return value !== null && value !== undefined && value !== '' && Number.isFinite(n) && n >= 0
    ? n
    : null;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return text(value) ? text(value).split(',').map(v => v.trim()).filter(Boolean) : [];
}

function toProduct(raw: Record<string, unknown>): Product {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    category: String(raw.category ?? ''),
    categories: list(raw.categories),
    price: Number(raw.price ?? 0),
    stock: Number(raw.stock ?? 0),
    badge: String(raw.badge ?? ''),
    img: normaliseImage(raw.img),
    desc: String(raw.desc ?? ''),

    metal: text(raw.metal),
    purity: text(raw.purity),
    stone: text(raw.stone),
    stoneQuality: text(raw.stoneQuality),
    certificate: text(raw.certificate),
    dimensions: text(raw.dimensions),
    details: text(raw.details),
    care: text(raw.care),
    grossWeightG: measure(raw.grossWeightG),
    stoneCarats: measure(raw.stoneCarats),
    stoneCount: measure(raw.stoneCount),
    madeToOrderDays: measure(raw.madeToOrderDays),
    sizes: list(raw.sizes),
    images: list(raw.images).map(normaliseImage)
  };
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    await ensureMongo();
    if (isMongoConnected()) {
      const docs = await ProductModel.find({})
        // Listed from the model so a field added there cannot be saved and then
        // silently never read back.
        .select(['id', 'name', 'category', 'categories', 'price', 'stock', 'badge', 'img', 'desc']
          .concat(ProductModel.SPEC_FIELDS).join(' ') + ' -_id')
        .lean();
      return docs.map(toProduct);
    }
  } catch {
    // Fall through to the file store rather than failing the render. A
    // catalogue page with stale goods on it beats an error page.
  }

  try {
    const db = readData();
    return (db.products ?? []).map(toProduct);
  } catch {
    return [];
  }
}

/** True when a piece belongs to a collection, as its home or as an extra. */
export function inCollection(product: Product, slug: string): boolean {
  const want = slug.toLowerCase();
  return (
    product.category.toLowerCase() === want ||
    product.categories.some(c => c.toLowerCase() === want)
  );
}

/** Pieces in a collection the shop invented, which has no Category record. */
export async function getProductsBySlug(slug: string): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter(p => inCollection(p, slug));
}

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter(p => inCollection(p, category.key));
}

export async function getProductByHandle(handle: string): Promise<Product | undefined> {
  const id = idFromHandle(handle);
  const all = await getAllProducts();
  return all.find(p => p.id === id);
}

/**
 * How many pieces sit in each collection, keyed by the category's stored key.
 *
 * One pass over the catalogue rather than nine calls to getProductsByCategory,
 * each of which would read the whole thing again.
 */
export async function countByCategory(): Promise<Record<string, number>> {
  const all = await getAllProducts();
  const counts: Record<string, number> = {};
  for (const p of all) {
    const key = p.category.toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
