const mongoose = require('mongoose');

const GoldRateSchema = new mongoose.Schema({
  rate24kPerTola: { type: Number, default: 463800 },
  rate24kPer10g: { type: Number, default: 397641 },
  rate24kPer1g: { type: Number, default: 39764 },
  rate22kPerTola: { type: Number, default: 425150 },
  rate18kPerTola: { type: Number, default: 347850 },
  rateSilverPerTola: { type: Number, default: 4850 },
  lastUpdated: { type: String, default: 'Live Automatic Sarafa Market Data' }
}, { timestamps: true });

module.exports = mongoose.model('GoldRate', GoldRateSchema);
