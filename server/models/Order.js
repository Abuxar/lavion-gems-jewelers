const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  customer: { type: String, required: true },
  phone: { type: String, required: true },
  // The routes write these two; without them here, strict mode drops them
  // silently — the confirmation address and the quotation flag both vanish.
  email: { type: String, default: '' },
  priceConfirmed: { type: Boolean, default: false },
  city: { type: String, required: true },
  address: { type: String, required: true },
  payment: { type: String, default: 'Cash on Delivery' },
  items: { type: String, required: true },
  total: { type: Number, default: 0 },
  status: { type: String, default: 'Pending' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true });

// Guarded like every other model here: the API bundle and the page bundle are
// compiled separately but share one mongoose instance, so the second to load
// would otherwise hit "Cannot overwrite `Order` model once compiled".
module.exports = mongoose.models.Order || mongoose.model('Order', OrderSchema);
