const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../db/data.json');

// Ensure DB file exists
function readData() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error('Database file does not exist.');
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading database:', error.message);
    return {
      products: [],
      orders: [],
      goldRates: {
        rate24kPerTola: 428500,
        rate24kPer10g: 367376,
        rate24kPer1g: 36738,
        rate22kPerTola: 392790,
        rate18kPerTola: 321375,
        rateSilverPerTola: 4850,
        lastUpdated: 'Live Sarafa Market Data'
      },
      customers: [],
      customOrders: []
    };
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing to database:', error.message);
    return false;
  }
}

module.exports = {
  readData,
  writeData
};
