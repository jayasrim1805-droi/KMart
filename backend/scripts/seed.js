// Inserts sample products. Safe to run many times:
//  - a product that already exists (same name) is left untouched, so your edited prices/stock are kept
//  - only products that are missing get created
const mongoose = require('mongoose');
const { config, validateConfig } = require('../config/env');
const { connectDB } = require('../config/db');
const Product = require('../models/Product');
const samples = require('./sampleProducts');

(async () => {
  try {
    validateConfig();
    await connectDB();
    const ops = samples.map(({ slug, ...p }) => ({
      updateOne: { filter: { name: p.name }, update: { $setOnInsert: p }, upsert: true },
    }));
    const result = await Product.bulkWrite(ops);
    console.log(`Seed finished: ${result.upsertedCount} added, ${samples.length - result.upsertedCount} already existed.`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
