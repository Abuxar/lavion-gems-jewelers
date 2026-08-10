/**
 * Local development server.
 *
 * Serves the site AND the API on one origin (http://localhost:5000), which is
 * what authentication needs — a static file server has no /api routes, so the
 * sign-in providers never load and no social buttons appear.
 *
 * If MONGO_URI is empty it spins up a throwaway in-memory MongoDB, so you can
 * work on auth without installing a database. Data is discarded on exit.
 *
 *   node scripts/dev-server.js
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');

require('dotenv').config({ path: path.join(ROOT, 'server/.env') });
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

(async () => {
  if (!process.env.MONGO_URI) {
    let MongoMemoryServer;
    try {
      ({ MongoMemoryServer } = require('mongodb-memory-server'));
    } catch (e) {
      console.error('\n MONGO_URI is empty and mongodb-memory-server is not installed.');
      console.error(' Either set MONGO_URI in server/.env, or run:');
      console.error('   npm install --no-save mongodb-memory-server\n');
      process.exit(1);
    }
    console.log(' Starting a temporary in-memory MongoDB (data is not persisted)…');
    const mongod = await MongoMemoryServer.create();
    process.env.MONGO_URI = mongod.getUri('lavion_dev');
    process.on('SIGINT', async () => { await mongod.stop(); process.exit(0); });
  }

  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGO_URI);
  await require(path.join(ROOT, 'server/config/db.js')).connectDB();

  const app = require(path.join(ROOT, 'server/server.js'));
  const port = process.env.PORT || 5000;

  app.listen(port, () => {
    const { configuredProviders } = require(path.join(ROOT, 'server/utils/oauth.js'));
    const providers = configuredProviders();

    console.log('\n=======================================================');
    console.log(`  Lavion dev server:  http://localhost:${port}`);
    console.log(`  Health:             http://localhost:${port}/api/health`);
    console.log('-------------------------------------------------------');
    console.log(`  Social sign-in:     ${providers.length ? providers.join(', ') : 'none configured'}`);
    if (!providers.length) {
      console.log('    -> add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to');
      console.log('       server/.env and restart to enable the Google button.');
    }
    console.log(`  Email delivery:     ${process.env.RESEND_API_KEY ? 'enabled' : 'DISABLED (no RESEND_API_KEY)'}`);
    if (!process.env.RESEND_API_KEY) {
      console.log('    -> verification / reset links will be printed below');
      console.log('       instead of being emailed.');
    }
    console.log('=======================================================\n');
  });
})().catch(err => {
  console.error('Dev server failed to start:', err);
  process.exit(1);
});
