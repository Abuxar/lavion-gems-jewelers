const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');
const { JWT_SECRET } = require('../middleware/auth');

const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS || '30', 10);
const REFRESH_COOKIE = 'lav_rt';

/** Random, URL-safe, 256 bits of entropy. */
function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Tokens are compared by hash, so store only the hash. SHA-256 (not bcrypt) is
 * correct here: these are already high-entropy random values, so there is
 * nothing to brute-force and we want constant, cheap lookups.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * A six-digit confirmation code.
 *
 * randomInt is uniform; `Math.random() * 900000` is not, and a generator that
 * favours part of its range narrows what a guesser has to cover.
 */
function randomOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

/**
 * Keyed hash — deliberately not the plain SHA-256 used for the tokens above.
 *
 * Those are 256 random bits, so there is nothing to brute-force. A six-digit
 * code is a million possibilities, which a laptop exhausts against an unkeyed
 * digest in under a second. Keying it with the server secret means a leaked
 * database row cannot be turned back into a working code without the secret.
 */
function hashOtp(code) {
  return crypto.createHmac('sha256', JWT_SECRET).update(String(code)).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'customer',
      tv: user.tokenVersion || 0
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TTL, issuer: 'lavion-auth' }
  );
}

function refreshExpiry() {
  return new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);
}

/** Issue a refresh token, optionally continuing an existing rotation family. */
async function issueRefreshToken(user, req, family = null) {
  const token = randomToken();
  await RefreshToken.create({
    tokenHash: hashToken(token),
    userId: user.id,
    family: family || crypto.randomUUID(),
    expiresAt: refreshExpiry(),
    userAgent: (req.headers['user-agent'] || '').slice(0, 300),
    ip: clientIp(req)
  });
  return token;
}

/**
 * Validate a presented refresh token and rotate it.
 *
 * Returns { user: null, reason } on any failure. If the token was already
 * spent, every sibling in its family is revoked — a replayed token means a
 * copy is loose, and we cannot tell the thief from the victim.
 */
async function rotateRefreshToken(presented, req) {
  if (!presented) return { ok: false, reason: 'missing' };

  const row = await RefreshToken.findOne({ tokenHash: hashToken(presented) });
  if (!row) return { ok: false, reason: 'unknown' };

  if (row.usedAt || row.revokedAt) {
    await RefreshToken.updateMany(
      { family: row.family, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    return { ok: false, reason: 'reuse', userId: row.userId };
  }

  if (row.expiresAt <= new Date()) return { ok: false, reason: 'expired' };

  row.usedAt = new Date();
  await row.save();

  return { ok: true, userId: row.userId, family: row.family };
}

async function revokeFamily(family) {
  await RefreshToken.updateMany({ family, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

/**
 * httpOnly so page scripts (and any XSS) cannot read it; SameSite=Lax so it is
 * not sent on cross-site POSTs; Path scoped so it only travels to auth routes.
 */
function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
}

module.exports = {
  ACCESS_TTL,
  REFRESH_COOKIE,
  randomToken,
  hashToken,
  randomOtp,
  hashOtp,
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeFamily,
  revokeAllForUser,
  setRefreshCookie,
  clearRefreshCookie,
  clientIp
};
