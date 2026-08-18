import type { NextConfig } from 'next';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

/**
 * Load server/.env before anything in the API bridge is evaluated.
 *
 * server.js calls dotenv itself on its first line, which is enough under plain
 * Node because CommonJS runs a module body top to bottom. Bundled, it is not:
 * the bundler hoists dependency evaluation above the parent body, so
 * middleware/auth.js reads JWT_SECRET before that dotenv call has run and the
 * server refuses to start.
 *
 * next.config is evaluated once when the Next server boots, well before any
 * route module is instantiated, which makes it the earliest point that
 * reliably runs first. server/.env stays the single source of truth so
 * `npm run api:only` and the Next server cannot drift apart.
 *
 * On Vercel this is a no-op twice over: the file is not deployed, and dotenv
 * does not overwrite variables the platform has already set.
 */
loadEnv({ path: path.resolve(process.cwd(), 'server/.env') });

const nextConfig: NextConfig = {
  // Mongoose and the mail/SMS clients are CommonJS with dynamic requires that
  // a bundler cannot follow. Leaving them external keeps them as plain
  // node_modules requires at runtime instead of being traced and rewritten.
  serverExternalPackages: ['mongoose', 'resend', 'twilio', 'bcryptjs'],

  images: {
    // AVIF first, WebP for anything that cannot take it. Measured on the real
    // catalogue photography: 923 KB PNG -> 128 KB AVIF, with no visible
    // difference at 100% on gold filigree or pearl highlights.
    formats: ['image/avif', 'image/webp']
  },

  // The file-backed store is the fallback used when Mongo is unreachable, so
  // its data has to travel with the deployment rather than being tree-shaken
  // away as an unreferenced directory.
  outputFileTracingIncludes: {
    '/api/**': ['./server/db/**']
  }
};

export default nextConfig;
