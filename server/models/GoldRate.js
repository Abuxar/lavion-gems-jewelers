const mongoose = require('mongoose');

const GoldRateSchema = new mongoose.Schema({
  rate24kPerTola: { type: Number, default: 437000 },
  rate24kPer10g: { type: Number, default: 374663 },
  rate24kPer1g: { type: Number, default: 37466 },
  rate22kPerTola: { type: Number, default: 400583 },
  rate18kPerTola: { type: Number, default: 327750 },
  rateSilverPerTola: { type: Number, default: 4850 },
  lastUpdated: { type: String, default: 'Official Gujranwala Sarafa Market Rate' }
}, { timestamps: true });

module.exports = mongoose.model('GoldRate', GoldRateSchema);
