let Resend;
try {
  Resend = require('resend').Resend;
} catch (e) {
  console.log('[Email] resend package not installed or failed to load.');
}

// Lazy-initialize so dotenv has loaded before Resend is constructed
let _resend;
function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!_resend && key && Resend) {
    _resend = new Resend(key);
  }
  return _resend;
}

const FROM_EMAIL = () => process.env.RESEND_FROM_EMAIL || 'Lavion Gems & Jewellers <onboarding@resend.dev>';
const ADMIN_EMAIL = () => process.env.ADMIN_EMAIL || 'laviongems.jewellers@gmail.com';

async function sendEmailMessage({ to, subject, html }) {
  const resend = getResend();
  if (!resend) {
    console.error('[Email] Resend SDK client missing or failed to initialize.');
    return false;
  }

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL(),
      to,
      subject,
      html
    });

    if (data.error) {
      const msg = data.error.message || JSON.stringify(data.error);
      console.error('[Email] Resend API response error:', msg);

      // Automatic Redirect Fallback for testing mode (onboarding@resend.dev)
      if (to !== ADMIN_EMAIL()) {
        console.warn(` 🔄 [Resend Redirect] Redirecting test email intended for ${to} to verified admin address (${ADMIN_EMAIL()})...`);
        const fallbackHtml = `
          <div style="background:#2a1b00;border:1px solid #c9a84c;padding:12px;margin-bottom:20px;color:#f0d080;font-family:sans-serif;font-size:12px;border-radius:6px;">
            ⚠️ <strong>Resend Test Mode Note:</strong> This email was intended for customer <code>${to}</code>. Because the <code>onboarding@resend.dev</code> sender only permits delivery to your verified account email, it was delivered to your admin inbox (<code>${ADMIN_EMAIL()}</code>).
          </div>
        ` + html;
        return sendEmailMessage({
          to: ADMIN_EMAIL(),
          subject: `[For: ${to}] ${subject}`,
          html: fallbackHtml
        });
      }
      return false;
    }

    console.log(`[Email] Sent via Resend to ${to} (Message ID: ${data.data?.id || data.id || 'ok'})`);
    return true;
  } catch (err) {
    console.error('[Email] Resend send failed:', err.message);
    return false;
  }
}


// ─── Welcome Email ────────────────────────────────────────────────────────────
async function sendWelcomeEmail({ name, email }) {
  const emailBody = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Georgia',serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1208,#0d0d0d);border:1px solid #c9a84c;border-radius:12px;overflow:hidden;max-width:600px;">
                <!-- Header -->
                <tr><td style="background:linear-gradient(135deg,#c9a84c,#f0d080,#c9a84c);padding:40px 40px 30px;text-align:center;">
                  <h1 style="margin:0;color:#0a0a0a;font-size:28px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">LAVION</h1>
                  <p style="margin:4px 0 0;color:#3a2a00;font-size:13px;letter-spacing:5px;text-transform:uppercase;">Gems &amp; Jewellers</p>
                </td></tr>
                <!-- Body -->
                <tr><td style="padding:40px;">
                  <h2 style="color:#c9a84c;font-size:22px;margin:0 0 16px;">Welcome, ${name}! ✨</h2>
                  <p style="color:#d4c5a9;font-size:15px;line-height:1.8;margin:0 0 20px;">
                    We're delighted to welcome you to the world of Lavion Gems &amp; Jewellers — where every piece tells a story of timeless elegance and artisan craftsmanship.
                  </p>
                  <p style="color:#d4c5a9;font-size:15px;line-height:1.8;margin:0 0 30px;">
                    Your account is now active. Explore our exclusive collections of diamonds, gemstones, and bespoke jewellery crafted with unparalleled precision.
                  </p>
                  <div style="text-align:center;margin:30px 0;">
                    <a href="https://laviongemsjewellers.com/collections.html" style="background:linear-gradient(135deg,#c9a84c,#f0d080);color:#0a0a0a;text-decoration:none;padding:14px 36px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:2px;text-transform:uppercase;display:inline-block;">Explore Collections</a>
                  </div>
                  <hr style="border:none;border-top:1px solid #2a2010;margin:30px 0;">
                  <p style="color:#888;font-size:12px;text-align:center;margin:0;">
                    Lavion Gems &amp; Jewellers · Pakistan's Premier Luxury Jeweller<br>
                    If you didn't create this account, please ignore this email.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `;

  await sendEmailMessage({
    to: email,
    subject: '✨ Welcome to Lavion Gems & Jewellers',
    html: emailBody
  });
}

