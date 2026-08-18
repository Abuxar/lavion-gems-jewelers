const fs = require('fs');
const path = require('path');

/**
 * Where the fallback store actually is.
 *
 * __dirname alone was enough while this ran as plain Node, but a bundler
 * rewrites it to the location of the generated chunk rather than of this
 * source file, so the path pointed nowhere and readData() reported "Database
 * file does not exist" and quietly returned an empty catalogue. That is the
 * worst possible failure for a fallback: it only runs when Mongo is already
 * down, so the one time it matters it would have served an empty shop instead
 * of a stale one.
 *
 * The working-directory candidate is what resolves correctly when bundled.
 */
const DB_PATH = [
  path.join(__dirname, '../db/data.json'),
  path.join(process.cwd(), 'server/db/data.json')
].find(candidate => fs.existsSync(candidate)) || path.join(__dirname, '../db/data.json');

// Ensure DB file exists
function readData() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error('Database file does not exist.');
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading database:', error.message);
    return {
      products: [],
      orders: [],
      goldRates: {
        rate24kPerTola: 437000,
        rate24kPer10g: 374663,
        rate24kPer1g: 37466,
        rate22kPerTola: 400583,
        rate18kPerTola: 327750,
        rateSilverPerTola: 4850,
        lastUpdated: 'Official Gujranwala Sarafa Market Rate'
      },
      customers: [],
      customOrders: [],
      subscribers: []
    };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to database:', error.message);
    return false;
  }
}

/**
 * writeData that refuses to be ignored.
 *
 * DB_PATH lives inside the deployment bundle, which is read-only on a
 * serverless host. Callers were dropping the boolean and answering 200 with a
 * success message, so an admin saw "Product updated successfully!" for a write
 * that never happened and only noticed when the value came back unchanged.
 * Throwing makes the route's own catch produce an honest error instead.
 */
function writeDataOrThrow(data) {
  if (!writeData(data)) {
    const err = new Error(
      'The catalog is read-only on this deployment, so the change was not saved. ' +
      'A database (MONGO_URI) is required for changes to persist.'
    );
    err.code = 'DB_READ_ONLY';
    throw err;
  }
}

/**
 * Answer a route failure. A read-only store is not a server fault and not
 * something a retry fixes, so it gets 503 and says what is actually wrong
 * rather than hiding behind a generic 500.
 */
function failWith(res, error, fallbackMessage) {
  if (error && error.code === 'DB_READ_ONLY') {
    return res.status(503).json({ success: false, message: error.message, code: 'DB_READ_ONLY' });
  }
  return res.status(500).json({ success: false, message: fallbackMessage, error: error && error.message });
}

module.exports = {
  readData,
  writeData,
  writeDataOrThrow,
  failWith
};
