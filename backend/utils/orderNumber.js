const crypto = require('crypto');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing 0/O/1/I

/** Example: KM-261030-7QX4TB  (KM-YYMMDD-random) */
function generateOrderNumber(date = new Date()) {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `KM-${yy}${mm}${dd}-${suffix}`;
}
module.exports = { generateOrderNumber };
