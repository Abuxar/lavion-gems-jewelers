const fs = require('fs');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const goldRateRoutes = require('./routes/goldRates');
const customOrderRoutes = require('./routes/customOrders');
const subscribeRoutes = require('./routes/subscribe');
const whatsappRoutes = require('./routes/whatsapp');

const { connectDB, isMongoConnected, dbStatusNote } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect MongoDB Database (non-blocking with error catch)
connectDB().catch(err => console.error('DB Init Error:', err.message));

// Trust Vercel's proxy so req.ip and secure cookies resolve correctly.
app.set('trust proxy', 1);

/**
 * Credentialed requests carry the refresh cookie, so the origin allowlist has
 * to be explicit — `cors()` with a wildcard cannot be used with credentials.
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS ||
  'http://localhost:5000,http://127.0.0.1:5000,http://localhost:8899,http://127.0.0.1:8899')
  .split(',').map(s => s.trim()).filter(Boolean);

if (process.env.PUBLIC_BASE_URL) {
  allowedOrigins.push(process.env.PUBLIC_BASE_URL.replace(/\/$/, ''));
}

// Vercel publishes the deployment's own hostnames. Without these, a deployment
// whose ALLOWED_ORIGINS / PUBLIC_BASE_URL are unset rejects requests coming
// from the very page it just served — a same-origin request the browser only
// labels with an Origin header because it is a POST. VERCEL_URL is unique per
// deployment; VERCEL_PROJECT_PRODUCTION_URL is the stable production alias.
for (const host of [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]) {
  if (host) allowedOrigins.push(`https://${host}`);
}

app.use(cors({
  origin(origin, cb) {
    // Same-origin and server-to-server requests send no Origin header.
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`Origin ${origin} is not allowed.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(cookieParser());
// Bound body size so a large payload cannot exhaust a serverless instance.
app.use(express.json({ limit: '256kb' }));
// Apple posts its OAuth callback as a form.
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Baseline security headers (kept dependency-free).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Never let a browser or CDN cache an authenticated API response.
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

// Direct admin access routes (before static files)
app.get(['/admin', '/admin-panel'], (req, res) => {
  res.redirect('/?admin=true');
});

// API Routes (handle before static fallback)
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/gold-rates', goldRateRoutes);
app.use('/api/custom-orders', customOrderRoutes);
app.use('/api/subscribe', subscribeRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    store: 'Lavion Gems & Jewellers API Server',
    database: isMongoConnected() ? 'MongoDB' : 'File DB Fallback',
    // Without this, a fallback is indistinguishable from a misconfiguration.
    databaseNote: dbStatusNote(),
    time: new Date().toISOString()
  });
});

// Serve frontend static files from root directory
app.use(express.static(path.join(__dirname, '../')));

// For all other routes (SPA fallback), Vercel's rewrite handles it
// This is just a catch-all for API 404s
app.get('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

/**
 * Errors must not reach Express's default handler, which replies with an HTML
 * stack trace. Clients here parse JSON, so an HTML body surfaces as an opaque
 * "unable to reach the service" instead of the actual reason, and the trace
 * discloses server paths.
 */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const isOrigin = /is not allowed/.test(err?.message || '');
  if (isOrigin) {
    console.error('CORS rejection:', err.message, '| allowed:', allowedOrigins.join(', '));
    return res.status(403).json({
      success: false,
      message: 'Origin not allowed. Set ALLOWED_ORIGINS or PUBLIC_BASE_URL to this site\'s URL.',
      code: 'ORIGIN_NOT_ALLOWED'
    });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Server error.' });
});

// Start Server (only when run directly, not when imported by Vercel serverless function)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(` 💎 Lavion Gems & Jewellers Node.js Server Active`);
    console.log(` 🚀 Running on: http://localhost:${PORT}`);
    console.log(` 📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=================================================`);
  });
}

module.exports = app;
