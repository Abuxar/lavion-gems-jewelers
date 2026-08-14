const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { sendSubscriberAlert, sendSubscriberWelcome, sendCampaign } = require('../utils/email');
const { readData, writeDataOrThrow, failWith } = require('../utils/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { isMongoConnected } = require('../config/db');
const { baseUrl } = require('../utils/oauth');
const Subscriber = require('../models/Subscriber');

/**
 * Newsletter subscribers.
 *
 * The same two-store arrangement the catalog and orders use: Mongo where it is
 * connected, the JSON file for local development. Note that the file store
 * cannot persist on a serverless host, so in production the list only survives
 * because Mongo is connected.
 */
function usingMongo() {
  return isMongoConnected();
}

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

/** A deliberately conservative check — this address has to survive a bulk send. */
function validEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

function unsubscribeUrlFor(token) {
  return `${baseUrl()}/api/subscribe/unsubscribe?token=${token}`;
}

// ─── POST /api/subscribe ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const raw = (req.body && req.body.email) || '';
    if (!validEmail(raw)) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }
    const email = raw.trim().toLowerCase();
    const already = { success: true, message: 'You are already on our list — thank you!' };
    const welcome = { success: true, message: 'Thank you for subscribing!' };

    if (usingMongo()) {
      const existing = await Subscriber.findOne({ email });

      if (existing && existing.status === 'active') return res.json(already);

      if (existing) {
        // Previously unsubscribed and now opting back in. A fresh token retires
        // the one in their old mail, so an ancient link cannot re-remove them.
        existing.status = 'active';
        existing.unsubscribeToken = newToken();
        existing.subscribedAt = new Date();
        existing.unsubscribedAt = null;
        await existing.save();
        sendSubscriberWelcome({ email, unsubscribeUrl: unsubscribeUrlFor(existing.unsubscribeToken) });
        sendSubscriberAlert({ email });
        return res.json(welcome);
      }

      const created = await Subscriber.create({ email, unsubscribeToken: newToken() });
      sendSubscriberWelcome({ email, unsubscribeUrl: unsubscribeUrlFor(created.unsubscribeToken) });
      sendSubscriberAlert({ email });
      return res.json(welcome);
    }

    // ---- file store ----
    const db = readData();
    db.subscribers = db.subscribers || [];
    const existing = db.subscribers.find(s => s.email === email);

    if (existing && existing.status === 'active') return res.json(already);

    const token = newToken();
    if (existing) {
      existing.status = 'active';
      existing.unsubscribeToken = token;
      existing.subscribedAt = new Date().toISOString();
      existing.unsubscribedAt = null;
    } else {
      db.subscribers.push({
        email,
        status: 'active',
        unsubscribeToken: token,
        source: 'homepage',
        subscribedAt: new Date().toISOString(),
        unsubscribedAt: null,
        lastCampaignAt: null
      });
    }
    writeDataOrThrow(db);

    sendSubscriberWelcome({ email, unsubscribeUrl: unsubscribeUrlFor(token) });
    sendSubscriberAlert({ email });
    res.json(welcome);
  } catch (error) {
    failWith(res, error, 'Could not record your subscription.');
  }
});

// ─── GET /api/subscribe/unsubscribe?token=… ──────────────────────────────────
/**
 * Public and GET, because it is opened from a link in an email client. Answers
 * HTML rather than JSON for the same reason — a person is reading it.
 */
router.get('/unsubscribe', async (req, res) => {
  const page = (title, message) => `<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Lavion</title></head>
    <body style="margin:0;background:#0a0a0a;color:#d4c5a9;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
      <div style="max-width:520px;padding:40px;text-align:center;border:1px solid #c9a84c;border-radius:12px;background:linear-gradient(135deg,#1a1208,#0d0d0d);">
        <h1 style="color:#c9a84c;font-size:22px;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px;">Lavion</h1>
        <p style="font-size:15px;line-height:1.8;margin:0 0 24px;">${message}</p>
        <a href="${baseUrl()}/" style="color:#c9a84c;font-size:13px;">Return to the site</a>
      </div></body></html>`;

  try {
    const token = String((req.query && req.query.token) || '');
    if (!token) return res.status(400).send(page('Invalid link', 'That unsubscribe link is missing its token.'));

    const done = page('Unsubscribed', 'You have been removed from the Lavion newsletter. You will not receive further promotional emails from us.');

    if (usingMongo()) {
      const sub = await Subscriber.findOne({ unsubscribeToken: token });
      if (!sub) return res.status(404).send(page('Link not recognised', 'That unsubscribe link is not valid. It may already have been used.'));
      if (sub.status !== 'unsubscribed') {
        sub.status = 'unsubscribed';
        sub.unsubscribedAt = new Date();
        await sub.save();
      }
      return res.send(done);
    }

    const db = readData();
    db.subscribers = db.subscribers || [];
    const sub = db.subscribers.find(s => s.unsubscribeToken === token);
    if (!sub) return res.status(404).send(page('Link not recognised', 'That unsubscribe link is not valid. It may already have been used.'));
    sub.status = 'unsubscribed';
    sub.unsubscribedAt = new Date().toISOString();
    writeDataOrThrow(db);
    res.send(done);
  } catch (error) {
    console.error('unsubscribe error:', error);
    res.status(500).send(page('Something went wrong', 'We could not process that request. Please contact us and we will remove you manually.'));
  }
});

