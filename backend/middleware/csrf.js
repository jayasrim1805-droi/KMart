const crypto = require('crypto');
const AppError = require('../utils/AppError');
const { COOKIE_NAME, CSRF_COOKIE_NAME } = require('../config/constants');

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const EXEMPT_PATHS = ['/auth/login', '/auth/register']; // no session exists yet

const sameValue = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Double-submit cookie check for requests that change data while logged in.
// Mounted on /api, so req.path is relative to /api.
module.exports = (req, res, next) => {
  if (SAFE_METHODS.includes(req.method) || EXEMPT_PATHS.includes(req.path)) return next();
  if (!req.cookies || !req.cookies[COOKIE_NAME]) return next(); // not logged in: auth middleware will reject
  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.get('X-CSRF-Token');
  if (!cookieToken || !headerToken || !sameValue(cookieToken, headerToken)) {
    return next(new AppError('Security check failed. Please refresh the page and try again.', 403));
  }
  next();
};
