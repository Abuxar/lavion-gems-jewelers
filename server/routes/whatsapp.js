const express = require('express');
const router = express.Router();
const { sendWhatsAppMessage } = require('../utils/whatsapp');

// POST /api/whatsapp/send
router.post('/send', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ success: false, message: 'to and message are required' });
  const result = await sendWhatsAppMessage({ to, body: message });
  if (result.ok) return res.json({ success: true, sid: result.sid });
  return res.status(500).json({ success: false, error: result.error });
});

module.exports = router;
