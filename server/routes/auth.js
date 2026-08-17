const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Customer = require('../models/Customer');
const RefreshToken = require('../models/RefreshToken');
const { isMongoConnected } = require('../config/db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const {
  signAccessToken, issueRefreshToken, rotateRefreshToken, revokeAllForUser,
  setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE,
  randomToken, hashToken, randomOtp, hashOtp, clientIp, ACCESS_TTL
} = require('../utils/tokens');
const { limiter, hit, reset: resetLimit, lockoutFor } = require('../utils/rateLimit');
const oauth = require('../utils/oauth');
const {
  sendVerificationEmail, sendOtpEmail, sendExistingAccountNotice,
  sendPasswordResetEmail, sendProviderOnlyNotice, sendPasswordChangedEmail
} = require('../utils/authEmails');
const { sendWelcomeEmail, sendNewRegistrationAlert, sendLoginAlert } = require('../utils/email');

const BCRYPT_ROUNDS = 12;
const OAUTH_STATE_COOKIE = 'lav_oauth';

/**
 * Email confirmation for accounts that sign up with a password.
 *
 * Ten minutes is long enough to fetch a phone and short enough that a code
 * read over someone's shoulder is worthless by the time it is used. Five
 * guesses out of a million leaves an attacker a 1-in-200,000 chance per code,
 * and the code is discarded — not merely rate-limited — once they are spent.
 *
 * Federated sign-ins never come through here: Google has already proved the
 * address, and asking again would cost sign-ups for no gain.
 */
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * Put a fresh code on an account and mail it.
 *
 * Every path that issues one goes through here — signing up, signing in to an
 * unconfirmed account, asking for another — so no combination of them can be
 * used to flood someone's inbox. Returns what actually happened rather than a
 * bare boolean, because the caller's response differs for each: 'sent',
 * 'cooldown' (asked again too soon), or 'undeliverable' (our mail is broken).
 */
async function issueOtp(user, { respectCooldown = true } = {}) {
  if (respectCooldown && user.otpSentAt &&
      Date.now() - user.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return 'cooldown';
  }

  const code = randomOtp();
  user.otpHash = hashOtp(code);
  user.otpExpires = new Date(Date.now() + OTP_TTL_MS);
  user.otpSentAt = new Date();
  // A new code earns a fresh allowance; the old one is gone either way.
  user.otpAttempts = 0;
  await user.save();

  const delivered = await sendOtpEmail({ name: user.name, email: user.email, code });
  return delivered ? 'sent' : 'undeliverable';
}

/**
 * Discard the outstanding code — spent, exhausted, or made moot.
 *
 * `otpSentAt` deliberately survives. It records when we last put a message in
 * someone's inbox, which is not the same question as whether the code in it is
 * still good, and the cooldown is read from it. Clearing it here would have
 * meant that burning through the five guesses reset the cooldown, turning a
 * wrong-code loop into a way to send mail faster than the limit allows.
 */
function clearOtp(user) {
  user.otpHash = null;
  user.otpExpires = null;
  user.otpAttempts = 0;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Accounts live in Mongo. Fail loudly rather than silently not persisting. */
function requireDb(req, res, next) {
  if (!isMongoConnected()) {
    return res.status(503).json({
      success: false,
      message: 'Account service is temporarily unavailable.',
      code: 'DB_UNAVAILABLE'
    });
  }
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) {
    return 'Password must be at least 10 characters.';
  }
  if (pw.length > 200) return 'Password is too long.';
  // Reject the handful of values that dominate credential-stuffing lists.
  const banned = ['password', '1234567890', 'lavion123', 'qwertyuiop', 'iloveyou'];
  if (banned.includes(pw.toLowerCase())) return 'Please choose a less common password.';
  return null;
}

