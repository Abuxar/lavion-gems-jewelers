# Authentication — setup and design

Accounts, sessions, rate limiting and recovery all run through the Express API
in `server/`. Everything persists in MongoDB; the JSON file DB is still used for
products and orders but **cannot** hold auth state on Vercel, where the
filesystem is ephemeral.

---

## 1. Required environment variables

Copy `.env.example` to `server/.env` for local work, and set the same keys in
the Vercel project settings for production.

The server **will not start in production** without `JWT_SECRET`, and every
auth route returns `503` if `MONGO_URI` is missing.

```bash
# Generate a signing secret
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Generate the admin password hash
node -e "console.log(require('bcryptjs').hashSync('YOUR_PASSWORD',12))"
```

| Variable | Needed for |
|---|---|
| `JWT_SECRET` | Signing access tokens. Min 32 chars. |
| `MONGO_URI` | All account storage. |
| `PUBLIC_BASE_URL` | OAuth redirect URIs and email links. |
| `ALLOWED_ORIGINS` | CORS allowlist for credentialed requests. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` | Admin panel sign-in. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Verification and reset emails. |

Without a Resend key the app still runs, but **nobody can verify an email or
reset a password**, because both flows depend on delivery.

---

## 2. Social sign-in

Each provider is optional. `GET /api/auth/providers` reports only the ones whose
credentials are present, and the sign-in modal renders buttons from that list —
so an unconfigured provider simply never appears.

### Google — free

1. <https://console.cloud.google.com> → APIs & Services → Credentials
2. Create an **OAuth client ID** of type *Web application*
3. Authorised redirect URI:
   `{PUBLIC_BASE_URL}/api/auth/google/callback`
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Apple — requires a paid membership

Apple Sign In needs an **Apple Developer Program membership ($99/year)** and a
real HTTPS domain. It cannot be tested against `localhost`.

1. <https://developer.apple.com> → Certificates, Identifiers & Profiles
2. Create an **App ID** with *Sign In with Apple* enabled
3. Create a **Services ID** → this becomes `APPLE_SERVICES_ID`
4. Register the return URL `{PUBLIC_BASE_URL}/api/auth/apple/callback`
5. Create a **Sign In with Apple key**, download the `.p8`
6. Set `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY`
   (paste the `.p8` contents with literal `\n` between lines, in quotes)

Two Apple quirks the code already handles: the display name arrives only on the
very first callback, and many users sign up with a private relay address that
cannot receive mail from an unverified sending domain.

### Facebook — free, but needs review

1. <https://developers.facebook.com> → My Apps → Create App → Facebook Login
2. Valid OAuth Redirect URI: `{PUBLIC_BASE_URL}/api/auth/facebook/callback`
3. Set `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`

Facebook only returns an email after Meta approves the `email` permission for
your app. Until then, sign-in works but accounts are created without an address.

---

## 3. How sessions work

| Token | Lifetime | Stored | Purpose |
|---|---|---|---|
| Access | 15 min | JS memory only | Sent as `Authorization: Bearer` |
| Refresh | 30 days | `httpOnly` cookie, `SameSite=Lax`, `Path=/api/auth` | Mints new access tokens |

The access token is deliberately **never** written to `localStorage` or
`sessionStorage`, so a cross-site scripting bug cannot read it. The refresh
cookie is unreadable to page scripts by construction.

**Rotation and reuse detection.** Every refresh spends the presented token and
issues a successor in the same *family*. If a spent token is presented again, a
copy has leaked — the entire family is revoked and the account's `tokenVersion`
is bumped, killing live access tokens too. Both the victim and the attacker are
forced to sign in again, which is the safe outcome when the two are
indistinguishable.

`tokenVersion` also increments on password change, password reset, and
"sign out everywhere".

---

## 4. Recovery flows

- **Email verification** — 24 h, single use. Login is refused until confirmed.
- **Password reset** — 30 min, single use. Completing it verifies the email,
  revokes every session, and signs the user in.
- **Provider-only accounts** — requesting a reset for an account with no
  password sends a "use your connected provider" email instead of a dead link.

Reset and verification tokens are 256-bit random values stored **only as
SHA-256 hashes**, so a database leak cannot be replayed against users.

`/api/auth/forgot-password` always returns the same message whether or not the
address exists, so it cannot be used to enumerate customers.

---

## 5. Rate limiting and lockout

Counters live in Mongo, not process memory — on serverless each request may hit
a cold instance, and an in-memory limiter would reset constantly.

| Route | Limit |
|---|---|
| `POST /login` | 20 / 15 min per IP **and** 10 / 15 min per account |
| `POST /register` | 10 / hour per IP |
| `POST /forgot-password` | 5 / hour per IP |
| `POST /admin-login` | 10 / 15 min per IP |

After 5 failed passwords an account locks with exponential backoff (1, 2, 4 …
capped at 60 minutes).

---

## 6. Account linking rule

A provider identity is matched first by its immutable `sub`. Falling back to
email, an existing local account is adopted **only when the provider says the
address is verified**. Otherwise anyone could register an unverified profile
carrying someone else's address and inherit their account.

---

## 7. Local development

Auth needs Mongo. Point `MONGO_URI` at Atlas or a local `mongod`, then:

```bash
npm start          # http://localhost:5000
```

Serving the HTML through a plain static server will show the UI, but every
`/api/*` call 404s and sign-in will not work.
