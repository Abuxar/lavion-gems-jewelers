const mongoose = require('mongoose');

const GoldRateSchema = new mongoose.Schema({
  rate24kPerTola: { type: Number, default: 428500 },
  rate24kPer10g: { type: Number, default: 367376 },
  rate24kPer1g: { type: Number, default: 36738 },
  rate22kPerTola: { type: Number, default: 392790 },
  rate18kPerTola: { type: Number, default: 321375 },
  rateSilverPerTola: { type: Number, default: 4850 },
  lastUpdated: { type: String, default: 'Live Sarafa Market Data' }
}, { timestamps: true });

module.exports = mongoose.model('GoldRate', GoldRateSchema);
