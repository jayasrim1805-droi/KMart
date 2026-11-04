const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { config } = require('../config/env');
const { COOKIE_NAME, CSRF_COOKIE_NAME } = require('../config/constants');

const baseCookie = () => ({ sameSite: 'strict', secure: config.cookieSecure, path: '/' });

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

// Login token lives in an HttpOnly cookie (JavaScript cannot read it, which limits XSS damage).
// A second, readable "csrf" cookie is echoed by the frontend in a header (double-submit CSRF protection).
function setAuthCookies(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), { ...baseCookie(), httpOnly: true, maxAge: config.cookieMaxAgeMs });
  setCsrfCookie(res);
}

function setCsrfCookie(res) {
  const csrf = crypto.randomBytes(24).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, csrf, { ...baseCookie(), httpOnly: false, maxAge: config.cookieMaxAgeMs });
}

function clearAuthCookies(res) {
  res.clearCookie(COOKIE_NAME, { ...baseCookie(), httpOnly: true });
  res.clearCookie(CSRF_COOKIE_NAME, { ...baseCookie(), httpOnly: false });
}

module.exports = { signToken, setAuthCookies, setCsrfCookie, clearAuthCookies };
