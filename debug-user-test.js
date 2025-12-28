/**
 * Debug User Model Test
 * Simple test to understand what's failing in User model validation
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

const User = require('./src/models/User');

async function debugUserCreation() {
  // Start in-memory MongoDB instance
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: 'debug-test'
    }
  });
  
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
  
  console.log('✅ Debug database connected');

  // Test data that should be valid
  const testUserData = {
    fullName: "AA",  // This was failing in property test
    dob: new Date("1970-01-01"),
    gender: "male",
    email: "user1000@example.com",
    phone: "+11000000000",
    address: {
      street: "A   A",  // This was failing in property test
      city: "AA",
      state: "AA",
      pincode: "100000"
    }
  };

  try {
    console.log('Creating user with data:', JSON.stringify(testUserData, null, 2));
    
    const user = new User(testUserData);
    console.log('User model created, attempting to save...');
    
    const savedUser = await user.save();
    console.log('✅ User saved successfully!');
    console.log('Saved user ID:', savedUser._id);
    
    // Test decryption
    const decryptedData = savedUser.getDecryptedData();
    console.log('Decrypted data:', JSON.stringify(decryptedData, null, 2));
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message);
    console.error('Error details:', error);
    
    if (error.errors) {
      console.error('Validation errors:');
      Object.keys(error.errors).forEach(key => {
        console.error(`  ${key}: ${error.errors[key].message}`);
      });
    }
  }

  // Clean up
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
  
  console.log('✅ Debug database disconnected');
}

debugUserCreation().catch(console.error);