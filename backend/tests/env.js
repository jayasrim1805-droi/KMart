// Runs before every test file. Forces test mode so tests never use your real settings.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kmart_test_unused';
