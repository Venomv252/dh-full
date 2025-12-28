/**
 * Property Test: User Email Uniqueness Constraint
 * 
 * Tests Property 4: Email uniqueness constraint
 * Validates Requirement 1.4
 * 
 * This test ensures that:
 * - Email addresses are unique across all users (Requirement 1.4)
 * - Duplicate email registration attempts are rejected
 * - Email uniqueness is enforced at both application and database level
 */

const fc = require('fast-check');
const User = require('../../src/models/User');
const { ERROR_CODES } = require('../../src/config/constants');

describe('Property Test: User Email Uniqueness Constraint', () => {

  /**
   * Helper function to generate valid user data
   */
  const generateValidUserData = () => fc.record({
    fullName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 10, maxLength: 10 }).map(s => '+1' + s.replace(/\D/g, '').padEnd(10, '0').slice(0, 10)),
    dob: fc.date({ min: new Date('1940-01-01'), max: new Date('2005-01-01') }),
    gender: fc.constantFrom('male', 'female', 'other'),
    address: fc.record({
      street: fc.string({ minLength: 5, maxLength: 100 }).filter(s => s.trim().length >= 5),
      city: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
      state: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
      pincode: fc.string({ minLength: 4, maxLength: 6 }).map(s => s.replace(/\D/g, '').padEnd(6, '0').slice(0, 6)).filter(s => s.length >= 4)
    })
  });

  /**
   * Main Property Test: Email uniqueness constraint
   * 
   * This test validates that email addresses must be unique across all users
   * and that duplicate email registration attempts are properly rejected.
   */
  test('Property 4: Email uniqueness constraint is enforced', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          users: fc.array(generateValidUserData(), { minLength: 2, maxLength: 5 }),
          duplicateAttempts: fc.integer({ min: 1, max: 3 })
        }),
        
        async ({ users, duplicateAttempts }) => {
          // Normalize emails to lowercase (as the model does)
          const normalizedUsers = users.map(user => ({
            ...user,
            email: user.email.toLowerCase()
          }));
          
          // Create first user successfully
          const firstUser = normalizedUsers[0];
          const savedUser = await User.create(firstUser);
          
          expect(savedUser).toBeTruthy();
          expect(savedUser.email).toBe(firstUser.email);
          expect(savedUser._id).toBeTruthy();
          
          // Attempt to create users with the same email
          const duplicateEmail = firstUser.email;
          
          for (let i = 0; i < duplicateAttempts; i++) {
            const duplicateUserData = {
              ...normalizedUsers[Math.min(i + 1, normalizedUsers.length - 1)],
              email: duplicateEmail // Use the same email
            };
            
            // This should fail due to email uniqueness constraint
            await expect(User.create(duplicateUserData))
              .rejects
              .toThrow(/Email already exists|duplicate key|E11000/i);
          }
          
          // Verify only one user exists with that email
          const usersWithEmail = await User.find({ email: duplicateEmail });
          expect(usersWithEmail).toHaveLength(1);
          expect(usersWithEmail[0]._id.toString()).toBe(savedUser._id.toString());
          
          // Test that different emails can be created successfully
          if (normalizedUsers.length > 1) {
            const secondUser = normalizedUsers[1];
            if (secondUser.email !== duplicateEmail) {
              const secondSavedUser = await User.create(secondUser);
              expect(secondSavedUser).toBeTruthy();
              expect(secondSavedUser.email).toBe(secondUser.email);
              expect(secondSavedUser._id.toString()).not.toBe(savedUser._id.toString());
            }
          }
        }
      ),
      { 
        numRuns: 30,
        timeout: 15000,
        verbose: process.env.NODE_ENV === 'test'
      }
    );
  });

  /**
   * Property Test: Email case insensitivity
   * 
   * Tests that email uniqueness is case-insensitive
   */
  test('Property 4a: Email uniqueness is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateValidUserData(),
        
        async ({ fullName, email, phone, dob, gender, address }) => {
          const lowerEmail = email.toLowerCase();
          const upperEmail = email.toUpperCase();
          const mixedEmail = email.split('').map((char, i) => 
            i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
          ).join('');
          
          const baseUserData = {
            fullName,
            phone,
            dob,
            gender,
            address
          };
          
          // Create user with lowercase email
          const firstUser = await User.create({
            ...baseUserData,
            email: lowerEmail
          });
          
          expect(firstUser.email).toBe(lowerEmail);
          
          // Attempt to create user with uppercase version of same email
          await expect(User.create({
            ...baseUserData,
            fullName: fullName + '2', // Different name to avoid other conflicts
            phone: phone.replace(/\d$/, '9'), // Different phone
            email: upperEmail
          })).rejects.toThrow(/Email already exists|duplicate key|E11000/i);
          
          // Attempt to create user with mixed case version of same email
          await expect(User.create({
            ...baseUserData,
            fullName: fullName + '3', // Different name to avoid other conflicts
            phone: phone.replace(/\d$/, '8'), // Different phone
            email: mixedEmail
          })).rejects.toThrow(/Email already exists|duplicate key|E11000/i);
          
          // Verify only one user exists with that email
          const usersWithEmail = await User.find({ email: lowerEmail });
          expect(usersWithEmail).toHaveLength(1);
          expect(usersWithEmail[0]._id.toString()).toBe(firstUser._id.toString());
        }
      ),
      { 
        numRuns: 20,
        timeout: 10000
      }
    );
  });

  /**
   * Property Test: Email uniqueness with whitespace handling
   * 
   * Tests that email uniqueness handles whitespace correctly
   */
  test('Property 4b: Email uniqueness handles whitespace correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateValidUserData(),
        
        async ({ fullName, email, phone, dob, gender, address }) => {
          const cleanEmail = email.toLowerCase().trim();
          const emailWithSpaces = `  ${cleanEmail}  `;
          const emailWithTabs = `\t${cleanEmail}\t`;
          
          const baseUserData = {
            fullName,
            phone,
            dob,
            gender,
            address
          };
          
          // Create user with clean email
          const firstUser = await User.create({
            ...baseUserData,
            email: cleanEmail
          });
          
          expect(firstUser.email).toBe(cleanEmail);
          
          // Attempt to create user with email that has leading/trailing spaces
          await expect(User.create({
            ...baseUserData,
            fullName: fullName + '2',
            phone: phone.replace(/\d$/, '9'),
            email: emailWithSpaces
          })).rejects.toThrow(/Email already exists|duplicate key|E11000/i);
          
          // Attempt to create user with email that has tabs
          await expect(User.create({
            ...baseUserData,
            fullName: fullName + '3',
            phone: phone.replace(/\d$/, '8'),
            email: emailWithTabs
          })).rejects.toThrow(/Email already exists|duplicate key|E11000/i);
          
          // Verify only one user exists
          const usersWithEmail = await User.find({ email: cleanEmail });
          expect(usersWithEmail).toHaveLength(1);
          expect(usersWithEmail[0]._id.toString()).toBe(firstUser._id.toString());
        }
      ),
      { 
        numRuns: 15,
        timeout: 8000
      }
    );
  });

  /**
   * Property Test: Email uniqueness during updates
   * 
   * Tests that email uniqueness is enforced during user updates
   */
  test('Property 4c: Email uniqueness enforced during updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        
        async (randomId) => {
          // Create controlled, valid user data
          const user1Data = {
            fullName: `Test User One ${randomId}`,
            email: `user1_${randomId}@test.com`,
            phone: `+1555${String(randomId).padStart(7, '0')}`,
            dob: new Date('1990-01-01'),
            gender: 'male',
            address: {
              street: `${randomId} Test Street`,
              city: 'Test City',
              state: 'Test State',
              pincode: '123456'
            }
          };
          
          const user2Data = {
            fullName: `Test User Two ${randomId}`,
            email: `user2_${randomId}@test.com`,
            phone: `+1666${String(randomId).padStart(7, '0')}`,
            dob: new Date('1991-01-01'),
            gender: 'female',
            address: {
              street: `${randomId + 1000} Test Street`,
              city: 'Test City',
              state: 'Test State',
              pincode: '123456'
            }
          };
          
          // Create two users with different emails
          const user1 = await User.create(user1Data);
          const user2 = await User.create(user2Data);
          
          expect(user1.email).toBe(user1Data.email);
          expect(user2.email).toBe(user2Data.email);
          
          // Attempt to update user2's email to user1's email (should fail)
          user2.email = user1.email;
          
          await expect(user2.save()).rejects.toThrow(/Email already exists|duplicate key|E11000/i);
          
          // Verify user2's email wasn't changed by refetching from database
          const unchangedUser2 = await User.findById(user2._id);
          expect(unchangedUser2.email).toBe(user2Data.email);
          
          // Verify user1's email is still unique to them
          const usersWithUser1Email = await User.find({ email: user1.email });
          expect(usersWithUser1Email).toHaveLength(1);
          expect(usersWithUser1Email[0]._id.toString()).toBe(user1._id.toString());
        }
      ),
      { 
        numRuns: 10,
        timeout: 8000
      }
    );
  });

  /**
   * Property Test: Email uniqueness with concurrent operations
   * 
   * Tests email uniqueness under concurrent user creation attempts
   */
  test('Property 4d: Email uniqueness under concurrent operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          baseEmail: fc.emailAddress(),
          concurrentAttempts: fc.integer({ min: 2, max: 5 }),
          userData: fc.array(generateValidUserData(), { minLength: 2, maxLength: 5 })
        }),
        
        async ({ baseEmail, concurrentAttempts, userData }) => {
          const email = baseEmail.toLowerCase();
          
          // Create concurrent user creation attempts with the same email
          const creationPromises = [];
          
          for (let i = 0; i < Math.min(concurrentAttempts, userData.length); i++) {
            const userDataWithEmail = {
              ...userData[i],
              email: email,
              phone: userData[i].phone.replace(/\d$/, i.toString()), // Ensure unique phones
              fullName: userData[i].fullName + '_' + i // Ensure unique names
            };
            
            creationPromises.push(
              User.create(userDataWithEmail).catch(error => ({ error: error.message }))
            );
          }
          
          // Wait for all attempts to complete
          const results = await Promise.all(creationPromises);
          
          // Count successful and failed attempts
          const successful = results.filter(result => !result.error);
          const failed = results.filter(result => result.error);
          
          // Only one should succeed
          expect(successful).toHaveLength(1);
          expect(failed.length).toBeGreaterThan(0);
          
          // Verify only one user exists with that email
          const usersWithEmail = await User.find({ email: email });
          expect(usersWithEmail).toHaveLength(1);
          
          // Verify the successful user has the correct email
          expect(usersWithEmail[0].email).toBe(email);
        }
      ),
      { 
        numRuns: 15,
        timeout: 15000
      }
    );
  });

});