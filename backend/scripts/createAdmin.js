// Creates the first administrator from environment variables (ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD).
// There is no default admin and no hardcoded password. Run:  npm run create-admin
const mongoose = require('mongoose');
const { validateConfig } = require('../config/env');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');

(async () => {
  try {
    validateConfig();
    const name = (process.env.ADMIN_NAME || 'Store Administrator').trim();
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';

    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Set a valid ADMIN_EMAIL in your .env file.');
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      throw new Error('ADMIN_PASSWORD must be at least 10 characters and contain letters and numbers.');
    }

    await connectDB();
    if (await User.exists({ email })) throw new Error(`A user with ${email} already exists. Nothing was changed.`);
    await User.create({ name, email, passwordHash: await hashPassword(password), role: 'admin' });
    console.log(`Administrator created: ${email}`);
    console.log('Now remove ADMIN_PASSWORD from your .env file.');
  } catch (err) {
    console.error('Could not create administrator:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
