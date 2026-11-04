const { calculateTotal, toCents } = require('../../utils/money');
const { generateOrderNumber } = require('../../utils/orderNumber');

describe('money helpers', () => {
  test('adds prices without floating point errors', () => {
    expect(calculateTotal([{ price: 0.1, quantity: 1 }, { price: 0.2, quantity: 1 }])).toBe(0.3);
    expect(calculateTotal([{ price: 19.99, quantity: 3 }])).toBe(59.97);
  });
  test('converts to whole cents', () => expect(toCents(19.99)).toBe(1999));
  test('empty list totals zero', () => expect(calculateTotal([])).toBe(0));
});

describe('order numbers', () => {
  test('have the KM-YYMMDD-XXXXXX format', () => {
    expect(generateOrderNumber(new Date(2026, 9, 31))).toMatch(/^KM-261031-[A-Z2-9]{6}$/);
  });
  test('are different each time', () => {
    expect(generateOrderNumber()).not.toBe(generateOrderNumber());
  });
});
