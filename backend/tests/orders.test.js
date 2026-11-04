const h = require('./helpers');

beforeAll(h.connect);
afterAll(h.disconnect);
beforeEach(h.clearDatabase);

async function setup() {
  await h.createUser({ email: 'student@test.com', name: 'Stu Dent' });
  await h.createUser({ email: 'other@test.com', name: 'Other Student' });
  await h.createUser({ email: 'admin@test.com', name: 'Admin', role: 'admin' });
  const product = await h.createProduct({ name: 'Pen', price: 10.1, stock: 10 });
  return { product, student: await h.login('student@test.com'), other: await h.login('other@test.com'), admin: await h.login('admin@test.com') };
}
const place = (s, productId, quantity, extra = {}) =>
  s.agent.post('/api/orders').set('X-CSRF-Token', s.csrf).send({ items: [{ productId, quantity }], ...extra });
const setStatus = (a, id, status) => a.agent.patch(`/api/admin/orders/${id}/status`).set('X-CSRF-Token', a.csrf).send({ status });
const stockOf = async (id) => (await h.Product.findById(id)).stock;

describe('placing orders', () => {
  test('creates an order, uses database prices and reduces stock', async () => {
    const { product, student } = await setup();
    const res = await place(student, product.id, 3, { items: [{ productId: product.id, quantity: 3, price: 0.01 }] });
    expect(res.status).toBe(201);
    expect(res.body.data.order.totalAmount).toBe(30.3); // 3 x 10.10, client price ignored
    expect(res.body.data.order.items[0].price).toBe(10.1);
    expect(res.body.data.order.orderNumber).toMatch(/^KM-/);
    expect(res.body.data.order.status).toBe('Pending');
    expect(await stockOf(product.id)).toBe(7);
  });
  test('requires login', async () => {
    const { product } = await setup();
    const res = await h.request(h.app).post('/api/orders').send({ items: [{ productId: product.id, quantity: 1 }] });
    expect(res.status).toBe(401);
  });
  test('fails with insufficient stock and leaves stock unchanged', async () => {
    const { product, student } = await setup();
    const res = await place(student, product.id, 11);
    expect(res.status).toBe(409);
    expect(await stockOf(product.id)).toBe(10);
    expect(await h.Order.countDocuments()).toBe(0);
  });
  test('rejects invalid quantities and unavailable products', async () => {
    const { product, student } = await setup();
    expect((await place(student, product.id, 0)).status).toBe(400);
    expect((await place(student, product.id, -2)).status).toBe(400);
    await h.Product.updateOne({ _id: product.id }, { isActive: false });
    expect((await place(student, product.id, 1)).status).toBe(409);
  });
  test('the same idempotency key never creates two orders', async () => {
    const { product, student } = await setup();
    const key = 'checkout-key-12345';
    const a = await place(student, product.id, 2, { idempotencyKey: key });
    const b = await place(student, product.id, 2, { idempotencyKey: key });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.data.order.id).toBe(a.body.data.order.id);
    expect(await stockOf(product.id)).toBe(8);
  });
  test('simultaneous orders for the last items cannot oversell', async () => {
    const { product, student, other } = await setup();
    await h.Product.updateOne({ _id: product.id }, { stock: 5 });
    const results = await Promise.all([place(student, product.id, 4), place(other, product.id, 4)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await stockOf(product.id)).toBe(1);
  });
});

describe('viewing orders', () => {
  test('students see only their own orders; others get 403; admin can view', async () => {
    const { product, student, other, admin } = await setup();
    const order = (await place(student, product.id, 1)).body.data.order;
    expect((await student.agent.get('/api/orders/my-orders')).body.data.orders).toHaveLength(1);
    expect((await other.agent.get('/api/orders/my-orders')).body.data.orders).toHaveLength(0);
    expect((await other.agent.get(`/api/orders/${order.id}`)).status).toBe(403);
    expect((await student.agent.get(`/api/orders/${order.id}`)).status).toBe(200);
    expect((await admin.agent.get(`/api/orders/${order.id}`)).status).toBe(200);
  });
});

