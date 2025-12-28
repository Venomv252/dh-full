/**
 * Debug Jest Property Test
 * Test property testing in Jest environment
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const User = require('./src/models/User');

describe('Debug Jest Property Test', () => {
  afterEach(async () => {
    // Clear all collections after each test
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  test('Simple property test in Jest', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Simple generator
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
            console.log('Jest test - Testing with data:', JSON.stringify(userData, null, 2));
            
            // Create user with the generated data
            const user = new User(userData);
            const savedUser = await user.save();
            
            console.log('Jest test - ✅ User saved successfully with ID:', savedUser._id);
            
            // Verify the user was saved correctly
            const retrievedUser = await User.findById(savedUser._id);
            expect(retrievedUser).toBeTruthy();
            
            const decryptedData = retrievedUser.getDecryptedData();
            expect(decryptedData.fullName).toBe(userData.fullName);
            expect(decryptedData.email).toBe(userData.email.toLowerCase());
            
            return true;
          } catch (error) {
            console.error('Jest test - ❌ Property test error:', error.message);
            console.error('Jest test - User data that failed:', JSON.stringify(userData, null, 2));
            
            if (error.errors) {
              console.error('Jest test - Validation errors:');
              Object.keys(error.errors).forEach(key => {
                console.error(`  ${key}: ${error.errors[key].message}`);
              });
            }
            
            return false;
          }
        }
      ),
      { 
        numRuns: 3, // Just a few runs for debugging
        timeout: 30000,
        verbose: true
      }
    );
  }, 35000);
});