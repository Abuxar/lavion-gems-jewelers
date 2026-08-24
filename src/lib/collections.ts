import { CATEGORIES, type Category } from './categories';

/* eslint-disable @typescript-eslint/no-require-imports */
const { ensureMongo, isMongoConnected } = require('../../server/config/db');
const CategoryModel = require('../../server/models/Category');

/**
 * The category registry, with whatever the shop has renamed applied.
 *
 * CATEGORIES stays the source of truth for what exists, what its URL is, and
 * which stored key its pieces file against — all three are part of the build
 * and none of them is the shop's to change. The wording is: a name and a
 * description written into the code a year ago should not need a deploy to
 * fix, so the admin panel stores overrides and this merges them in.
 *
 * Read on the server only. Anything client-side keeps the built-in wording,
 * which is the honest fallback rather than a flash of the wrong name.
 */
export type StoredOverride = {
  slug: string;
  name?: string;
  description?: string;
  image?: string;
};

async function overrides(): Promise<Map<string, StoredOverride>> {
  try {
    await ensureMongo();
    if (!isMongoConnected()) return new Map();
    const docs: StoredOverride[] = await CategoryModel.find({})
      .select('slug name description image -_id')
      .lean();
    return new Map(docs.map(d => [d.slug, d]));
  } catch {
    // The built-in wording is a perfectly good answer; a page that will not
    // render is not.
    return new Map();
  }
}

/** Every built-in collection, in its long-standing order, with edits applied. */
export async function getCategories(): Promise<Category[]> {
  const stored = await overrides();
  if (stored.size === 0) return CATEGORIES;

  return CATEGORIES.map(c => {
    const o = stored.get(c.slug);
    if (!o) return c;
    return {
      ...c,
      name: o.name || c.name,
      // The hero heading follows the name unless a title was written for it;
      // a shop that renames "Gems" to "Gemstones" means the page too.
      title: o.name || c.title,
      description: o.description || c.description,
      image: o.image || c.image
    };
  });
}

/** One of them, by URL segment. */
export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find(c => c.slug === slug);
}