describe('status changes and cancellation', () => {
  test('valid and invalid transitions', async () => {
    const { product, student, admin } = await setup();
    const id = (await place(student, product.id, 1)).body.data.order.id;
    expect((await setStatus(admin, id, 'Completed')).status).toBe(409); // skipping steps
    expect((await setStatus(admin, id, 'Confirmed')).status).toBe(200);
    expect((await setStatus(admin, id, 'Pending')).status).toBe(409); // going backwards
    expect((await setStatus(admin, id, 'Ready for Pickup')).status).toBe(200);
    expect((await setStatus(admin, id, 'Completed')).status).toBe(200);
    expect((await setStatus(admin, id, 'Cancelled')).status).toBe(409); // final
    expect((await setStatus(admin, id, 'Nonsense')).status).toBe(400);
  });
  test('students cannot use the admin status endpoint', async () => {
    const { product, student } = await setup();
    const id = (await place(student, product.id, 1)).body.data.order.id;
    expect((await setStatus(student, id, 'Confirmed')).status).toBe(403);
  });
  test('cancelling restores stock exactly once', async () => {
    const { product, student, admin } = await setup();
    const id = (await place(student, product.id, 4)).body.data.order.id;
    expect(await stockOf(product.id)).toBe(6);
    expect((await setStatus(admin, id, 'Cancelled')).status).toBe(200);
    expect(await stockOf(product.id)).toBe(10);
    expect((await setStatus(admin, id, 'Cancelled')).status).toBe(409);
    expect((await student.agent.patch(`/api/orders/${id}/cancel`).set('X-CSRF-Token', student.csrf)).status).toBe(409);
    expect(await stockOf(product.id)).toBe(10);
  });
  test('student cancel works for Pending, but not for another student or Ready orders', async () => {
    const { product, student, other, admin } = await setup();
    const a = (await place(student, product.id, 2)).body.data.order.id;
    expect((await other.agent.patch(`/api/orders/${a}/cancel`).set('X-CSRF-Token', other.csrf)).status).toBe(403);
    expect((await student.agent.patch(`/api/orders/${a}/cancel`).set('X-CSRF-Token', student.csrf)).status).toBe(200);
    expect(await stockOf(product.id)).toBe(10);

    const b = (await place(student, product.id, 1)).body.data.order.id;
    await setStatus(admin, b, 'Confirmed');
    await setStatus(admin, b, 'Ready for Pickup');
    expect((await student.agent.patch(`/api/orders/${b}/cancel`).set('X-CSRF-Token', student.csrf)).status).toBe(409);
  });
});

describe('admin dashboard and history', () => {
  test('sales count only completed orders', async () => {
    const { product, student, admin } = await setup();
    const a = (await place(student, product.id, 1)).body.data.order.id; // will complete
    const b = (await place(student, product.id, 1)).body.data.order.id; // will cancel
    await place(student, product.id, 1); // stays pending
    for (const s of ['Confirmed', 'Ready for Pickup', 'Completed']) await setStatus(admin, a, s);
    await setStatus(admin, b, 'Cancelled');
    const { stats } = (await admin.agent.get('/api/admin/dashboard')).body.data;
    expect(stats.totalOrders).toBe(3);
    expect(stats.pendingOrders).toBe(1);
    expect(stats.completedOrders).toBe(1);
    expect(stats.totalSales).toBe(10.1);
  });
  test('deleting a product used in an order hides it and keeps the order intact', async () => {
    const { product, student, admin } = await setup();
    const orderId = (await place(student, product.id, 1)).body.data.order.id;
    const del = await admin.agent.delete(`/api/products/${product.id}`).set('X-CSRF-Token', admin.csrf);
    expect(del.body.data.deactivated).toBe(true);
    const order = (await student.agent.get(`/api/orders/${orderId}`)).body.data.order;
    expect(order.items[0].name).toBe('Pen');
  });
});
