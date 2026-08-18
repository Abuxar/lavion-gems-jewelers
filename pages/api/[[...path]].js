/**
 * The whole Express API, mounted inside Next as a single catch-all route.
 *
 * This is deliberate. The backend — auth, the confirmation-code gate, Google
 * OAuth, rate limiting, pricing, orders — is already working and verified in
 * production, and rewriting it as Next route handlers at the same time as the
 * frontend would mean changing both sides of every request at once, with
 * nothing stable left to test against.
 *
 * A Pages Router API route is used rather than an App Router handler because it
 * hands over the raw Node `req`/`res` pair. App Router works in Web `Request`
 * objects, which Express cannot consume. Pages and App routers run happily in
 * the same application, so this costs nothing elsewhere.
 *
 * Same-origin matters as much as the runtime: the session and OAuth state live
 * in httpOnly cookies, so splitting the API onto its own domain would drag in
 * cross-site cookie rules and CORS for no gain.
 */
const app = require('../../server/server');

export const config = {
  // Express parses its own bodies — express.json() and express.urlencoded(),
  // both size-capped in server.js. Letting Next consume the stream first would
  // leave Express reading an already-drained request and every POST arriving
  // with an empty body.
  api: {
    bodyParser: false,
    // The response is finished by Express, not by returning from this handler.
    externalResolver: true
  }
};

export default function handler(req, res) {
  return app(req, res);
}
