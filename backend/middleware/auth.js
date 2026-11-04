const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { COOKIE_NAME } = require('../config/constants');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

async function userFromRequest(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return 'expired';
  }
  // Always reload the user so deleted accounts or changed roles take effect immediately.
  return (await User.findById(payload.sub)) || null;
}

// Requires a logged-in user.
const protect = asyncHandler(async (req, res, next) => {
  const user = await userFromRequest(req);
  if (user === 'expired') throw new AppError('Your session has expired. Please log in again.', 401);
  if (!user) throw new AppError('Please log in to continue.', 401);
  req.user = user;
  next();
});

// Adds req.user when logged in, but does not fail for guests.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const user = await userFromRequest(req);
  if (user && user !== 'expired') req.user = user;
  next();
});

// Role check. Use after protect().
const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError('You do not have permission to perform this action.', 403));
  }
  next();
};

module.exports = { protect, optionalAuth, restrictTo };
