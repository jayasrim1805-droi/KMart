const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { hashPassword } = require('../utils/password');

let memoryServer;

// Connects to an ISOLATED database: either TEST_MONGODB_URI (its database name must contain "test")
// or a temporary in-memory MongoDB. Your development database is never touched.
async function connect() {
  const uri = process.env.TEST_MONGODB_URI;
  if (uri) {
    const dbName = uri.split('?')[0].split('/').pop();
    if (!/test/i.test(dbName)) throw new Error(`Refusing to run tests: database name "${dbName}" must contain "test".`);
    await mongoose.connect(uri);
  } else {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    await mongoose.connect(memoryServer.getUri());
  }
  await Promise.all([User.init(), Product.init(), Order.init()]); // build unique indexes
}

async function disconnect() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

const clearDatabase = () => Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);

async function createUser({ name = 'Test User', email = 'student@test.com', password = 'Password123', role = 'student' } = {}) {
  return User.create({ name, email, passwordHash: await hashPassword(password), role });
}

const createProduct = (overrides = {}) =>
  Product.create({ name: 'Test Notebook', description: 'A notebook', category: 'Stationery', price: 50, stock: 10, ...overrides });

// Logs in and returns { agent, csrf }. The agent keeps cookies; add .set('X-CSRF-Token', csrf) to changing requests.
async function login(email = 'student@test.com', password = 'Password123') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error('Test login failed: ' + JSON.stringify(res.body));
  const csrfCookie = res.headers['set-cookie'].find((c) => c.startsWith('kmart_csrf='));
  return { agent, csrf: csrfCookie.split(';')[0].split('=')[1] };
}

module.exports = { app, request, connect, disconnect, clearDatabase, createUser, createProduct, login, User, Product, Order };
