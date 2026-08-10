const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const GoldRate = require('../models/GoldRate');
const Customer = require('../models/Customer');
const { readData } = require('../utils/db');


/**
 * Why the database is not in use, in words.
 *
 * "File DB Fallback" on its own could mean an unset MONGO_URI, a bad password
 * or a host that never allowed the connection, and from outside the deployment
 * the three are indistinguishable — which turns a five-minute fix into
 * guesswork. /api/health reports this.
 */
let lastDbNote = 'Not attempted yet.';
let lastDbDetail = null;
let lastAttemptAt = 0;
let inFlight = null;
let attempts = 0;

/** Don't hammer an unreachable cluster on every single request. */
const RETRY_COOLDOWN_MS = 15000;

async function connectDB() {
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    lastDbNote = 'MONGO_URI is not set on this deployment.';
    console.log(' ℹ️ MONGO_URI not set. Operating in File DB mode.');
    return;
  }

  // Describe the URI without disclosing it: enough to tell a wrong host or a
  // mangled value from a network refusal, which the summary line cannot.
  lastDbDetail = describeUri(mongoURI);
  lastAttemptAt = Date.now();
  attempts++;

  try {
    mongoose.set('strictQuery', false);
    /**
     * Buffering exists so a query issued during a connection handshake waits
     * rather than failing. The default ceiling of 10s is far past useful on a
     * serverless request: if the handshake has not landed in two, it is not
     * landing, and the caller should fall back rather than hold the request
     * open. serverSelectionTimeoutMS below is already 3s.
     */
    mongoose.set('bufferTimeoutMS', 2000);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000
    });
    lastDbNote = 'Connected.';
    console.log(' 🍃 MongoDB Connected Successfully!');

    // Seed database if empty
    await seedMongoIfEmpty();
  } catch (error) {
    // Atlas answers a blocked source address with a server-selection failure,
    // which is by far the most common cause on a host with rotating IPs.
    lastDbNote = /server selection|ETIMEDOUT|ENOTFOUND|querySrv/i.test(error.message)
      ? `Could not reach the cluster (${error.message.slice(0, 120)}). If this is MongoDB Atlas, add 0.0.0.0/0 under Network Access — a serverless host has no fixed IP to allowlist.`
      : error.message.slice(0, 200);

    lastDbDetail = {
      ...lastDbDetail,
      errorName: error.name,
      errorCode: error.code || null,
      // The driver records why it rejected each candidate host. That is what
      // separates a blocked address from a wrong one or a bad password.
      servers: error.reason && error.reason.servers
        ? Object.fromEntries([...error.reason.servers].map(([host, d]) => [host, d.error ? String(d.error).slice(0, 160) : d.type]))
        : null,
      setName: error.reason ? error.reason.setName : null,
      message: error.message.slice(0, 300)
    };
    console.log(' ⚠️ MongoDB Atlas Connection Note:', error.message);
    console.log(' ℹ️ Operating in File DB mode.');
  }
}

async function seedMongoIfEmpty() {
  try {
    const fileData = readData();

    const prodCount = await Product.countDocuments();
    if (prodCount === 0 && fileData.products && fileData.products.length > 0) {
      await Product.insertMany(fileData.products);
      console.log(` 🌱 Seeded ${fileData.products.length} products to MongoDB.`);
    }

    const orderCount = await Order.countDocuments();
    if (orderCount === 0 && fileData.orders && fileData.orders.length > 0) {
      await Order.insertMany(fileData.orders);
      console.log(` 🌱 Seeded ${fileData.orders.length} orders to MongoDB.`);
    }

    const rateCount = await GoldRate.countDocuments();
    if (rateCount === 0 && fileData.goldRates) {
      await GoldRate.create(fileData.goldRates);
      console.log(' 🌱 Seeded Gold Rates to MongoDB.');
    }

    const custCount = await Customer.countDocuments();
    if (custCount === 0 && fileData.customers && fileData.customers.length > 0) {
      await Customer.insertMany(fileData.customers);
      console.log(' 🌱 Seeded Demo Customer to MongoDB.');
    }
  } catch (e) {
    console.error('Mongo Seeding error:', e.message);
  }
}

/**
 * Read the driver's own state rather than a flag set once at startup. The flag
 * could not notice a connection dropping later in a container's life, which
 * left callers routing queries at a dead socket.
 */
function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Facts about the configured URI that are safe to expose: never the password,
 * never the full string. Enough to answer "is the value even the shape we
 * think it is" without a redeploy to add a console.log.
 */
function describeUri(uri) {
  try {
    const u = new URL(uri);
    return {
      scheme: u.protocol.replace(':', ''),
      host: u.hostname,
      database: u.pathname.replace(/^\//, '') || '(none)',
      hasUser: Boolean(u.username),
      hasPassword: Boolean(u.password),
      passwordLength: u.password ? u.password.length : 0,
      options: u.search ? u.search.slice(1) : '(none)',
      // A value pasted with quotes or a stray newline fails in ways that look
      // like a network problem.
      suspiciousWrapping: /^["']|["']$|\s$/.test(uri)
    };
  } catch (e) {
    return { parseError: e.message.slice(0, 120), rawLength: uri.length };
  }
}

/**
 * Try again, on demand.
 *
 * connectDB() ran once when the instance booted. An instance that started while
 * the database was unreachable therefore stayed in file-DB mode for the whole
 * of its life — so fixing the cause (an Atlas allowlist, a paused cluster, a
 * network blip) appeared to change nothing until every warm instance happened
 * to be recycled. Requests now retry, at most once per cooldown, and a single
 * in-flight attempt is shared rather than started per request.
 */
function ensureMongo() {
  if (isMongoConnected()) return Promise.resolve(true);
  if (inFlight) return inFlight;
  if (Date.now() - lastAttemptAt < RETRY_COOLDOWN_MS) return Promise.resolve(false);

  inFlight = connectDB()
    .then(() => isMongoConnected())
    .catch(() => false)
    .finally(() => { inFlight = null; });

  return inFlight;
}

/**
 * Express middleware. It waits for a reconnect, but never longer than the
 * driver's own server-selection budget plus a little — a request must not hang
 * on a database that is not answering, it should fall back and say so.
 */
function withMongoRetry(req, res, next) {
  if (isMongoConnected()) return next();

  let settled = false;
  const go = () => { if (!settled) { settled = true; next(); } };

  const timer = setTimeout(go, 3500);
  ensureMongo().finally(() => { clearTimeout(timer); go(); });
}

function dbStatusNote() {
  return isMongoConnected() ? 'Connected.' : lastDbNote;
}

function dbDiagnostics() {
  return {
    connected: isMongoConnected(),
    note: dbStatusNote(),
    attempts,
    secondsSinceLastAttempt: lastAttemptAt ? Math.round((Date.now() - lastAttemptAt) / 1000) : null,
    uri: lastDbDetail
  };
}

module.exports = {
  connectDB,
  ensureMongo,
  withMongoRetry,
  isMongoConnected,
  dbStatusNote,
  dbDiagnostics
};
