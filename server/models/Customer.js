const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, default: '' },
  city: { type: String, default: 'Pakistan' },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);
