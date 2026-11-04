const bcrypt = require('bcryptjs');
const ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 12; // low cost only in automated tests
const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);
module.exports = { hashPassword, verifyPassword };
