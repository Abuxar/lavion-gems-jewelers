const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * Minimal JWKS client.
 *
 * Providers rotate signing keys, so keys are fetched by `kid` and cached for a
 * short period. Node can turn a JWK straight into a KeyObject, which means the
 * actual signature check stays inside jsonwebtoken rather than being
 * hand-rolled here.
 */
const cache = new Map(); // jwksUri -> { fetchedAt, keys }
const TTL_MS = 60 * 60 * 1000;

async function getKeys(jwksUri, force = false) {
  const hit = cache.get(jwksUri);
  if (!force && hit && Date.now() - hit.fetchedAt < TTL_MS) return hit.keys;

  const res = await fetch(jwksUri);
  if (!res.ok) throw new Error(`JWKS fetch failed (${res.status}) for ${jwksUri}`);
  const body = await res.json();
  const keys = body.keys || [];
  cache.set(jwksUri, { fetchedAt: Date.now(), keys });
  return keys;
}

async function keyForKid(jwksUri, kid) {
  let keys = await getKeys(jwksUri);
  let jwk = keys.find(k => k.kid === kid);
  if (!jwk) {
    // Unknown kid usually means the provider just rotated — refetch once.
    keys = await getKeys(jwksUri, true);
    jwk = keys.find(k => k.kid === kid);
  }
  if (!jwk) throw new Error(`No JWKS key matching kid=${kid}`);
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

/**
 * Verify a provider ID token. Signature, issuer, audience and expiry are all
 * enforced; `nonce` is checked separately because jsonwebtoken has no concept
 * of it and skipping that check would allow replay of a captured token.
 */
async function verifyIdToken({ token, jwksUri, issuer, audience, nonce, algorithms }) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('ID token is missing a key id.');
  }

  const key = await keyForKid(jwksUri, decoded.header.kid);

  const payload = jwt.verify(token, key, {
    algorithms: algorithms || ['RS256'],
    issuer,
    audience,
    clockTolerance: 60
  });

  if (nonce && payload.nonce !== nonce) {
    throw new Error('ID token nonce mismatch.');
  }
  return payload;
}

module.exports = { verifyIdToken };
