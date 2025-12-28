/**
 * Simple Property Test
 * Minimal test to understand the issue
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

const User = require('./src/models/User');

async function simplePropertyTest() {
  // Start in-memory MongoDB instance
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'simple-property-test'
    }
  });
  
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  console.log('✅ Simple property test database connected');

  try {
    await fc.assert(
      fc.asyncProperty(
        // Very simple generator
        fc.record({
          fullName: fc.constant("John Doe"),
          dob: fc.constant(new Date("1990-01-01")),
          gender: fc.constant("male"),
          email: fc.integer({ min: 1000, max: 999999 }).map(n => `user${n}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`),
          phone: fc.constant("+11234567890"),
          address: fc.constant({
            street: "123 Main Street",
            city: "New York",
            state: "NY",
            pincode: "100001"
          })
        }),
        
        async (userData) => {
          console.log('Simple test - Testing with data:', JSON.stringify(userData, null, 2));
          
          try {
            // Create user with the generated data
            const user = new User(userData);
            const savedUser = await user.save();
            
            console.log('Simple test - ✅ User saved successfully with ID:', savedUser._id);
            
            // Verify the user was saved correctly
            const retrievedUser = await User.findById(savedUser._id);
            if (!retrievedUser) {
              console.error('Simple test - ❌ User not found after save');
              return false;
            }
            
            const decryptedData = retrievedUser.getDecryptedData();
            if (decryptedData.fullName !== userData.fullName) {
              console.error('Simple test - ❌ Full name mismatch');
              return false;
            }
            
            if (decryptedData.email !== userData.email.toLowerCase()) {
              console.error('Simple test - ❌ Email mismatch');
              return false;
            }
            
            console.log('Simple test - ✅ All assertions passed');
            return true;
            
          } catch (error) {
            console.error('Simple test - ❌ Error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 3,
        timeout: 30000,
        verbose: true
      }
    );
    
    console.log('✅ Simple property test passed!');
    
  } catch (error) {
    console.error('❌ Simple property test failed:', error.message);
  }

  // Clean up
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  
  console.log('✅ Simple property test database disconnected');
}

simplePropertyTest().catch(console.error);