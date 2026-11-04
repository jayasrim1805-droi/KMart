// Money is added in whole paise (cents) to avoid floating point errors like 0.1 + 0.2.
const toCents = (amount) => Math.round(Number(amount) * 100);
const fromCents = (cents) => cents / 100;

/** items: [{ price, quantity }]  ->  total as a number with 2 decimals */
function calculateTotal(items) {
  const cents = items.reduce((sum, i) => sum + toCents(i.price) * i.quantity, 0);
  return fromCents(cents);
}

module.exports = { toCents, fromCents, calculateTotal };
