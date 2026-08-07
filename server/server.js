const dns = require('dns');
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch (e) {}

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const goldRateRoutes = require('./routes/goldRates');
const customOrderRoutes = require('./routes/customOrders');
const subscribeRoutes = require('./routes/subscribe');
const whatsappRoutes = require('./routes/whatsapp');

const { connectDB, isMongoConnected } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect MongoDB Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from root directory
app.use(express.static(path.join(__dirname, '../')));

// API Routes
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
    time: new Date().toISOString()
  });
});

// Direct admin access routes
app.get(['/admin', '/admin-panel'], (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Start Server
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(` 💎 Lavion Gems & Jewellers Node.js Server Active`);
    console.log(` 🚀 Running on: http://localhost:${PORT}`);
    console.log(` 📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=================================================`);
  });
}

module.exports = app;
