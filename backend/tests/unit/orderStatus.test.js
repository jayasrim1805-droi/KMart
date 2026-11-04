const { canTransition, STUDENT_CANCELLABLE, ADMIN_CANCELLABLE, ALL_STATUSES } = require('../../utils/orderStatus');

describe('order status transitions', () => {
  test('allows the normal forward flow', () => {
    expect(canTransition('Pending', 'Confirmed')).toBe(true);
    expect(canTransition('Confirmed', 'Ready for Pickup')).toBe(true);
    expect(canTransition('Ready for Pickup', 'Completed')).toBe(true);
  });
  test('blocks skipping steps and going backwards', () => {
    expect(canTransition('Pending', 'Completed')).toBe(false);
    expect(canTransition('Pending', 'Ready for Pickup')).toBe(false);
    expect(canTransition('Confirmed', 'Pending')).toBe(false);
  });
  test('Completed and Cancelled are final', () => {
    ALL_STATUSES.forEach((s) => {
      expect(canTransition('Completed', s)).toBe(false);
      expect(canTransition('Cancelled', s)).toBe(false);
    });
  });
  test('cancellation rules', () => {
    expect(STUDENT_CANCELLABLE).toEqual(['Pending', 'Confirmed']);
    expect(ADMIN_CANCELLABLE).toContain('Ready for Pickup');
    expect(ADMIN_CANCELLABLE).not.toContain('Completed');
  });
});
