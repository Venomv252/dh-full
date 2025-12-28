/**
 * Debug Property Test
 * Simple property test to understand what's failing
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

const User = require('./src/models/User');

async function debugPropertyTest() {
  // Start in-memory MongoDB instance
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'debug-property-test'
    }
  });
  
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  console.log('✅ Debug property test database connected');

  try {
    await fc.assert(
      fc.asyncProperty(
        // Simple generator for debugging
        fc.record({
          fullName: fc.string({ minLength: 2, maxLength: 50 })
            .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim())
            .filter(s => s.length >= 2 && s.length <= 50 && /^[a-zA-Z\s]+$/.test(s)),
          dob: fc.date({ min: new Date('1940-01-01'), max: new Date('2005-12-31') }),
          gender: fc.constantFrom('male', 'female', 'other'),
          email: fc.integer({ min: 1000, max: 999999 }).map(n => `user${n}@example.com`),
          phone: fc.integer({ min: 1000000000, max: 9999999999 }).map(n => `+1${n}`),
          address: fc.record({
            street: fc.string({ minLength: 5, maxLength: 100 })
              .map(s => s.replace(/[^a-zA-Z0-9\s,.-]/g, 'A').trim())
              .filter(s => s.length >= 5 && s.length <= 100 && /[a-zA-Z0-9]/.test(s)),
            city: fc.string({ minLength: 2, maxLength: 50 })
              .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim())
              .filter(s => s.length >= 2 && s.length <= 50 && /^[a-zA-Z\s]+$/.test(s)),
            state: fc.string({ minLength: 2, maxLength: 50 })
              .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim())
              .filter(s => s.length >= 2 && s.length <= 50 && /^[a-zA-Z\s]+$/.test(s)),
            pincode: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
          })
        }),
        
        async (userData) => {
          try {
            console.log('Testing with data:', JSON.stringify(userData, null, 2));
            
            // Create user with the generated data
            const user = new User(userData);
            const savedUser = await user.save();
            
            console.log('✅ User saved successfully with ID:', savedUser._id);
            
            // Clear the user for next test
            await User.deleteOne({ _id: savedUser._id });
            
            return true;
          } catch (error) {
            console.error('❌ Property test error:', error.message);
            console.error('User data that failed:', JSON.stringify(userData, null, 2));
            
            if (error.errors) {
              console.error('Validation errors:');
              Object.keys(error.errors).forEach(key => {
                console.error(`  ${key}: ${error.errors[key].message}`);
              });
            }
            
            return false;
          }
        }
      ),
      { 
        numRuns: 5, // Just a few runs for debugging
        timeout: 30000,
        verbose: true
      }
    );
    
    console.log('✅ Property test passed!');
    
  } catch (error) {
    console.error('❌ Property test failed:', error.message);
  }

  // Clean up
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  
  console.log('✅ Debug property test database disconnected');
}

debugPropertyTest().catch(console.error);