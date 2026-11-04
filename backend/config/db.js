const mongoose = require('mongoose');
const { config } = require('./env');

async function connectDB(uri = config.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  return mongoose.connection;
}

module.exports = { connectDB };
