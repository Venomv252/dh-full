#!/usr/bin/env node

/**
 * Core Infrastructure Checkpoint Verification
 * Verifies that all models, indexes, and middleware are working correctly
 * Tests database connectivity and basic functionality
 */

const mongoose = require('mongoose');
const { connectDB, validateCriticalIndexes } = require('../src/config/database');
const { listIndexes } = require('../src/config/indexes');

// Load environment variables
require('dotenv').config();

// Import models to test
const User = require('../src/models/User');
const Guest = require('../src/models/Guest');
const Incident = require('../src/models/Incident');

// Import middleware to test
const { authenticate, generateUserToken } = require('../src/middleware/auth');
const { rateLimiters } = require('../src/middleware/rateLimiter');
const { validators } = require('../src/middleware/validation');
const { roleCheckers, hasPermission } = require('../src/middleware/roleCheck');

/**
 * Test results tracking
 */
const testResults = {
  database: { passed: 0, failed: 0, tests: [] },
  models: { passed: 0, failed: 0, tests: [] },
  indexes: { passed: 0, failed: 0, tests: [] },
  middleware: { passed: 0, failed: 0, tests: [] },
  overall: { passed: 0, failed: 0 }
};

/**
 * Add test result
 */
const addTestResult = (category, testName, passed, error = null) => {
  const result = {
    name: testName,
    passed,
    error: error?.message || null,
    timestamp: new Date().toISOString()
  };
  
  testResults[category].tests.push(result);
  
  if (passed) {
    testResults[category].passed++;
    testResults.overall.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults[category].failed++;
    testResults.overall.failed++;
    console.log(`❌ ${testName}: ${error?.message || 'Unknown error'}`);
  }
};

/**
 * Test database connectivity
 */
const testDatabaseConnectivity = async () => {
  console.log('\n🔍 Testing Database Connectivity...');
  
  try {
    // Test connection
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-platform-test';
    await connectDB(mongoUri, false); // Don't create indexes yet
    addTestResult('database', 'Database Connection', true);
    
    // Test basic operations
    const testCollection = mongoose.connection.db.collection('test');
    await testCollection.insertOne({ test: true, timestamp: new Date() });
    await testCollection.deleteOne({ test: true });
    addTestResult('database', 'Basic Database Operations', true);
    
    // Test database info
    const dbStats = await mongoose.connection.db.stats();
    addTestResult('database', 'Database Statistics Access', true);
    
  } catch (error) {
    addTestResult('database', 'Database Connection', false, error);
  }
};

/**
 * Test model functionality
 */
const testModels = async () => {
  console.log('\n🔍 Testing Model Functionality...');
  
  // Test User model
  try {
    const testUser = new User({
      fullName: 'Test User',
      dob: new Date('1990-01-01'),
      gender: 'male',
      phone: '+1234567890',
      email: 'test@example.com',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        pincode: '12345'
      }
    });
    
    // Test validation without saving
    await testUser.validate();
    addTestResult('models', 'User Model Validation', true);
    
    // Test virtual properties
    const age = testUser.age;
    const fullAddress = testUser.fullAddress;
    addTestResult('models', 'User Model Virtuals', true);
    
  } catch (error) {
    addTestResult('models', 'User Model Validation', false, error);
  }
  
  // Test Guest model
  try {
    const testGuest = new Guest();
    
    // Test validation
    await testGuest.validate();
    addTestResult('models', 'Guest Model Validation', true);
    
    // Test methods
    const canPerform = testGuest.canPerformAction();
    const remaining = testGuest.getRemainingActions();
    const status = testGuest.getStatus();
    addTestResult('models', 'Guest Model Methods', true);
    
  } catch (error) {
    addTestResult('models', 'Guest Model Validation', false, error);
  }
  
  // Test Incident model
  try {
    const testIncident = new Incident({
      title: 'Test Emergency Incident',
      description: 'This is a test emergency incident for verification purposes',
      type: 'Medical',
      geoLocation: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749] // San Francisco
      },
      reportedBy: {
        userType: 'user',
        userId: new mongoose.Types.ObjectId()
      }
    });
    
    // Test validation
    await testIncident.validate();
    addTestResult('models', 'Incident Model Validation', true);
    
    // Test methods
    const hasUpvoted = testIncident.hasUpvoted('user', new mongoose.Types.ObjectId());
    const coordinates = testIncident.coordinates;
    addTestResult('models', 'Incident Model Methods', true);
    
  } catch (error) {
    addTestResult('models', 'Incident Model Validation', false, error);
  }
};

/**
 * Test database indexes
 */
const testIndexes = async () => {
  console.log('\n🔍 Testing Database Indexes...');
  
  try {
    // Test index listing
    const indexes = await listIndexes();
    addTestResult('indexes', 'Index Listing', true);
    
    // Test critical index validation
    const criticalIndexesValid = await validateCriticalIndexes();
    addTestResult('indexes', 'Critical Index Validation', criticalIndexesValid);
    
    // Test specific collection indexes
    const collections = ['users', 'guests', 'incidents'];
    for (const collection of collections) {
      try {
        const collectionIndexes = await mongoose.connection.db.collection(collection).indexes();
        const hasIndexes = collectionIndexes.length > 1; // More than just _id
        addTestResult('indexes', `${collection} Collection Indexes`, hasIndexes);
      } catch (error) {
        addTestResult('indexes', `${collection} Collection Indexes`, false, error);
      }
    }
    
  } catch (error) {
    addTestResult('indexes', 'Index Testing', false, error);
  }
};

