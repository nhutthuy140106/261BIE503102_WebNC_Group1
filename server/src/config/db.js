const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectDb(uri = mongoUri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Mongo connected');
  } catch (err) {
    console.error(`Không kết nối được MongoDB (${uri}): ${err.message}`);
    console.error('Hãy bật MongoDB hoặc sửa MONGODB_URI trong server/.env');
    process.exit(1);
  }
}

module.exports = { connectDb };
