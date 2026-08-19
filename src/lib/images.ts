/**
 * Image helpers with no database behind them.
 *
 * This lived in catalogue.ts, which requires mongoose and the file store. The
 * cart runs in the browser and needs the same check, and importing it from
 * there dragged the whole server module graph into the client bundle — the
 * build failed on "Can't resolve 'fs'", which is the bundler pointing out that
 * a browser has no filesystem.
 */

/** Embedded images cannot be fetched and resized by the image optimiser. */
export function isEmbeddedImage(src: string): boolean {
  return src.startsWith('data:');
}
