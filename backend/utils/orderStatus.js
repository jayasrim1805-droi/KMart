const { ORDER_STATUS: S } = require('../config/constants');

const ALL_STATUSES = Object.values(S);

// Allowed next statuses for an admin. Completed and Cancelled are final.
const ADMIN_TRANSITIONS = {
  [S.PENDING]: [S.CONFIRMED, S.CANCELLED],
  [S.CONFIRMED]: [S.READY, S.CANCELLED],
  [S.READY]: [S.COMPLETED, S.CANCELLED],
  [S.COMPLETED]: [],
  [S.CANCELLED]: [],
};

// A student may cancel only before the order is ready for pickup.
const STUDENT_CANCELLABLE = [S.PENDING, S.CONFIRMED];
// An admin may cancel until the order is completed.
const ADMIN_CANCELLABLE = [S.PENDING, S.CONFIRMED, S.READY];

const canTransition = (from, to) => (ADMIN_TRANSITIONS[from] || []).includes(to);

module.exports = { ALL_STATUSES, ADMIN_TRANSITIONS, STUDENT_CANCELLABLE, ADMIN_CANCELLABLE, canTransition };
