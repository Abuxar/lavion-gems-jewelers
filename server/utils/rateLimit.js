const AuthAttempt = require('../models/AuthAttempt');
const { clientIp } = require('./tokens');
const { isMongoConnected } = require('../config/db');

/**
 * Fixed-window counter backed by Mongo.
 *
 * A single atomic upsert both increments and reads the counter, so concurrent
 * requests cannot slip past the limit the way a read-then-write would allow.
 */
async function hit(key, limit, windowMs) {
  /**
   * Without a live connection there is no counter to keep, and issuing the
   * query anyway is not free: mongoose buffers commands while disconnected and
   * only rejects once bufferTimeoutMS elapses. Every sign-in therefore sat
   * through that timeout — twice on a failed admin attempt, once for the
   * middleware and once for the failure counter — before doing any real work.
   * Failing open is what limiter() already does when this throws; do it
   * immediately instead of ten seconds later.
   */
  if (!isMongoConnected()) {
    return { allowed: true, remaining: limit, retryAfter: 0, degraded: true };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  const doc = await AuthAttempt.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: now, expiresAt }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Window elapsed — start a fresh one.
  if (doc.windowStart.getTime() + windowMs < now.getTime()) {
    doc.count = 1;
    doc.windowStart = now;
    doc.expiresAt = expiresAt;
    await doc.save();
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (doc.count > limit) {
    const retryAfter = Math.max(
      1,
      Math.ceil((doc.windowStart.getTime() + windowMs - now.getTime()) / 1000)
    );
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: Math.max(0, limit - doc.count), retryAfter: 0 };
}

async function reset(key) {
  if (!isMongoConnected()) return;
  await AuthAttempt.deleteOne({ key });
}

/**
 * Express middleware factory.
 *
 * `scope` names the bucket; limits are applied per IP. Routes that touch a
 * specific account also call hit() directly with an account-scoped key, so a
 * distributed attack cannot dodge the limit by rotating source addresses.
 */
function limiter(scope, limit, windowMs) {
  return async (req, res, next) => {
    try {
      const key = `${scope}:ip:${clientIp(req)}`;
      const r = await hit(key, limit, windowMs);
      if (!r.allowed) {
        res.set('Retry-After', String(r.retryAfter));
        return res.status(429).json({
          success: false,
          message: `Too many attempts. Please try again in ${r.retryAfter}s.`
        });
      }
      next();
    } catch (e) {
      // A limiter outage must not take authentication offline.
      console.error('rateLimit error:', e.message);
      next();
    }
  };
}

/** Exponential backoff on a specific account: 5 strikes, then 1m, 2m, 4m … 60m. */
function lockoutFor(failedAttempts) {
  if (failedAttempts < 5) return null;
  const minutes = Math.min(60, Math.pow(2, failedAttempts - 5));
  return new Date(Date.now() + minutes * 60 * 1000);
}

module.exports = { hit, reset, limiter, lockoutFor };
