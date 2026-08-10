const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { verifyIdToken } = require('./jwks');

/**
 * Federated sign-in for Google, Apple and Facebook.
 *
 * All three use the authorization-code flow driven from the server, so no
 * client secret ever reaches the browser. Google and Facebook additionally use
 * PKCE; Apple does not support it for the web flow and authenticates the token
 * request with a signed ES256 client secret instead.
 */

function baseUrl() {
  // Must exactly match the redirect URIs registered with each provider.
  return (process.env.PUBLIC_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
}

const PROVIDERS = {
  google: {
    id: 'google',
    label: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    scope: 'openid email profile',
    pkce: true,
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET
  },
  apple: {
    id: 'apple',
    label: 'Apple',
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    jwksUri: 'https://appleid.apple.com/auth/keys',
    issuer: 'https://appleid.apple.com',
    scope: 'name email',
    pkce: false,
    // Apple returns name/email in a POSTed form body, so the callback must
    // accept form_post rather than a query-string redirect.
    responseMode: 'form_post',
    clientId: () => process.env.APPLE_SERVICES_ID,
    clientSecret: () => appleClientSecret()
  },
  facebook: {
    id: 'facebook',
    label: 'Facebook',
    authUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    scope: 'email public_profile',
    pkce: true,
    clientId: () => process.env.FACEBOOK_APP_ID,
    clientSecret: () => process.env.FACEBOOK_APP_SECRET
  }
};

function isConfigured(name) {
  const p = PROVIDERS[name];
  if (!p) return false;
  if (name === 'apple') {
    return !!(process.env.APPLE_SERVICES_ID && process.env.APPLE_TEAM_ID &&
      process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
  }
  return !!(p.clientId() && p.clientSecret());
}

function configuredProviders() {
  return Object.keys(PROVIDERS).filter(isConfigured);
}

function redirectUri(name) {
  return `${baseUrl()}/api/auth/${name}/callback`;
}

/**
 * Apple's "client secret" is a short-lived ES256 JWT signed with the .p8 key
 * downloaded from the developer portal, not a static string.
 */
function appleClientSecret() {
  const key = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!key) throw new Error('APPLE_PRIVATE_KEY is not set.');
  return jwt.sign({}, key, {
    algorithm: 'ES256',
    keyid: process.env.APPLE_KEY_ID,
    issuer: process.env.APPLE_TEAM_ID,
    audience: 'https://appleid.apple.com',
    subject: process.env.APPLE_SERVICES_ID,
    expiresIn: '10m'
  });
}

function pkcePair() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

/** Build the provider consent URL plus the state we must remember. */
function buildAuthRequest(name, returnTo) {
  const p = PROVIDERS[name];
  const state = crypto.randomBytes(16).toString('base64url');
  const nonce = crypto.randomBytes(16).toString('base64url');
  const { verifier, challenge } = p.pkce ? pkcePair() : { verifier: '', challenge: '' };

  const params = new URLSearchParams({
    client_id: p.clientId(),
    redirect_uri: redirectUri(name),
    response_type: 'code',
    scope: p.scope,
    state
  });

  if (name !== 'facebook') params.set('nonce', nonce);
  if (p.responseMode) params.set('response_mode', p.responseMode);
  if (p.pkce) {
    params.set('code_challenge', challenge);
    params.set('code_challenge_method', 'S256');
  }
  if (name === 'google') {
    // Always show the chooser rather than silently reusing a stale session.
    params.set('prompt', 'select_account');
  }

  return {
    url: `${p.authUrl}?${params.toString()}`,
    stateData: { provider: name, state, nonce, verifier, returnTo: returnTo || '/' }
  };
}

async function exchangeCode(name, code, verifier) {
  const p = PROVIDERS[name];
  const body = new URLSearchParams({
    client_id: p.clientId(),
    client_secret: p.clientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(name)
  });
  if (p.pkce && verifier) body.set('code_verifier', verifier);

  const res = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error_description || json.error || `Token exchange failed (${res.status}).`);
  }
  return json;
}

/**
 * Turn a provider response into a normalised profile.
 * Returns { sub, email, emailVerified, name }.
 */
async function fetchProfile(name, tokens, nonce, applePostedUser) {
  const p = PROVIDERS[name];

  if (name === 'facebook') {
    // Facebook issues no ID token; read the profile from the Graph API.
    const url = new URL('https://graph.facebook.com/v19.0/me');
    url.searchParams.set('fields', 'id,name,email');
    url.searchParams.set('access_token', tokens.access_token);
    const res = await fetch(url);
    const me = await res.json();
    if (!res.ok || !me.id) throw new Error(me.error?.message || 'Facebook profile fetch failed.');
    return {
      sub: me.id,
      email: (me.email || '').toLowerCase(),
      // Facebook only returns an email once it has verified it.
      emailVerified: !!me.email,
      name: me.name || 'Facebook User'
    };
  }

  if (!tokens.id_token) throw new Error(`${p.label} did not return an ID token.`);

  const claims = await verifyIdToken({
    token: tokens.id_token,
    jwksUri: p.jwksUri,
    issuer: p.issuer,
    audience: p.clientId(),
    nonce,
    algorithms: ['RS256']
  });

  if (name === 'apple') {
    // Apple sends the display name exactly once, in the first callback body.
    let display = '';
    if (applePostedUser) {
      try {
        const u = JSON.parse(applePostedUser);
        display = [u?.name?.firstName, u?.name?.lastName].filter(Boolean).join(' ');
      } catch { /* name is optional; ignore malformed payloads */ }
    }
    return {
      sub: claims.sub,
      email: (claims.email || '').toLowerCase(),
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      name: display || (claims.email ? claims.email.split('@')[0] : 'Apple User')
    };
  }

  return {
    sub: claims.sub,
    email: (claims.email || '').toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
    name: claims.name || claims.given_name || (claims.email ? claims.email.split('@')[0] : 'Google User')
  };
}

module.exports = {
  PROVIDERS,
  baseUrl,
  isConfigured,
  configuredProviders,
  redirectUri,
  buildAuthRequest,
  exchangeCode,
  fetchProfile
};