function newUserId() {
  return `USR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function issueSession(user, req, res, family = null) {
  const refresh = await issueRefreshToken(user, req, family);
  setRefreshCookie(res, refresh);
  return {
    accessToken: signAccessToken(user),
    expiresIn: ACCESS_TTL,
    user: user.toPublic()
  };
}

/* ------------------------------------------------------------------ *
 * Registration
 * ------------------------------------------------------------------ */

router.post('/register', requireDb, limiter('register', 10, 60 * 60 * 1000), async (req, res) => {
  try {
    const { name, email, phone, city, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }
    if (!EMAIL_RE.test(String(email))) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ success: false, message: pwError });

    const normalised = String(email).toLowerCase().trim();
    const existing = await Customer.findOne({ email: normalised });

    /**
     * A taken address gets the same reply a fresh one does.
     *
     * Answering "that email is already registered" turns this endpoint into a
     * membership oracle — anyone could walk a list of addresses and learn who
     * shops here. The non-committal reply is only honest because the person
     * entitled to know is told directly: the owner gets a notice explaining
     * what happened, while whoever filled in the form gets a code screen they
     * have no way to satisfy.
     */
    if (existing) {
      sendExistingAccountNotice({
        name: existing.name,
        email: existing.email,
        providers: existing.identities.map(i => i.provider),
        hasPassword: !!existing.passwordHash
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        code: 'VERIFY_REQUIRED',
        needsVerification: true,
        email: normalised,
        message: 'Check your inbox for a six-digit confirmation code.'
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await Customer.create({
      id: newUserId(),
      name: String(name).trim().slice(0, 120),
      email: normalised,
      phone: (phone || '').trim(),
      city: (city || 'Pakistan').trim(),
      passwordHash,
      // Unproven until a code sent to that inbox comes back. This is the whole
      // point of the flow: an address nobody can receive mail at cannot open
      // an account, which is what stops signups being scripted in bulk.
      emailVerified: false,
      lastLoginAt: null
    });

    const outcome = await issueOtp(user);

    /**
     * If the code cannot be delivered, let them in rather than stranding them.
     *
     * A failed send is always a fault on our side — an unverified sending
     * domain, a dead API key, Resend having a bad day. It is never something
     * the person signing up chose, and never something an automated signup can
     * bring about, so nothing is conceded to the bots this gate exists to
     * stop. Locking real customers out of the shop because our mail provider
     * is unhappy would cost far more than it protects.
     */
    if (outcome === 'undeliverable') {
      console.error(
        `[auth] Confirmation code undeliverable for ${user.email} — opening the ` +
        'account without it. Check the Resend sending domain.'
      );
      user.emailVerified = true;
      user.lastLoginAt = new Date();
      clearOtp(user);
      await user.save();

      sendWelcomeEmail({ name: user.name, email: user.email });
      sendNewRegistrationAlert({ name: user.name, email: user.email, phone: user.phone, city: user.city });

      const session = await issueSession(user, req, res);
      return res.status(201).json({
        success: true,
        message: `Welcome to Lavion, ${user.name}.`,
        ...session
      });
    }

    // No session yet — the account is not usable until the code comes back.
    sendNewRegistrationAlert({ name: user.name, email: user.email, phone: user.phone, city: user.city });
    res.status(201).json({
      success: true,
      code: 'VERIFY_REQUIRED',
      needsVerification: true,
      email: user.email,
      message: 'Check your inbox for a six-digit confirmation code.'
    });
  } catch (error) {
    console.error('register error:', error);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

/* ------------------------------------------------------------------ *
 * Email confirmation — six-digit code
 * ------------------------------------------------------------------ */

router.post('/verify-otp', requireDb, limiter('otp', 30, 60 * 60 * 1000), async (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }

    const user = await Customer.findOne({ email: String(email).toLowerCase().trim() });

    /**
     * One reply for "no such account", "already confirmed" and "no code
     * outstanding". Telling them apart would let this endpoint answer the
     * question /register refuses to.
     */
    if (!user || user.emailVerified || !user.otpHash) {
      return res.status(400).json({
        success: false,
        code: 'OTP_INVALID',
        message: 'That code is not right, or it has already been used.'
      });
    }

    if (!user.otpExpires || user.otpExpires <= new Date()) {
      return res.status(400).json({
        success: false,
        code: 'OTP_EXPIRED',
        message: 'That code has expired. Send yourself a new one.'
      });
    }

    if ((user.otpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        code: 'OTP_LOCKED',
        message: 'Too many incorrect attempts. Request a new code.'
      });
    }

    // Compare digests, not codes, and in constant time — a comparison that
    // returns early leaks how much of the guess was right.
    const supplied = Buffer.from(hashOtp(String(code).replace(/\D/g, '')));
    const stored = Buffer.from(user.otpHash);
    const match = supplied.length === stored.length && crypto.timingSafeEqual(supplied, stored);

    if (!match) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      const remaining = OTP_MAX_ATTEMPTS - user.otpAttempts;
      // Spent codes are thrown away rather than left sitting behind a counter.
      if (remaining <= 0) clearOtp(user);
      await user.save();

      return res.status(400).json({
        success: false,
        code: remaining > 0 ? 'OTP_INVALID' : 'OTP_LOCKED',
        message: remaining > 0
          ? `That code is not right. ${remaining} attempt${remaining === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Request a new code.'
      });
    }

    user.emailVerified = true;
    user.lastLoginAt = new Date();
    clearOtp(user);
    await user.save();

    sendWelcomeEmail({ name: user.name, email: user.email });

    const session = await issueSession(user, req, res);
    res.json({ success: true, message: `Welcome to Lavion, ${user.name}.`, ...session });
  } catch (error) {
    console.error('verify-otp error:', error);
    res.status(500).json({ success: false, message: 'Confirmation failed. Please try again.' });
  }
});

