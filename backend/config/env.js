const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: '1d',
  cookieMaxAgeMs: 24 * 60 * 60 * 1000, // must match jwtExpiresIn
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD, 10) || 5,
};

// Stop early with a clear message if something important is missing.
function validateConfig() {
  const problems = [];
  if (!config.mongoUri) problems.push('MONGODB_URI is not set.');
  if (!config.jwtSecret || config.jwtSecret.length < 32 || config.jwtSecret.startsWith('replace-me')) {
    problems.push('JWT_SECRET must be set to a random string of at least 32 characters.');
  }
  if (problems.length) {
    throw new Error(
      'Configuration error:\n - ' + problems.join('\n - ') +
        '\nCopy .env.example to .env and fill in the values (see README).'
    );
  }
}

module.exports = { config, validateConfig };
