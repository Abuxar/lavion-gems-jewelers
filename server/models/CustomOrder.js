const mongoose = require('mongoose');

const CustomOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  // The studio form has always collected an address to quote against; without
  // these the stored request lost the two fields needed to reply to it.
  customerEmail: { type: String, default: '' },
  customerCity: { type: String, default: 'Pakistan' },
  itemType: { type: String, required: true },
  metal: { type: String, default: '22k Gold' },
  goldPurity: { type: String, default: '22k' },
  gemPreference: { type: String, default: 'None' },
  // Which market the brief was written for. It decides the purities offered,
  // the unit the weight was typed in and the currency the budget is in, so a
  // request cannot be read correctly without it.
  region: { type: String, default: 'PK' },
  // The weight as the customer entered it, kept alongside the grams it works
  // out to. Storing only the grams would lose the fact that they asked for
  // "10 tola" — a round number in their unit that stops being round in ours.
  metalWeight: { type: Number, default: 0 },
  metalWeightUnit: { type: String, default: 'g' },
  metalWeightGrams: { type: Number, default: 0 },
  centreStoneCarat: { type: Number, default: 0 },
  totalCarat: { type: Number, default: 0 },
  stoneQuality: { type: String, default: '' },
  /**
   * The indicative price the studio quoted at the moment of submission, in
   * the market's own currency. Stored as a snapshot rather than recomputed on
   * reading: gold moves daily, and the shop needs to know what the customer
   * was actually shown when they pressed submit, not what the same brief
   * would cost today.
   */
  estimateLow: { type: Number, default: 0 },
  estimateHigh: { type: Number, default: 0 },
  estimateCurrency: { type: String, default: '' },
  estimateBasis: { type: String, default: '' },
  customText: { type: String, default: '' },
  budgetRange: { type: String, default: 'Flexible' },
  notes: { type: String, default: '' },
  referenceUrl: { type: String, default: '' },
  // A downscaled JPEG data URL of the customer's sketch or photo. The studio
  // form caps it well below the request body limit before it is sent.
  referenceImage: { type: String, default: '' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  status: { type: String, default: 'Submitted' }
}, { timestamps: true });

module.exports = mongoose.model('CustomOrder', CustomOrderSchema);
