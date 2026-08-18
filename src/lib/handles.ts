/**
 * How a product turns into a URL, and back.
 *
 * Kept free of any database import for the same reason the category registry
 * is: the sitemap and the structured-data helpers need to build product URLs
 * and neither of them should drag mongoose in to do it.
 */

/**
 * A product's URL: its name, then its id.
 *
 * /product/7 tells neither a reader nor a crawler anything, and the words in a
 * URL are one of the cheaper ranking signals to earn. But a name alone cannot
 * be the address, because renaming a piece in the admin panel would silently
 * break every link to it. Keeping the id on the end means the name is free to
 * change — the trailing id still resolves, and the reader is redirected to
 * whatever the current name is, so there is only ever one indexable URL.
 */
export function productHandle(product: { name: string; id: string }): string {
  const slug = product.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `${slug}-${product.id}` : product.id;
}

/** The id is whatever follows the last hyphen; the words before it are decoration. */
export function idFromHandle(handle: string): string {
  const at = handle.lastIndexOf('-');
  return at === -1 ? handle : handle.slice(at + 1);
}