// ─── Order Confirmation Email ─────────────────────────────────────────────────
async function sendOrderConfirmationEmail(order) {
  const itemsHtml = Array.isArray(order.items)
    ? order.items.map(item => `
        <tr>
          <td style="padding:10px 12px;color:#d4c5a9;font-size:14px;border-bottom:1px solid #2a2010;">${item.name || item}</td>
          <td style="padding:10px 12px;color:#d4c5a9;font-size:14px;border-bottom:1px solid #2a2010;text-align:center;">${item.qty || 1}</td>
          <td style="padding:10px 12px;color:#c9a84c;font-size:14px;border-bottom:1px solid #2a2010;text-align:right;">PKR ${(item.price || 0).toLocaleString()}</td>
        </tr>`).join('')
    : `<tr><td colspan="3" style="padding:10px 12px;color:#d4c5a9;">${order.items}</td></tr>`;

  const emailBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Georgia',serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1208,#0d0d0d);border:1px solid #c9a84c;border-radius:12px;overflow:hidden;max-width:600px;">
            <!-- Header -->
            <tr><td style="background:linear-gradient(135deg,#c9a84c,#f0d080,#c9a84c);padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;color:#0a0a0a;font-size:28px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">LAVION</h1>
              <p style="margin:4px 0 0;color:#3a2a00;font-size:13px;letter-spacing:5px;text-transform:uppercase;">Gems &amp; Jewellers</p>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:40px;">
              <h2 style="color:#c9a84c;font-size:20px;margin:0 0 8px;">Order Confirmed! 🎉</h2>
              <p style="color:#d4c5a9;font-size:14px;margin:0 0 24px;">Dear ${order.customer}, thank you for your order. Here's your summary:</p>
              <!-- Order Meta -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1208;border:1px solid #2a2010;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;width:45%;">Order ID</td>
                  <td style="padding:12px 16px;color:#c9a84c;font-size:14px;font-weight:700;">${order.id}</td>
                </tr>
                <tr style="background:#0d0d0d;">
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Date</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">${order.date}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Payment</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">${order.payment}</td>
                </tr>
                <tr style="background:#0d0d0d;">
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Delivery To</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">${order.address}, ${order.city}</td>
                </tr>
              </table>
              <!-- Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #2a2010;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <thead>
                  <tr style="background:#2a2010;">
                    <th style="padding:10px 12px;color:#c9a84c;font-size:12px;text-align:left;letter-spacing:1px;text-transform:uppercase;">Item</th>
                    <th style="padding:10px 12px;color:#c9a84c;font-size:12px;text-align:center;letter-spacing:1px;text-transform:uppercase;">Qty</th>
                    <th style="padding:10px 12px;color:#c9a84c;font-size:12px;text-align:right;letter-spacing:1px;text-transform:uppercase;">Price</th>
                  </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
                <tfoot>
                  <tr style="background:#2a2010;">
                    <td colspan="2" style="padding:12px 12px;color:#c9a84c;font-size:14px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Total</td>
                    <td style="padding:12px 12px;color:#f0d080;font-size:16px;font-weight:700;text-align:right;">PKR ${Number(order.total).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
              <p style="color:#d4c5a9;font-size:14px;line-height:1.7;margin:0 0 24px;">
                Our team will contact you shortly to confirm delivery details. You can track your order anytime using your Order ID above.
              </p>
              <div style="text-align:center;margin:24px 0;">
                <a href="https://laviongemsjewellers.com/cart.html" style="background:linear-gradient(135deg,#c9a84c,#f0d080);color:#0a0a0a;text-decoration:none;padding:12px 30px;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:2px;text-transform:uppercase;display:inline-block;">Track Order</a>
              </div>
              <hr style="border:none;border-top:1px solid #2a2010;margin:24px 0;">
              <p style="color:#666;font-size:12px;text-align:center;margin:0;">Lavion Gems &amp; Jewellers · Pakistan's Premier Luxury Jeweller</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    if (order.email) {
      await sendEmailMessage({
        to: order.email,
        subject: `Order Confirmed – ${order.id} | Lavion Gems & Jewellers`,
        html: emailBody
      });
      console.log(`[Email] Order confirmation sent to ${order.email}`);
    }

    // Notify admin
    await sendEmailMessage({
      to: ADMIN_EMAIL(),
      subject: `🛍️ New Order: ${order.id} – ${order.customer} (PKR ${Number(order.total).toLocaleString()})`,
      html: emailBody
    });
    console.log(`[Email] Admin notified of order ${order.id}`);
  } catch (err) {
    console.error('[Email] Failed to send order confirmation:', err.message);
  }
}

