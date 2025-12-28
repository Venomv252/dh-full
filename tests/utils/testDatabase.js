/**
 * Test Database Utilities
 * 
 * Utilities for setting up and managing test database instances
 * Uses MongoDB Memory Server for isolated testing
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Connect to in-memory MongoDB instance for testing
 */
const connectTestDB = async () => {
  try {
    // Create new in-memory database instance
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '6.0.0'
      }
    });
    
    const mongoUri = mongoServer.getUri();
    
    // Connect mongoose to the in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to test database');
    return mongoUri;
  } catch (error) {
    console.error('❌ Test database connection failed:', error);
    throw error;
  }
};

/**
 * Disconnect and cleanup test database
 */
const disconnectTestDB = async () => {
  try {
    // Close mongoose connection
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    
    // Stop the in-memory MongoDB instance
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('✅ Test database disconnected and cleaned up');
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error);
    throw error;
  }
};

/**
 * Clear all collections in the test database
 */
const clearTestDB = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    console.log('✅ Test database cleared');
  } catch (error) {
    console.error('❌ Test database clear failed:', error);
    throw error;
  }
};

/**
 * Setup test database with indexes
 */
const setupTestDB = async () => {
  try {
    await connectTestDB();
    
    // Import models to ensure indexes are created
    require('../../src/models/User');
    require('../../src/models/Guest');
    require('../../src/models/Incident');
    
    // Ensure indexes are created
    await mongoose.connection.db.admin().command({ listIndexes: 'users' });
    
    console.log('✅ Test database setup complete with indexes');
  } catch (error) {
    console.error('❌ Test database setup failed:', error);
    throw error;
  }
};

/**
 * Get test database statistics
 */
const getTestDBStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    return {
      dbName: mongoose.connection.name,
      collections: collections.length,
      dataSize: stats.dataSize,
      indexSize: stats.indexSize,
      objects: stats.objects
    };
  } catch (error) {
    console.error('❌ Failed to get test database stats:', error);
    return null;
  }
};

/**
 * Create test data isolation
 * Ensures each test runs with clean data
 */
const withTestData = (testFn) => {
  return async () => {
    await clearTestDB();
    try {
      await testFn();
    } finally {
      await clearTestDB();
    }
  };
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearTestDB,
  setupTestDB,
  getTestDBStats,
  withTestData
};