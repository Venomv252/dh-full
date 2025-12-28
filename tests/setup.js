/**
 * Jest Test Setup
 * 
 * Global test configuration and setup for the Emergency Incident Platform
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

// Global test database instance
let mongoServer;

// Mock the database connection for tests
jest.mock('../src/config/database', () => ({
  connectDB: jest.fn(),
  disconnectDB: jest.fn(),
  ensureIndexes: jest.fn(),
  validateCriticalIndexes: jest.fn()
}));

/**
 * Setup test database before all tests
 */
beforeAll(async () => {
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'emergency-incident-test'
    }
  });
  
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  console.log('✅ Test database connected');
});

/**
 * Clean up after each test
 */
afterEach(async () => {
  // Clear all collections after each test
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop the in-memory MongoDB instance
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  console.log('✅ Test database disconnected');
});

/**
 * Global test timeout for property-based tests
 */
jest.setTimeout(30000);

/**
 * Suppress console.log during tests (optional)
 * Uncomment if you want cleaner test output
 */
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };