const mongoose = require('mongoose');

const CustomOrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerCity: { type: String, default: 'Pakistan' },
  itemType: { type: String, required: true },
  metal: { type: String, default: '22k Gold' },
  goldPurity: { type: String, default: '22k' },
  gemPreference: { type: String, default: 'None' },
  customText: { type: String, default: '' },
  budgetRange: { type: String, default: 'Flexible' },
  notes: { type: String, default: '' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  status: { type: String, default: 'Submitted' }
}, { timestamps: true });

module.exports = mongoose.model('CustomOrder', CustomOrderSchema);
