const h = require('./helpers');

beforeAll(h.connect);
afterAll(h.disconnect);
beforeEach(h.clearDatabase);

const good = { name: 'Blue Pen', description: 'Smooth', category: 'Stationery', price: 12.5, stock: 30, imageUrl: '/assets/images/placeholder.svg' };

describe('product listing', () => {
  beforeEach(async () => {
    await h.createProduct({ name: 'Apple Notebook', price: 90 });
    await h.createProduct({ name: 'Banana Chips', category: 'Snacks', price: 30 });
    await h.createProduct({ name: 'Hidden Item', price: 10, isActive: false });
  });
  test('lists only active products with pagination info', async () => {
    const res = await h.request(h.app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
  });
  test('combines search, category, price and sort', async () => {
    const a = await h.request(h.app).get('/api/products?search=chips&category=Snacks');
    expect(a.body.data.products.map((p) => p.name)).toEqual(['Banana Chips']);
    const b = await h.request(h.app).get('/api/products?sort=price_desc');
    expect(b.body.data.products[0].name).toBe('Apple Notebook');
    const c = await h.request(h.app).get('/api/products?minPrice=50');
    expect(c.body.data.products).toHaveLength(1);
  });
  test('special characters in search do not crash', async () => {
    expect((await h.request(h.app).get('/api/products?search=(')).status).toBe(200);
  });
  test('rejects an invalid sort and an invalid id', async () => {
    expect((await h.request(h.app).get('/api/products?sort=hack')).status).toBe(400);
    expect((await h.request(h.app).get('/api/products/not-an-id')).status).toBe(400);
  });
  test('hidden products are 404 for the public', async () => {
    const hidden = await h.Product.findOne({ name: 'Hidden Item' });
    expect((await h.request(h.app).get(`/api/products/${hidden.id}`)).status).toBe(404);
  });
});

describe('product management', () => {
  test('admin can create, update, adjust stock and delete', async () => {
    await h.createUser({ role: 'admin', email: 'admin@test.com' });
    const { agent, csrf } = await h.login('admin@test.com');
    const created = await agent.post('/api/products').set('X-CSRF-Token', csrf).send(good);
    expect(created.status).toBe(201);
    const id = created.body.data.product.id;

    const updated = await agent.put(`/api/products/${id}`).set('X-CSRF-Token', csrf).send({ ...good, price: 15 });
    expect(updated.body.data.product.price).toBe(15);

    const more = await agent.patch(`/api/products/${id}/stock`).set('X-CSRF-Token', csrf).send({ adjustment: 5 });
    expect(more.body.data.product.stock).toBe(35);
    const tooMuch = await agent.patch(`/api/products/${id}/stock`).set('X-CSRF-Token', csrf).send({ adjustment: -100 });
    expect(tooMuch.status).toBe(409);

    const del = await agent.delete(`/api/products/${id}`).set('X-CSRF-Token', csrf);
    expect(del.body.data.deleted).toBe(true);
  });
  test('student cannot create products; guests get 401', async () => {
    await h.createUser();
    const { agent, csrf } = await h.login();
    expect((await agent.post('/api/products').set('X-CSRF-Token', csrf).send(good)).status).toBe(403);
    expect((await h.request(h.app).post('/api/products').send(good)).status).toBe(401);
  });
  test('invalid data is rejected (negative price/stock, bad category, bad image URL)', async () => {
    await h.createUser({ role: 'admin', email: 'admin@test.com' });
    const { agent, csrf } = await h.login('admin@test.com');
    const post = (body) => agent.post('/api/products').set('X-CSRF-Token', csrf).send(body);
    expect((await post({ ...good, price: -5 })).status).toBe(400);
    expect((await post({ ...good, stock: -1 })).status).toBe(400);
    expect((await post({ ...good, stock: 1.5 })).status).toBe(400);
    expect((await post({ ...good, category: 'Weapons' })).status).toBe(400);
    expect((await post({ ...good, imageUrl: 'javascript:alert(1)' })).status).toBe(400);
    expect((await post({ ...good, price: 1.234 })).status).toBe(400);
  });
});
