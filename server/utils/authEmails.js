const { sendEmailMessage } = require('./email');
const { baseUrl } = require('./oauth');

/** Escape anything that came from a user before it lands in an HTML email. */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function shell(title, intro, ctaLabel, ctaUrl, footnote) {
  return `
  <div style="margin:0;padding:32px 16px;background:#0b0a09;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fbf8f3;border:1px solid #e4dccf;">
      <div style="background:#0b0a09;padding:26px 32px;border-bottom:2px solid #c9a961;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:4px;
                    text-transform:uppercase;color:#ffffff;">
          Lavion <span style="color:#dcc188;">Gems</span> &amp; Jewellers
        </div>
      </div>
      <div style="padding:34px 32px;">
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px;color:#23201c;">
          ${esc(title)}
        </h1>
        <p style="margin:0 0 26px;font-size:14px;line-height:1.7;color:#6e675c;">${intro}</p>
        <a href="${ctaUrl}" style="display:inline-block;background:#c9a961;color:#14110c;
           text-decoration:none;padding:14px 32px;font-size:11px;font-weight:700;
           letter-spacing:2px;text-transform:uppercase;">${esc(ctaLabel)}</a>
        <p style="margin:26px 0 0;font-size:12px;line-height:1.7;color:#9c9285;">
          If the button does not work, paste this link into your browser:<br />
          <span style="color:#8c6b33;word-break:break-all;">${ctaUrl}</span>
        </p>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.7;color:#9c9285;">${footnote}</p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #e4dccf;font-size:11px;color:#9c9285;">
        Sent by Lavion Gems &amp; Jewellers. Please do not reply to this message.
      </div>
    </div>
  </div>`;
}

/**
 * Send, and if delivery is not configured, print the link to the server log.
 *
 * Without this a developer with no RESEND_API_KEY cannot complete signup or
 * recovery at all, because the token only ever existed inside the email.
 * Deliberately restricted to non-production so live links are never logged.
 */
async function deliver({ to, subject, html, url, label }) {
  // Everything routed through here carries a single-use link — a verification
  // token or a password reset. Those are credentials, so a failed send must
  // fail rather than quietly land in the admin inbox, where it would both
  // strand the customer and put a key to their account in another mailbox.
  const ok = await sendEmailMessage({ to, subject, html, redirectOnFailure: false });
  if (!ok && process.env.NODE_ENV !== 'production') {
    console.log('\n────────────────────────────────────────────────────────');
    console.log(` [dev] Email delivery is off. ${label} for ${to}:`);
    console.log(` ${url}`);
    console.log('────────────────────────────────────────────────────────\n');
  }
  return ok;
}

