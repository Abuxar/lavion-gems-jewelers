const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const GoldRate = require('../models/GoldRate');
const Customer = require('../models/Customer');
const { readData } = require('../utils/db');

let isConnected = false;

async function connectDB() {
  const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lavion_jewellers';

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    isConnected = true;
    console.log(' 🍃 MongoDB Connected Successfully!');

    // Seed database if empty
    await seedMongoIfEmpty();
  } catch (error) {
    isConnected = false;
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

function isMongoConnected() {
  return isConnected;
}

module.exports = {
  connectDB,
  isMongoConnected
};
