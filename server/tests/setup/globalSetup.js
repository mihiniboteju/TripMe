// Global test setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.PORT = '5555'; // Different port for tests

// Increase timeout for MongoDB Memory Server
jest.setTimeout(30000);
