const crypto = require('crypto');
const jwt = require('jsonwebtoken');

/**
 * The signing secret must come from the environment.
 *
 * The previous hardcoded fallback meant anyone with the repository could mint
 * valid admin tokens against production. In production a missing secret is now
 * a hard startup failure; in development we generate an ephemeral one, so
 * tokens simply stop working on restart instead of being predictable.
 */
function resolveSecret() {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET must be set to at least 32 characters in production. Refusing to start with a guessable secret.'
    );
  }

  if (fromEnv) {
    console.warn(' ⚠️  JWT_SECRET is shorter than 32 characters — using it anyway (development only).');
    return fromEnv;
  }

  console.warn(' ⚠️  JWT_SECRET not set. Generating an ephemeral development secret; sessions end on restart.');
  return crypto.randomBytes(48).toString('hex');
}

const JWT_SECRET = resolveSecret();

function extractToken(req) {
  const header = req.headers['authorization'];
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

function authenticateToken(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.', code: 'NO_TOKEN' });
  }

  jwt.verify(token, JWT_SECRET, { issuer: 'lavion-auth' }, (err, payload) => {
    if (err) {
      const expired = err.name === 'TokenExpiredError';
      return res.status(401).json({
        success: false,
        message: expired ? 'Session expired.' : 'Invalid session.',
        code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID'
      });
    }
    req.user = payload;
    next();
  });
}

/** Attaches req.user when a valid token is present, but never rejects. */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  jwt.verify(token, JWT_SECRET, { issuer: 'lavion-auth' }, (err, payload) => {
    if (!err) req.user = payload;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin privileges required.' });
  }
  next();
}

/**
 * Rejects access tokens minted before a password reset or "sign out
 * everywhere", which would otherwise stay valid until they expired.
 */
function requireCurrentTokenVersion(user) {
  return (req, res, next) => {
    if (!req.user || (req.user.tv || 0) !== (user.tokenVersion || 0)) {
      return res.status(401).json({ success: false, message: 'Session revoked.', code: 'TOKEN_STALE' });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireCurrentTokenVersion,
  JWT_SECRET
};
