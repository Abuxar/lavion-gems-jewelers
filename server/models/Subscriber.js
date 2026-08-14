const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * A newsletter subscriber.
 *
 * Until now /api/subscribe only emailed the admin an alert and discarded the
 * address, so there was no list to send a promotion to — the subscriber existed
 * solely as a line in an inbox. This is that list.
 */
const SubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

  // Unsubscribed rows are kept rather than deleted: re-subscribing should not
  // silently resurrect someone who asked to be left alone, and honouring a
  // repeat opt-out is only possible if the earlier one is still on record.
  status: { type: String, enum: ['active', 'unsubscribed'], default: 'active', index: true },

  /**
   * Unguessable per-subscriber token, embedded in the unsubscribe link.
   * Keying that link on the email address alone would let anyone unsubscribe
   * anyone else by editing the URL.
   */
  unsubscribeToken: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(24).toString('hex')
  },

  source: { type: String, default: 'homepage' },
  subscribedAt: { type: Date, default: Date.now },
  unsubscribedAt: { type: Date, default: null },
  lastCampaignAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);
