const express = require('express');
const router = express.Router();
const { sendSubscriberAlert } = require('../utils/email');

// POST /api/subscribe - Newsletter subscription
router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'A valid email address is required.' });
  }

  // Notify admin (non-blocking)
  sendSubscriberAlert({ email });

  res.json({ success: true, message: 'Thank you for subscribing!' });
});

module.exports = router;