// ─── Custom Order Confirmation Email ─────────────────────────────────────────
async function sendCustomOrderEmail(order) {
  const emailBody = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Georgia',serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
        <tr><td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1208,#0d0d0d);border:1px solid #c9a84c;border-radius:12px;overflow:hidden;max-width:600px;">
            <!-- Header -->
            <tr><td style="background:linear-gradient(135deg,#c9a84c,#f0d080,#c9a84c);padding:40px 40px 30px;text-align:center;">
              <h1 style="margin:0;color:#0a0a0a;font-size:28px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">LAVION</h1>
              <p style="margin:4px 0 0;color:#3a2a00;font-size:13px;letter-spacing:5px;text-transform:uppercase;">Gems &amp; Jewellers</p>
            </td></tr>
            <!-- Body -->
            <tr><td style="padding:40px;">
              <h2 style="color:#c9a84c;font-size:20px;margin:0 0 8px;">Bespoke Request Received 💎</h2>
              <p style="color:#d4c5a9;font-size:14px;margin:0 0 24px;">
                Dear ${order.customerName}, we have received your bespoke jewellery request. Our master craftsmen will review your specifications and contact you within 24 hours with a personalised quotation.
              </p>
              <!-- Order Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1208;border:1px solid #2a2010;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;width:45%;">Reference ID</td>
                  <td style="padding:12px 16px;color:#c9a84c;font-size:14px;font-weight:700;">${order.id}</td>
                </tr>
                <tr style="background:#0d0d0d;">
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Item Type</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">${order.itemType}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Metal</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">${order.metal} (${order.goldPurity})</td>
                </tr>
                <tr style="background:#0d0d0d;">
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Gem Preference</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">${order.gemPreference}</td>
                </tr>
                <tr>
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Budget Range</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">${order.budgetRange}</td>
                </tr>
                ${order.customText ? `
                <tr style="background:#0d0d0d;">
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Engraving</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">"${order.customText}"</td>
                </tr>` : ''}
                ${order.notes ? `
                <tr>
                  <td style="padding:12px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;">Notes</td>
                  <td style="padding:12px 16px;color:#d4c5a9;font-size:14px;">${order.notes}</td>
                </tr>` : ''}
              </table>
              <p style="color:#d4c5a9;font-size:14px;line-height:1.7;margin:0 0 24px;">
                Save your Reference ID <strong style="color:#c9a84c;">${order.id}</strong> to track your bespoke order status at any time.
              </p>
              <hr style="border:none;border-top:1px solid #2a2010;margin:24px 0;">
              <p style="color:#666;font-size:12px;text-align:center;margin:0;">Lavion Gems &amp; Jewellers · Pakistan's Premier Luxury Jeweller</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `;

  try {
    // Notify admin
    await sendEmailMessage({
      to: ADMIN_EMAIL(),
      subject: `💎 New Bespoke Request: ${order.id} – ${order.customerName} (${order.itemType})`,
      html: emailBody
    });
    console.log(`[Email] Admin notified of custom order ${order.id}`);

    if (order.customerEmail) {
      await sendEmailMessage({
        to: order.customerEmail,
        subject: `Bespoke Request Received – ${order.id} | Lavion Gems & Jewellers`,
        html: emailBody
      });
      console.log(`[Email] Custom order confirmation sent to ${order.customerEmail}`);
    }
  } catch (err) {
    console.error('[Email] Failed to send custom order email:', err.message);
  }
}

