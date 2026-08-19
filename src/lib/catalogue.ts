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
  price: number;
  stock: number;
  badge: string;
  /** Always root-relative, e.g. /images/featured_rings.png */
  img: string;
  desc: string;
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

function toProduct(raw: Record<string, unknown>): Product {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    category: String(raw.category ?? ''),
    price: Number(raw.price ?? 0),
    stock: Number(raw.stock ?? 0),
    badge: String(raw.badge ?? ''),
    img: normaliseImage(raw.img),
    desc: String(raw.desc ?? '')
  };
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    await ensureMongo();
    if (isMongoConnected()) {
      const docs = await ProductModel.find({})
        .select('id name category price stock badge img desc -_id')
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

export async function getProductsByCategory(category: Category): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter(p => p.category.toLowerCase() === category.key.toLowerCase());
}

export async function getProductByHandle(handle: string): Promise<Product | undefined> {
  const id = idFromHandle(handle);
  const all = await getAllProducts();
  return all.find(p => p.id === id);
}