async function sendVerificationEmail({ name, email, token }) {
  const url = `${baseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  return deliver({
    to: email,
    subject: 'Confirm your email — Lavion Gems & Jewellers',
    html: shell(
      `Welcome, ${esc(name)}`,
      'Please confirm this address to activate your account and secure your order history.',
      'Confirm Email',
      url,
      'This link expires in 24 hours. If you did not create an account, you can ignore this email.'
    ),
    url,
    label: 'Verification link'
  });
}

async function sendPasswordResetEmail({ name, email, token }) {
  const url = `${baseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return deliver({
    to: email,
    subject: 'Reset your password — Lavion Gems & Jewellers',
    html: shell(
      'Reset your password',
      `Hello ${esc(name)}, we received a request to reset the password for your account.`,
      'Choose a New Password',
      url,
      'This link expires in 30 minutes and can be used once. If you did not request this, no action is needed — your password has not changed.'
    ),
    url,
    label: 'Password reset link'
  });
}

/**
 * Sent when someone requests a reset for an address that has no password —
 * typically a provider-only account. Without this, the generic "check your
 * inbox" response would leave that user waiting for a mail that never arrives.
 */
async function sendProviderOnlyNotice({ email, providers }) {
  const list = providers.map(p => p[0].toUpperCase() + p.slice(1)).join(' or ');
  return sendEmailMessage({
    to: email,
    subject: 'Sign-in help — Lavion Gems & Jewellers',
    html: shell(
      'Use your connected account',
      `This address signs in with <strong>${esc(list)}</strong>, so there is no password to reset. Continue with that provider, and you can add a password later from your account page.`,
      'Go to Sign In',
      `${baseUrl()}/?signin=1`,
      'If you did not request this, you can safely ignore this email.'
    )
  });
}

async function sendPasswordChangedEmail({ name, email }) {
  return sendEmailMessage({
    to: email,
    subject: 'Your password was changed — Lavion Gems & Jewellers',
    html: shell(
      'Password changed',
      `Hello ${esc(name)}, the password on your account was just changed and all other sessions were signed out.`,
      'Review Your Account',
      `${baseUrl()}/?signin=1`,
      'If this was not you, reset your password immediately and contact us.'
    )
  });
}

/**
 * The same stationery, but built around a code instead of a button.
 *
 * A confirmation code has to survive being read on a phone and typed into a
 * laptop, so it is set large, spaced and selectable rather than hidden behind
 * a link. There is deliberately no clickable action in this email: a code that
 * is only ever typed into a page the customer already had open cannot be
 * harvested by a phishing link pretending to be us.
 */
function codeShell(title, intro, code, footnote) {
  return `
  <div style="margin:0;padding:32px 16px;background:#0b0a09;font-family:'Helvetica Neue',Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fbf8f3;border:1px solid #e4dccf;">
      <div style="background:#0b0a09;padding:26px 32px;border-bottom:2px solid #c9a961;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:4px;
                    text-transform:uppercase;color:#ffffff;">
          Lavion <span style="color:#dcc188;">Gems</span> &amp; Jewellers
        </div>
      </div>
      <div style="padding:34px 32px;">
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:400;font-size:26px;color:#23201c;">
          ${esc(title)}
        </h1>
        <p style="margin:0 0 26px;font-size:14px;line-height:1.7;color:#6e675c;">${intro}</p>
        <div style="background:#0b0a09;border:1px solid #c9a961;padding:22px 16px;text-align:center;">
          <div style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;
                      letter-spacing:12px;color:#dcc188;text-indent:12px;">${esc(code)}</div>
        </div>
        <p style="margin:26px 0 0;font-size:12px;line-height:1.7;color:#9c9285;">${footnote}</p>
      </div>
      <div style="padding:16px 32px;border-top:1px solid #e4dccf;font-size:11px;color:#9c9285;">
        Sent by Lavion Gems &amp; Jewellers. Please do not reply to this message.
      </div>
    </div>
  </div>`;
}

/**
 * The sign-up confirmation code.
 *
 * Returns whether it was actually delivered, because the caller decides what
 * to do about a failure — stranding someone behind a code that never arrives
 * is worse than letting them in.
 */
async function sendOtpEmail({ name, email, code }) {
  const ok = await sendEmailMessage({
    to: email,
    subject: `${code} is your Lavion confirmation code`,
    // Never reroute a code to the admin inbox: that would report success while
    // the customer waits for a code sitting in someone else's mailbox. A
    // failure here has to be reported honestly so the caller can let them in.
    redirectOnFailure: false,
    html: codeShell(
      `Welcome, ${esc(name)}`,
      'Enter this code on the page you were just on to confirm your address and finish creating your account.',
      code,
      'This code expires in 10 minutes and can be used once. If you did not try to create an account, ignore this email — nothing has been activated.'
    )
  });
  if (!ok && process.env.NODE_ENV !== 'production') {
    console.log('\n────────────────────────────────────────────────────────');
    console.log(` [dev] Email delivery is off. Confirmation code for ${email}:`);
    console.log(`   ${code}`);
    console.log('────────────────────────────────────────────────────────\n');
  }
  return ok;
}

/**
 * Sent to the real owner when someone submits the sign-up form with an address
 * that already has an account.
 *
 * The form itself cannot say "that email is taken" without becoming a way to
 * test who shops here, so it says nothing and this says everything — to the
 * one person entitled to know.
 */
async function sendExistingAccountNotice({ name, email, providers, hasPassword }) {
  const how = providers && providers.length
    ? `with ${esc(providers.map(p => p[0].toUpperCase() + p.slice(1)).join(' or '))}${hasPassword ? ' or your password' : ''}`
    : 'with your password';
  return sendEmailMessage({
    to: email,
    subject: 'Someone tried to sign up with your email — Lavion Gems & Jewellers',
    html: shell(
      'You already have an account',
      `Hello ${esc(name)}, someone just filled in the sign-up form using this address. You already have a Lavion account, so no new one was created and nothing has changed. Sign in ${how}.`,
      'Go to Sign In',
      `${baseUrl()}/?signin=1`,
      'If that was you, simply sign in instead. If it was not, no action is needed — whoever submitted the form was not shown anything about your account and cannot reach it.'
    )
  });
}

module.exports = {
  sendVerificationEmail,
  sendOtpEmail,
  sendExistingAccountNotice,
  sendPasswordResetEmail,
  sendProviderOnlyNotice,
  sendPasswordChangedEmail
};