// ─── GET /api/subscribe/list (admin) ─────────────────────────────────────────
router.get('/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let subscribers;
    if (usingMongo()) {
      subscribers = await Subscriber.find({})
        .sort({ createdAt: -1 })
        .select('email status source subscribedAt unsubscribedAt lastCampaignAt -_id')
        .lean();
    } else {
      subscribers = (readData().subscribers || []).slice().reverse();
    }

    const active = subscribers.filter(s => s.status === 'active').length;
    res.json({
      success: true,
      total: subscribers.length,
      active,
      unsubscribed: subscribers.length - active,
      // The token is deliberately never returned: it is the credential that
      // removes someone from the list.
      subscribers: subscribers.map(s => ({
        email: s.email,
        status: s.status,
        source: s.source,
        subscribedAt: s.subscribedAt,
        lastCampaignAt: s.lastCampaignAt
      }))
    });
  } catch (error) {
    failWith(res, error, 'Failed to load subscribers.');
  }
});

// ─── POST /api/subscribe/campaign (admin) ────────────────────────────────────
/**
 * Compose-and-send, driven from the admin panel.
 *
 * `test: true` sends only to the admin address so a promotion can be proofread
 * in a real inbox before it reaches the list — there is no recalling a send.
 */
router.post('/campaign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { subject, heading, body, ctaLabel, ctaUrl, test } = req.body || {};

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ success: false, message: 'A subject line is required.' });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, message: 'The message body cannot be empty.' });
    }
    if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) {
      return res.status(400).json({ success: false, message: 'The button link must start with http:// or https://.' });
    }

    const campaign = {
      subject: String(subject).trim(),
      heading: String(heading || subject).trim(),
      body: String(body),
      ctaLabel: ctaLabel ? String(ctaLabel).trim() : '',
      ctaUrl: ctaUrl ? String(ctaUrl).trim() : ''
    };

    // ---- proof to the admin only ----
    if (test) {
      const to = process.env.ADMIN_EMAIL || 'laviongems.jewellers@gmail.com';
      const result = await sendCampaign({
        ...campaign,
        subject: `[TEST] ${campaign.subject}`,
        recipients: [{ email: to, unsubscribeUrl: unsubscribeUrlFor('test-preview-token') }]
      });
      return res.json({
        success: result.sent > 0,
        test: true,
        message: result.sent > 0
          ? `Test email sent to ${to}.`
          : `Test send failed: ${(result.errors || []).join('; ') || 'unknown error'}`
      });
    }

    // ---- the real send ----
    let recipients;
    if (usingMongo()) {
      const rows = await Subscriber.find({ status: 'active' }).select('email unsubscribeToken -_id').lean();
      recipients = rows.map(r => ({ email: r.email, unsubscribeUrl: unsubscribeUrlFor(r.unsubscribeToken) }));
    } else {
      recipients = (readData().subscribers || [])
        .filter(s => s.status === 'active')
        .map(s => ({ email: s.email, unsubscribeUrl: unsubscribeUrlFor(s.unsubscribeToken) }));
    }

    if (!recipients.length) {
      return res.status(400).json({ success: false, message: 'There are no active subscribers to send to.' });
    }

    const result = await sendCampaign({ ...campaign, recipients });

    if (result.sent > 0) {
      const now = new Date();
      if (usingMongo()) {
        await Subscriber.updateMany({ status: 'active' }, { $set: { lastCampaignAt: now } });
      } else {
        const db = readData();
        (db.subscribers || []).forEach(s => { if (s.status === 'active') s.lastCampaignAt = now.toISOString(); });
        writeDataOrThrow(db);
      }
    }

    res.json({
      success: result.sent > 0,
      sent: result.sent,
      failed: result.failed,
      message: result.failed
        ? `Sent to ${result.sent} subscriber(s); ${result.failed} failed. ${(result.errors || []).join('; ')}`
        : `Promotional email sent to ${result.sent} subscriber(s).`
    });
  } catch (error) {
    failWith(res, error, 'Failed to send the campaign.');
  }
});

module.exports = router;
