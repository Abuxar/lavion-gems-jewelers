const mongoose = require('mongoose');

/**
 * One row per issued refresh token.
 *
 * Tokens are opaque random strings; only their SHA-256 hash is stored, so the
 * database alone is not enough to impersonate anyone.
 *
 * Rotation: refreshing marks the current row `usedAt` and issues a successor
 * with the same `family`. If a token that was already used comes back, it means
 * a copy leaked — the whole family is revoked. That is the reuse detection.
 */
const RefreshTokenSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  family: { type: String, required: true, index: true },

  usedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true },

  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' }
}, { timestamps: true });

// Let Mongo reap expired rows so the collection cannot grow without bound.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.RefreshToken || mongoose.model('RefreshToken', RefreshTokenSchema);