router.post('/resend-otp', requireDb, limiter('resendOtp', 8, 60 * 60 * 1000), async (req, res) => {
  // Same reply whether or not the address is waiting on a code.
  const generic = {
    success: true,
    message: 'If that address still needs confirming, a new code is on its way.'
  };
  try {
    const email = String((req.body || {}).email || '').toLowerCase().trim();
    if (!email) return res.json(generic);

    const user = await Customer.findOne({ email });
    if (!user || user.emailVerified) return res.json(generic);

    const outcome = await issueOtp(user);

    // The cooldown is the one thing worth saying out loud: the button's timer
    // is a courtesy, and someone who works around it deserves a real answer
    // rather than a lie that a code is coming.
    if (outcome === 'cooldown') {
      const waited = Date.now() - user.otpSentAt.getTime();
      const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - waited) / 1000);
      return res.status(429).json({
        success: false,
        code: 'OTP_COOLDOWN',
        retryAfter: wait,
        message: `Please wait ${wait} second${wait === 1 ? '' : 's'} before asking for another code.`
      });
    }

    res.json(generic);
  } catch (error) {
    console.error('resend-otp error:', error);
    res.json(generic);
  }
});

/* ------------------------------------------------------------------ *
 * Email verification by link — legacy
 *
 * Sign-up now confirms with a six-digit code, so nothing issues these tokens
 * any more. The pair is kept working because links sent before the change are
 * still sitting in inboxes, and a customer clicking one should be confirmed
 * rather than shown an error about a flow they never chose.
 * ------------------------------------------------------------------ */

