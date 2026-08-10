const mongoose = require('mongoose');

/**
 * Rate-limit counters.
 *
 * Kept in Mongo rather than process memory on purpose: on Vercel each request
 * may hit a fresh serverless instance, so an in-memory limiter would reset
 * constantly and enforce nothing.
 *
 * `key` is a scope string such as `login:ip:1.2.3.4` or `login:acct:a@b.com`.
 */
const AuthAttemptSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

AuthAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.AuthAttempt || mongoose.model('AuthAttempt', AuthAttemptSchema);
