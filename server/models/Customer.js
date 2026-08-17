const mongoose = require('mongoose');

/**
 * A federated identity linked to this account (Google / Apple / Facebook).
 * `sub` is the provider's immutable user id — never the email, which can change.
 */
const IdentitySchema = new mongoose.Schema({
  provider: { type: String, required: true, enum: ['google', 'apple', 'facebook'] },
  sub: { type: String, required: true },
  email: { type: String, default: '' },
  linkedAt: { type: Date, default: Date.now }
}, { _id: false });

const CustomerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  phone: { type: String, default: '' },
  city: { type: String, default: 'Pakistan' },

  // Absent for accounts that only ever signed in through a provider.
  passwordHash: { type: String, default: null },

  emailVerified: { type: Boolean, default: false },
  identities: { type: [IdentitySchema], default: [] },

  // Single-use, SHA-256 hashed at rest so a database leak cannot be replayed.
  verifyTokenHash: { type: String, default: null },
  verifyTokenExpires: { type: Date, default: null },
  resetTokenHash: { type: String, default: null },
  resetTokenExpires: { type: Date, default: null },

  // The six-digit code that confirms a new email account. Stored as a keyed
  // hash (see hashOtp in utils/tokens) because six digits is a small enough
  // space to reverse from a plain digest. `otpSentAt` backs the resend
  // cooldown, `otpAttempts` caps guessing before the code is thrown away.
  otpHash: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  otpSentAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },

  // Throttling state for password attempts against this specific account.
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },

  // Bumped on password reset / "sign out everywhere" to invalidate live access
  // tokens before they expire on their own.
  tokenVersion: { type: Number, default: 0 },

  lastLoginAt: { type: Date, default: null },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' }
}, { timestamps: true });

// One account per provider identity.
CustomerSchema.index({ 'identities.provider': 1, 'identities.sub': 1 });

CustomerSchema.methods.isLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

/** Shape sent to the browser. Never include hashes or token state. */
CustomerSchema.methods.toPublic = function () {
  return {
    id: this.id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    city: this.city,
    emailVerified: this.emailVerified,
    hasPassword: !!this.passwordHash,
    providers: this.identities.map(i => i.provider),
    role: this.role
  };
};

module.exports = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
