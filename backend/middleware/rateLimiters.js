const rateLimit = require('express-rate-limit');
const { config } = require('../config/env');

const skip = () => config.nodeEnv === 'test'; // do not slow down automated tests
const make = (windowMs, max, message) =>
  rateLimit({
    windowMs, max, skip, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message },
  });

// Strict limit for login/register to slow down password guessing.
const authLimiter = make(15 * 60 * 1000, 20, 'Too many attempts. Please wait 15 minutes and try again.');
// Generous limit for the rest of the API.
const apiLimiter = make(15 * 60 * 1000, 600, 'Too many requests. Please slow down and try again shortly.');

module.exports = { authLimiter, apiLimiter };
