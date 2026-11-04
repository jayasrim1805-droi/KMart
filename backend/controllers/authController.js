const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { hashPassword, verifyPassword } = require('../utils/password');
const { setAuthCookies, setCsrfCookie, clearAuthCookies } = require('../utils/token');
const { ROLES, CSRF_COOKIE_NAME } = require('../config/constants');

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

// Public registration ALWAYS creates a student. Any "role" in the request body is ignored.
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new AppError('An account with this email already exists.', 409);
  const user = await User.create({ name, email, passwordHash: await hashPassword(password), role: ROLES.STUDENT });
  setAuthCookies(res, user);
  res.status(201).json({ success: true, message: 'Account created. Welcome to KMart!', data: { user } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await verifyPassword(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) throw new AppError('Invalid email or password.', 401);
  setAuthCookies(res, user);
  res.json({ success: true, message: 'Logged in successfully.', data: { user } });
});

exports.logout = (req, res) => {
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out.' });
};

exports.me = (req, res) => {
  if (!req.cookies[CSRF_COOKIE_NAME]) setCsrfCookie(res); // make sure the page can send the CSRF header
  res.json({ success: true, data: { user: req.user } });
};
