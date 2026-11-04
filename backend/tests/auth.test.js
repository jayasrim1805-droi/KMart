const h = require('./helpers');

beforeAll(h.connect);
afterAll(h.disconnect);
beforeEach(h.clearDatabase);

const valid = { name: 'Asha Kumar', email: 'Asha@Example.com', password: 'Secret123' };

describe('registration', () => {
  test('creates a student, normalises the email and hides the password hash', async () => {
    const res = await h.request(h.app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('asha@example.com');
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'].join(';')).toMatch(/kmart_token=.*HttpOnly/);
  });
  test('ignores a role sent by the client (no self-made admins)', async () => {
    const res = await h.request(h.app).post('/api/auth/register').send({ ...valid, role: 'admin' });
    expect(res.body.data.user.role).toBe('student');
  });
  test('rejects a duplicate email with 409', async () => {
    await h.request(h.app).post('/api/auth/register').send(valid);
    const res = await h.request(h.app).post('/api/auth/register').send({ ...valid, email: 'asha@example.com' });
    expect(res.status).toBe(409);
  });
  test('rejects weak passwords and bad emails', async () => {
    expect((await h.request(h.app).post('/api/auth/register').send({ ...valid, password: 'short1' })).status).toBe(400);
    expect((await h.request(h.app).post('/api/auth/register').send({ ...valid, password: 'onlyletters' })).status).toBe(400);
    expect((await h.request(h.app).post('/api/auth/register').send({ ...valid, email: 'nope' })).status).toBe(400);
  });
});

describe('login', () => {
  beforeEach(() => h.createUser());
  test('works with valid credentials and /me returns the user', async () => {
    const { agent } = await h.login();
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('student@test.com');
  });
  test('fails with a wrong password or unknown email (same message)', async () => {
    const a = await h.request(h.app).post('/api/auth/login').send({ email: 'student@test.com', password: 'Wrong12345' });
    const b = await h.request(h.app).post('/api/auth/login').send({ email: 'ghost@test.com', password: 'Whatever123' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });
  test('/me without login is 401; logout clears the session', async () => {
    expect((await h.request(h.app).get('/api/auth/me')).status).toBe(401);
    const { agent, csrf } = await h.login();
    await agent.post('/api/auth/logout').set('X-CSRF-Token', csrf);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('authorization basics', () => {
  test('guests get 401 and students get 403 on admin routes', async () => {
    expect((await h.request(h.app).get('/api/admin/dashboard')).status).toBe(401);
    await h.createUser();
    const { agent } = await h.login();
    expect((await agent.get('/api/admin/dashboard')).status).toBe(403);
    expect((await agent.get('/api/admin/orders')).status).toBe(403);
  });
  test('changing requests without the CSRF header are blocked', async () => {
    await h.createUser({ role: 'admin', email: 'admin@test.com' });
    const { agent } = await h.login('admin@test.com');
    const res = await agent.post('/api/products').send({ name: 'X Product', category: 'Books', price: 10, stock: 1 });
    expect(res.status).toBe(403);
  });
});