router.post('/verify-email', requireDb, limiter('verify', 20, 60 * 60 * 1000), async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required.' });

    const user = await Customer.findOne({
      verifyTokenHash: hashToken(token),
      verifyTokenExpires: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'This link is invalid or has expired.' });
    }

    user.emailVerified = true;
    user.verifyTokenHash = null;
    user.verifyTokenExpires = null;
    // The address is settled, so any code still outstanding is moot.
    clearOtp(user);
    await user.save();

    sendWelcomeEmail({ name: user.name, email: user.email });

    const session = await issueSession(user, req, res);
    res.json({ success: true, message: 'Email confirmed. You are now signed in.', ...session });
  } catch (error) {
    console.error('verify-email error:', error);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

router.post('/resend-verification', requireDb, limiter('resend', 5, 60 * 60 * 1000), async (req, res) => {
  const { email } = req.body || {};
  const generic = { success: true, message: 'If that address needs confirming, a new link is on its way.' };
  try {
    if (!email) return res.json(generic);
    const user = await Customer.findOne({ email: String(email).toLowerCase().trim() });
    if (user && !user.emailVerified) {
      const token = randomToken();
      user.verifyTokenHash = hashToken(token);
      user.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      sendVerificationEmail({ name: user.name, email: user.email, token }).catch(() => {});
    }
    res.json(generic);
  } catch (error) {
    console.error('resend-verification error:', error);
    res.json(generic);
  }
});

/* ------------------------------------------------------------------ *
 * Password login
 * ------------------------------------------------------------------ */

router.post('/login', requireDb, limiter('login', 20, 15 * 60 * 1000), async (req, res) => {
  const invalid = { success: false, message: 'Email or password is incorrect.' };
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json(invalid);

    const normalised = String(email).toLowerCase().trim();

    // Per-account limit as well as per-IP, so a botnet cannot spread an attack
    // on one account across many addresses.
    const acct = await hit(`login:acct:${normalised}`, 10, 15 * 60 * 1000);
    if (!acct.allowed) {
      res.set('Retry-After', String(acct.retryAfter));
      return res.status(429).json({
        success: false,
        message: `Too many attempts on this account. Try again in ${acct.retryAfter}s.`
      });
    }

    const user = await Customer.findOne({ email: normalised });

    // Spend comparable time whether or not the account exists, so response
    // timing does not reveal which addresses are registered.
    if (!user || !user.passwordHash) {
      await bcrypt.compare(String(password), '$2a$12$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQ');
      if (user && !user.passwordHash) {
        return res.status(400).json({
          success: false,
          message: 'This account uses social sign-in. Continue with your connected provider.',
          code: 'PROVIDER_ONLY',
          providers: user.identities.map(i => i.provider)
        });
      }
      return res.status(401).json(invalid);
    }

    if (user.isLocked()) {
      const secs = Math.ceil((user.lockedUntil - Date.now()) / 1000);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${secs}s or reset your password.`,
        code: 'LOCKED'
      });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) {
      user.failedAttempts = (user.failedAttempts || 0) + 1;
      user.lockedUntil = lockoutFor(user.failedAttempts);
      await user.save();
      return res.status(401).json(invalid);
    }

    /**
     * An unconfirmed address cannot sign in.
     *
     * This sits after the password check on purpose. Sending a fresh code to
     * anyone who merely types an email address would hand out a way to mail
     * someone repeatedly without knowing anything about them; reaching this
     * line means the password was right, so the request came from the account
     * holder. The code is reissued rather than waited for, because whatever
     * was sent at sign-up has almost certainly expired and making them hunt
     * for a resend button first is a step that serves nobody.
     */
    if (!user.emailVerified) {
      const outcome = await issueOtp(user);

      // Same safety valve as sign-up: if we cannot deliver the code, the
      // person holding the right password is not left permanently outside an
      // account they own because our mail provider is misconfigured.
      if (outcome !== 'undeliverable') {
        return res.status(403).json({
          success: false,
          code: 'EMAIL_UNVERIFIED',
          email: user.email,
          message: outcome === 'sent'
            ? 'Please confirm your email address — we have just sent you a new six-digit code.'
            : 'Please confirm your email address. Enter the code we already sent you, or request another shortly.'
        });
      }

      console.error(
        `[auth] Confirmation code undeliverable for ${user.email} — admitting a ` +
        'correct password rather than locking the account. Check the Resend sending domain.'
      );
      user.emailVerified = true;
      clearOtp(user);
    }

    user.failedAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();
    await resetLimit(`login:acct:${normalised}`);

    sendLoginAlert({ name: user.name, email: user.email, phone: user.phone });

    const session = await issueSession(user, req, res);
    res.json({ success: true, message: `Welcome back, ${user.name}.`, ...session });
  } catch (error) {
    console.error('login error:', error);
    res.status(500).json({ success: false, message: 'Sign in failed. Please try again.' });
  }
});

/* ------------------------------------------------------------------ *
 * Password recovery
 * ------------------------------------------------------------------ */

router.post('/forgot-password', requireDb, limiter('forgot', 5, 60 * 60 * 1000), async (req, res) => {
  // Always the same answer, so this endpoint cannot enumerate accounts.
  const generic = {
    success: true,
    message: 'If an account exists for that address, a reset link is on its way.'
  };
  try {
    const { email } = req.body || {};
    if (!email) return res.json(generic);

    const user = await Customer.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.json(generic);

    if (!user.passwordHash && user.identities.length) {
      sendProviderOnlyNotice({
        email: user.email,
        providers: user.identities.map(i => i.provider)
      }).catch(() => {});
      return res.json(generic);
    }

    const token = randomToken();
    user.resetTokenHash = hashToken(token);
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    sendPasswordResetEmail({ name: user.name, email: user.email, token }).catch(() => {});
    res.json(generic);
  } catch (error) {
    console.error('forgot-password error:', error);
    res.json(generic);
  }
});

router.post('/reset-password', requireDb, limiter('reset', 10, 60 * 60 * 1000), async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required.' });
    }
    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ success: false, message: pwError });

    const user = await Customer.findOne({
      resetTokenHash: hashToken(token),
      resetTokenExpires: { $gt: new Date() }
    });
    if (!user) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired.' });
    }

    user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.resetTokenHash = null;
    user.resetTokenExpires = null;
    user.failedAttempts = 0;
    user.lockedUntil = null;
    // Completing a reset proves control of the mailbox.
    user.emailVerified = true;
    // Invalidate every live access token and refresh token: a reset is exactly
    // the moment an attacker's existing session must die.
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllForUser(user.id);

    sendPasswordChangedEmail({ name: user.name, email: user.email }).catch(() => {});

    const session = await issueSession(user, req, res);
    res.json({ success: true, message: 'Password updated. You are signed in.', ...session });
  } catch (error) {
    console.error('reset-password error:', error);
    res.status(500).json({ success: false, message: 'Could not reset password.' });
  }
});

/** Change password while signed in. Requires the current one. */
router.post('/change-password', requireDb, authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ success: false, message: pwError });

    const user = await Customer.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });

    // Provider-only accounts are adding a password rather than changing one.
    if (user.passwordHash) {
      const ok = await bcrypt.compare(String(currentPassword || ''), user.passwordHash);
      if (!ok) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    await revokeAllForUser(user.id);

    sendPasswordChangedEmail({ name: user.name, email: user.email }).catch(() => {});

    const session = await issueSession(user, req, res);
    res.json({ success: true, message: 'Password updated. Other devices were signed out.', ...session });
  } catch (error) {
    console.error('change-password error:', error);
    res.status(500).json({ success: false, message: 'Could not update password.' });
  }
});

/* ------------------------------------------------------------------ *
 * Session lifecycle
 * ------------------------------------------------------------------ */

router.post('/refresh', requireDb, async (req, res) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];
    const result = await rotateRefreshToken(presented, req);

    if (!result.ok) {
      clearRefreshCookie(res);
      if (result.reason === 'reuse' && result.userId) {
        // Family already revoked inside rotate; drop live access tokens too.
        const victim = await Customer.findOne({ id: result.userId });
        if (victim) {
          victim.tokenVersion = (victim.tokenVersion || 0) + 1;
          await victim.save();
        }
        return res.status(401).json({
          success: false,
          message: 'Session security issue detected. Please sign in again.',
          code: 'TOKEN_REUSE'
        });
      }
      return res.status(401).json({ success: false, message: 'Session expired.', code: 'REFRESH_INVALID' });
    }

    const user = await Customer.findOne({ id: result.userId });
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }

    const session = await issueSession(user, req, res, result.family);
    res.json({ success: true, ...session });
  } catch (error) {
    console.error('refresh error:', error);
    res.status(500).json({ success: false, message: 'Could not refresh session.' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (presented) {
      await RefreshToken.updateOne(
        { tokenHash: hashToken(presented) },
        { $set: { revokedAt: new Date() } }
      );
    }
  } catch (e) {
    console.error('logout error:', e.message);
  }
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Signed out.' });
});

router.post('/logout-all', requireDb, authenticateToken, async (req, res) => {
  try {
    const user = await Customer.findOne({ id: req.user.id });
    if (user) {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
    }
    await revokeAllForUser(req.user.id);
    clearRefreshCookie(res);
    res.json({ success: true, message: 'Signed out on all devices.' });
  } catch (error) {
    console.error('logout-all error:', error);
    res.status(500).json({ success: false, message: 'Could not sign out everywhere.' });
  }
});

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

router.get('/me', requireDb, authenticateToken, async (req, res) => {
  const user = await Customer.findOne({ id: req.user.id });
  if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });

  // Reject tokens issued before the last password change / global sign-out.
  if ((req.user.tv || 0) !== (user.tokenVersion || 0)) {
    return res.status(401).json({ success: false, message: 'Session revoked.', code: 'TOKEN_STALE' });
  }
  res.json({ success: true, user: user.toPublic() });
});

router.patch('/me', requireDb, authenticateToken, async (req, res) => {
  try {
    const { name, phone, city } = req.body || {};
    const user = await Customer.findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });

    // Email is deliberately not editable here — changing it would need a
    // fresh verification round-trip on both addresses.
    if (typeof name === 'string' && name.trim()) user.name = name.trim().slice(0, 120);
    if (typeof phone === 'string') user.phone = phone.trim().slice(0, 40);
    if (typeof city === 'string') user.city = city.trim().slice(0, 80);
    await user.save();

    res.json({ success: true, message: 'Profile updated.', user: user.toPublic() });
  } catch (error) {
    console.error('patch me error:', error);
    res.status(500).json({ success: false, message: 'Could not update profile.' });
  }
});

router.get('/sessions', requireDb, authenticateToken, async (req, res) => {
  const rows = await RefreshToken.find({
    userId: req.user.id, revokedAt: null, expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 }).limit(25).lean();

  res.json({
    success: true,
    sessions: rows.map(r => ({
      id: r._id,
      createdAt: r.createdAt,
      lastUsedAt: r.usedAt,
      userAgent: r.userAgent,
      ip: r.ip
    }))
  });
});

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

/**
 * Credentials come from the environment as a bcrypt hash — never from source.
 * Generate one with:
 *   node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD',12))"
 */
router.post('/admin-login', limiter('admin', 10, 15 * 60 * 1000), async (req, res) => {
  const invalid = { success: false, message: 'Invalid admin credentials.' };
  try {
    const { username, password } = req.body || {};
    const expectedUser = process.env.ADMIN_USERNAME;
    const expectedHash = process.env.ADMIN_PASSWORD_HASH;

    if (!expectedUser || !expectedHash) {
      console.error('Admin login attempted but ADMIN_USERNAME / ADMIN_PASSWORD_HASH are not configured.');
      return res.status(503).json({
        success: false,
        message: 'Admin access is not configured on this server.',
        code: 'ADMIN_NOT_CONFIGURED'
      });
    }

    if (!username || !password) return res.status(401).json(invalid);

    // Compare the password even on a username miss to keep timing flat.
    const userOk = crypto.timingSafeEqual(
      crypto.createHash('sha256').update(String(username)).digest(),
      crypto.createHash('sha256').update(expectedUser).digest()
    );
    const passOk = await bcrypt.compare(String(password), expectedHash);

    if (!userOk || !passOk) {
      // Recording the strike must not decide the response. When this threw,
      // the outer catch turned a plain wrong password into a 500 "Admin sign
      // in failed.", which reads as a server outage rather than a bad guess.
      await hit(`admin:fail:${clientIp(req)}`, 5, 15 * 60 * 1000)
        .catch(e => console.error('admin lockout counter unavailable:', e.message));
      return res.status(401).json(invalid);
    }

    const token = jwt.sign(
      { id: 'ADMIN-001', name: 'Admin', username: expectedUser, role: 'admin', tv: 0 },
      JWT_SECRET,
      { expiresIn: '8h', issuer: 'lavion-auth' }
    );

    res.json({
      success: true,
      message: 'Admin authentication successful.',
      accessToken: token,
      token, // retained for the existing admin panel client
      user: { username: expectedUser, role: 'admin' }
    });
  } catch (error) {
    console.error('admin-login error:', error);
    res.status(500).json({ success: false, message: 'Admin sign in failed.' });
  }
});

/* ------------------------------------------------------------------ *
 * Federated sign-in
 * ------------------------------------------------------------------ */

router.get('/providers', (req, res) => {
  res.json({ success: true, providers: oauth.configuredProviders() });
});

/** Kick off the provider redirect. */
router.get('/:provider(google|apple|facebook)', limiter('oauth', 30, 15 * 60 * 1000), (req, res) => {
  const provider = req.params.provider;
  if (!oauth.isConfigured(provider)) {
    return res.status(503).send(renderOAuthError(`${provider} sign-in is not configured on this server.`));
  }

  try {
    const { url, stateData } = oauth.buildAuthRequest(provider, req.query.returnTo);

    // State, nonce and PKCE verifier ride in a signed, short-lived httpOnly
    // cookie. Serverless means there is no server-side session to hold them.
    const stateJwt = jwt.sign(stateData, JWT_SECRET, { expiresIn: '10m' });
    res.cookie(OAUTH_STATE_COOKIE, stateJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      // Apple posts the callback cross-site, so Lax would drop the cookie.
      sameSite: provider === 'apple' ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: 10 * 60 * 1000
    });

    res.redirect(url);
  } catch (e) {
    console.error(`${provider} auth start error:`, e);
    res.status(500).send(renderOAuthError('Could not start sign-in.'));
  }
});

/** Apple uses form_post; the others come back as a GET. */
router.get('/:provider(google|apple|facebook)/callback', handleOAuthCallback);
router.post('/:provider(google|apple|facebook)/callback', handleOAuthCallback);

async function handleOAuthCallback(req, res) {
  const provider = req.params.provider;
  const payload = { ...req.query, ...req.body };

  try {
    if (!isMongoConnected()) throw new Error('Account service unavailable.');
    if (payload.error) throw new Error(payload.error_description || payload.error);

    const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE];
    if (!stateCookie) throw new Error('Sign-in session expired. Please try again.');

    let stateData;
    try {
      stateData = jwt.verify(stateCookie, JWT_SECRET);
    } catch {
      throw new Error('Sign-in session expired. Please try again.');
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/api/auth' });

    if (stateData.provider !== provider) throw new Error('Provider mismatch.');
    // Constant-time compare so state cannot be probed byte by byte.
    const a = Buffer.from(String(payload.state || ''));
    const b = Buffer.from(String(stateData.state));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new Error('Invalid sign-in state.');
    }
    if (!payload.code) throw new Error('No authorization code returned.');

    const tokens = await oauth.exchangeCode(provider, payload.code, stateData.verifier);
    const profile = await oauth.fetchProfile(provider, tokens, stateData.nonce, payload.user);

    if (!profile.sub) throw new Error('Provider did not return an account id.');

    const user = await upsertFederatedUser(provider, profile);
    const refresh = await issueRefreshToken(user, req);
    setRefreshCookie(res, refresh);

    const returnTo = safeReturnTo(stateData.returnTo);
    res.send(renderOAuthSuccess(returnTo));
  } catch (e) {
    console.error(`${provider} callback error:`, e.message);
    res.status(400).send(renderOAuthError(e.message || 'Sign-in failed.'));
  }
}

/**
 * Find or create the account behind a provider identity.
 *
 * Linking rule: an unverified provider email never adopts an existing local
 * account. Otherwise anyone could register an unverified provider profile
 * carrying a victim's address and inherit their account.
 */
async function upsertFederatedUser(provider, profile) {
  const byIdentity = await Customer.findOne({
    identities: { $elemMatch: { provider, sub: profile.sub } }
  });
  if (byIdentity) {
    byIdentity.lastLoginAt = new Date();
    await byIdentity.save();
    return byIdentity;
  }

  if (profile.email && profile.emailVerified) {
    const byEmail = await Customer.findOne({ email: profile.email });
    if (byEmail) {
      byEmail.identities.push({ provider, sub: profile.sub, email: profile.email });
      // The provider vouched for this address, so the local account is now
      // verified too.
      byEmail.emailVerified = true;
      byEmail.lastLoginAt = new Date();
      await byEmail.save();
      return byEmail;
    }
  }

  // Apple private relay addresses still uniquely identify the user, so they
  // are safe to store; they simply cannot receive mail from unregistered
  // sending domains.
  const email = profile.email || `${provider}_${profile.sub}@no-email.local`;

  const created = await Customer.create({
    id: newUserId(),
    name: profile.name || 'Customer',
    email,
    emailVerified: !!profile.emailVerified,
    passwordHash: null,
    identities: [{ provider, sub: profile.sub, email: profile.email || '' }],
    lastLoginAt: new Date()
  });

  if (profile.email) {
    sendWelcomeEmail({ name: created.name, email: created.email });
    sendNewRegistrationAlert({
      name: created.name, email: created.email, phone: '', city: created.city
    });
  }
  return created;
}

/** Only ever bounce back to a same-origin path. */
function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * The popup closes itself and tells the opener to pick up its session. The
 * access token is not put in the URL — the opener calls /refresh, which reads
 * the httpOnly cookie we just set.
 */
function renderOAuthSuccess(returnTo) {
  return `<!doctype html><meta charset="utf-8"><title>Signed in</title>
<body style="background:#0b0a09;color:#efdcb2;font-family:system-ui,sans-serif;
             display:grid;place-items:center;height:100vh;margin:0">
<p>Signing you in…</p>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: 'lavion-auth', ok: true }, window.location.origin);
      window.close();
    } else {
      window.location.replace(${JSON.stringify(returnTo)});
    }
  } catch (e) {
    window.location.replace(${JSON.stringify(returnTo)});
  }
</script></body>`;
}

function renderOAuthError(message) {
  const safe = escapeHtml(message);
  return `<!doctype html><meta charset="utf-8"><title>Sign-in failed</title>
<body style="background:#0b0a09;color:#efdcb2;font-family:system-ui,sans-serif;
             display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:24px">
<div>
  <p style="color:#e74c3c;font-weight:600">Sign-in failed</p>
  <p style="opacity:.75;font-size:14px">${safe}</p>
  <p><a href="/" style="color:#c9a961">Return to the store</a></p>
</div>
<script>
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        { type: 'lavion-auth', ok: false, message: ${JSON.stringify(message)} },
        window.location.origin
      );
      setTimeout(function () { window.close(); }, 2500);
    }
  } catch (e) {}
</script></body>`;
}

module.exports = router;