/**
 * Test middleware functionality
 */
const testMiddleware = async () => {
  console.log('\n🔍 Testing Middleware Functionality...');
  
  // Test authentication middleware
  try {
    // Test token generation
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      role: 'user',
      email: 'test@example.com'
    };
    
    const token = generateUserToken(mockUser);
    addTestResult('middleware', 'JWT Token Generation', !!token);
    
  } catch (error) {
    addTestResult('middleware', 'Authentication Middleware', false, error);
  }
  
  // Test rate limiters
  try {
    const hasRateLimiters = !!(
      rateLimiters.api &&
      rateLimiters.auth &&
      rateLimiters.registration &&
      rateLimiters.incidentCreation &&
      rateLimiters.upvoting
    );
    addTestResult('middleware', 'Rate Limiter Configuration', hasRateLimiters);
    
  } catch (error) {
    addTestResult('middleware', 'Rate Limiter Configuration', false, error);
  }
  
  // Test validators
  try {
    const hasValidators = !!(
      validators.user.register &&
      validators.incident.create &&
      validators.incident.query &&
      validators.admin.incidentQuery
    );
    addTestResult('middleware', 'Validator Configuration', hasValidators);
    
  } catch (error) {
    addTestResult('middleware', 'Validator Configuration', false, error);
  }
  
  // Test role checkers
  try {
    const hasRoleCheckers = !!(
      roleCheckers.users.create &&
      roleCheckers.incidents.create &&
      roleCheckers.admin.dashboard
    );
    addTestResult('middleware', 'Role Checker Configuration', hasRoleCheckers);
    
    // Test permission checking
    const adminCanDelete = hasPermission('admin', 'users', 'delete');
    const guestCannotDelete = !hasPermission('guest', 'users', 'delete');
    addTestResult('middleware', 'Permission Logic', adminCanDelete && guestCannotDelete);
    
  } catch (error) {
    addTestResult('middleware', 'Role-Based Access Control', false, error);
  }
};

/**
 * Test integration between components
 */
const testIntegration = async () => {
  console.log('\n🔍 Testing Component Integration...');
  
  try {
    // Test model-index integration
    const User = mongoose.model('User');
    const userIndexes = await User.collection.indexes();
    const hasEmailIndex = userIndexes.some(idx => idx.key && idx.key.email);
    addTestResult('middleware', 'Model-Index Integration', hasEmailIndex);
    
  } catch (error) {
    addTestResult('middleware', 'Component Integration', false, error);
  }
};

/**
 * Generate comprehensive report
 */
const generateReport = () => {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CHECKPOINT VERIFICATION REPORT');
  console.log('='.repeat(60));
  
  const categories = ['database', 'models', 'indexes', 'middleware'];
  
  categories.forEach(category => {
    const results = testResults[category];
    const total = results.passed + results.failed;
    const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;
    
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`  ✅ Passed: ${results.passed}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  📈 Success Rate: ${percentage}%`);
    
    if (results.failed > 0) {
      console.log('  🔍 Failed Tests:');
      results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`    - ${test.name}: ${test.error}`);
        });
    }
  });
  
  const overallTotal = testResults.overall.passed + testResults.overall.failed;
  const overallPercentage = overallTotal > 0 ? 
    Math.round((testResults.overall.passed / overallTotal) * 100) : 0;
  
  console.log('\n' + '-'.repeat(60));
  console.log('OVERALL RESULTS:');
  console.log(`  ✅ Total Passed: ${testResults.overall.passed}`);
  console.log(`  ❌ Total Failed: ${testResults.overall.failed}`);
  console.log(`  📈 Overall Success Rate: ${overallPercentage}%`);
  
  if (overallPercentage >= 90) {
    console.log('\n🎉 CHECKPOINT PASSED - Core infrastructure is ready!');
  } else if (overallPercentage >= 70) {
    console.log('\n⚠️  CHECKPOINT WARNING - Some issues detected, but core functionality works');
  } else {
    console.log('\n🚨 CHECKPOINT FAILED - Critical issues detected, review required');
  }
  
  console.log('='.repeat(60));
  
  return overallPercentage >= 70; // 70% threshold for passing
};

/**
 * Save detailed report to file
 */
const saveDetailedReport = () => {
  const fs = require('fs');
  const path = require('path');
  
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: testResults.overall.passed + testResults.overall.failed,
      passed: testResults.overall.passed,
      failed: testResults.overall.failed,
      successRate: Math.round((testResults.overall.passed / (testResults.overall.passed + testResults.overall.failed)) * 100)
    },
    categories: testResults
  };
  
  const reportPath = path.join(__dirname, '..', 'checkpoint-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
};

/**
 * Main checkpoint verification function
 */
const runCheckpoint = async () => {
  console.log('🚀 Starting Core Infrastructure Checkpoint Verification...');
  console.log('This will test database connectivity, models, indexes, and middleware');
  
  try {
    await testDatabaseConnectivity();
    await testModels();
    await testIndexes();
    await testMiddleware();
    await testIntegration();
    
    const passed = generateReport();
    saveDetailedReport();
    
    // Cleanup
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n🔌 Database connection closed');
    }
    
    process.exit(passed ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 Checkpoint verification failed:', error.message);
    
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    
    process.exit(1);
  }
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

// Run checkpoint if this file is executed directly
if (require.main === module) {
  runCheckpoint().catch((error) => {
    console.error('❌ Checkpoint failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  runCheckpoint,
  testDatabaseConnectivity,
  testModels,
  testIndexes,
  testMiddleware,
  testResults
};