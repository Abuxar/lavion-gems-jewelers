let twilio;
try {
  twilio = require('twilio');
} catch (e) {
  console.log('[WhatsApp] twilio package not installed or failed to load.');
}

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !twilio) return null;
  return twilio(sid, token);
}

const FROM = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_FROM || '';

async function sendWhatsAppMessage({ to, body }) {
  const client = getClient();
  if (!client) {
    console.error('[WhatsApp] Twilio credentials not configured.');
    return { ok: false, error: 'No Twilio credentials' };
  }
  if (!to) return { ok: false, error: 'Missing recipient number' };
  try {
    const msg = await client.messages.create({
      from: FROM.startsWith('whatsapp:') ? FROM : `whatsapp:${FROM}`,
      to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
      body
    });
    console.log(`[WhatsApp] Sent message ${msg.sid} to ${to}`);
    return { ok: true, sid: msg.sid };
  } catch (err) {
    console.error('[WhatsApp] send failed:', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = { sendWhatsAppMessage };
