const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const GoldRate = require('../models/GoldRate');
const Customer = require('../models/Customer');
const { readData } = require('../utils/db');


async function connectDB() {
  if (mongoose.connection && mongoose.connection.readyState >= 1) {
    return;
  }

  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) {
    console.log(' ℹ️ MONGO_URI not set. Operating in File DB mode.');
    return;
  }

  try {
    mongoose.set('strictQuery', false);
    /**
     * Buffering exists so a query issued during a connection handshake waits
     * rather than failing. The default ceiling of 10s is far past useful on a
     * serverless request: if the handshake has not landed in two, it is not
     * landing, and the caller should fall back rather than hold the request
     * open. serverSelectionTimeoutMS below is already 3s.
     */
    mongoose.set('bufferTimeoutMS', 2000);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(' 🍃 MongoDB Connected Successfully!');

    // Seed database if empty
    await seedMongoIfEmpty();
  } catch (error) {
    console.log(' ⚠️ MongoDB Atlas Connection Note:', error.message);
    console.log(' ℹ️ Operating in File DB mode.');
  }
}

async function seedMongoIfEmpty() {
  try {
    const fileData = readData();

    const prodCount = await Product.countDocuments();
    if (prodCount === 0 && fileData.products && fileData.products.length > 0) {
      await Product.insertMany(fileData.products);
      console.log(` 🌱 Seeded ${fileData.products.length} products to MongoDB.`);
    }

    const orderCount = await Order.countDocuments();
    if (orderCount === 0 && fileData.orders && fileData.orders.length > 0) {
      await Order.insertMany(fileData.orders);
      console.log(` 🌱 Seeded ${fileData.orders.length} orders to MongoDB.`);
    }

    const rateCount = await GoldRate.countDocuments();
    if (rateCount === 0 && fileData.goldRates) {
      await GoldRate.create(fileData.goldRates);
      console.log(' 🌱 Seeded Gold Rates to MongoDB.');
    }

    const custCount = await Customer.countDocuments();
    if (custCount === 0 && fileData.customers && fileData.customers.length > 0) {
      await Customer.insertMany(fileData.customers);
      console.log(' 🌱 Seeded Demo Customer to MongoDB.');
    }
  } catch (e) {
    console.error('Mongo Seeding error:', e.message);
  }
}

/**
 * Read the driver's own state rather than a flag set once at startup. The flag
 * could not notice a connection dropping later in a container's life, which
 * left callers routing queries at a dead socket.
 */
function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  isMongoConnected
};
