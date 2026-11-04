// Values shared by models, validators and controllers.
module.exports = {
  ROLES: { STUDENT: 'student', ADMIN: 'admin' },
  CATEGORIES: ['Stationery', 'Books', 'Snacks', 'Beverages', 'Accessories', 'College Essentials'],
  ORDER_STATUS: {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    READY: 'Ready for Pickup',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  },
  COOKIE_NAME: 'kmart_token', // HttpOnly JWT cookie
  CSRF_COOKIE_NAME: 'kmart_csrf', // readable by JS, echoed in X-CSRF-Token header
  MAX_ITEMS_PER_ORDER: 20,
  MAX_QTY_PER_ITEM: 20,
};