module.exports = { sendWelcomeEmail, sendOrderConfirmationEmail, sendCustomOrderEmail, sendNewRegistrationAlert, sendLoginAlert, sendSubscriberAlert };

// ─── Shared admin email builder ───────────────────────────────────────────────
function buildAdminEmail({ icon, title, subtitle, rows }) {
  const rowsHtml = rows.map(([label, value], i) => `
    <tr${i % 2 ? ' style="background:#0d0d0d;"' : ''}>
      <td style="padding:11px 16px;color:#888;font-size:12px;letter-spacing:1px;text-transform:uppercase;width:40%;font-family:sans-serif;">${label}</td>
      <td style="padding:11px 16px;color:#d4c5a9;font-size:14px;font-family:sans-serif;">${value}</td>
    </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#0a0a0a;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1208,#0d0d0d);border:1px solid #c9a84c;border-radius:12px;overflow:hidden;max-width:560px;">
          <tr><td style="background:linear-gradient(135deg,#c9a84c,#f0d080,#c9a84c);padding:28px 32px;text-align:center;">
            <div style="font-size:30px;margin-bottom:4px;">${icon}</div>
            <h1 style="margin:0;color:#0a0a0a;font-size:20px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:sans-serif;">LAVION</h1>
            <p style="margin:2px 0 0;color:#3a2a00;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:sans-serif;">Gems &amp; Jewellers · Admin Alert</p>
          </td></tr>
          <tr><td style="padding:32px;">
            <h2 style="color:#c9a84c;font-size:18px;margin:0 0 6px;font-family:sans-serif;">${title}</h2>
            <p style="color:#888;font-size:13px;margin:0 0 20px;font-family:sans-serif;">${subtitle}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1208;border:1px solid #2a2010;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              ${rowsHtml}
            </table>
            <p style="color:#555;font-size:11px;text-align:center;margin:0;font-family:sans-serif;">
              ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

// ─── New Registration Alert ────────────────────────────────────────────────────
async function sendNewRegistrationAlert({ name, email, phone, city }) {
  try {
    await sendEmailMessage({
      to: ADMIN_EMAIL(),
      subject: `👤 New Registration: ${name} — Lavion Website`,
      html: buildAdminEmail({
        icon: '👤',
        title: 'New Customer Registered',
        subtitle: 'A new account has just been created on your website.',
        rows: [
          ['Name', name],
          ['Email', email],
          ['Phone', phone || '—'],
          ['City', city || '—'],
          ['Status', '<span style="color:#2ecc71;font-weight:600;">Active Account</span>']
        ]
      })
    });
    console.log(`[Email] New registration alert sent for ${email}`);
  } catch (err) {
    console.error('[Email] Failed to send registration alert:', err.message);
  }
}

// ─── Login Alert ─────────────────────────────────────────────────────────────
async function sendLoginAlert({ name, email, phone }) {
  try {
    await sendEmailMessage({
      to: ADMIN_EMAIL(),
      subject: `🔐 Customer Login: ${name} — Lavion Website`,
      html: buildAdminEmail({
        icon: '🔐',
        title: 'Customer Logged In',
        subtitle: 'A registered customer just signed in to your website.',
        rows: [
          ['Name', name],
          ['Email', email],
          ['Phone', phone || '—'],
          ['Time', new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi' })]
        ]
      })
    });
    console.log(`[Email] Login alert sent for ${email}`);
  } catch (err) {
    console.error('[Email] Failed to send login alert:', err.message);
  }
}

// ─── Newsletter Subscriber Alert ──────────────────────────────────────────────
async function sendSubscriberAlert({ email }) {
  try {
    await sendEmailMessage({
      to: ADMIN_EMAIL(),
      subject: `📧 New Subscriber: ${email} — Lavion Website`,
      html: buildAdminEmail({
        icon: '📧',
        title: 'New Newsletter Subscriber',
        subtitle: 'Someone just subscribed to your newsletter on the website.',
        rows: [
          ['Email', email],
          ['Source', 'Homepage Newsletter Form'],
          ['Status', '<span style="color:#2ecc71;font-weight:600;">Subscribed ✓</span>']
        ]
      })
    });
    console.log(`[Email] Subscriber alert sent for ${email}`);
  } catch (err) {
    console.error('[Email] Failed to send subscriber alert:', err.message);
  }
}

