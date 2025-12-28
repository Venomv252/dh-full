/**
 * Property-Based Tests for User Data Completeness
 * 
 * Tests the user registration, data storage, encryption, and validation
 * Property 1: User registration data completeness
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const { userRegistrationDataArbitrary } = require('../utils/propertyGenerators');
const User = require('../../src/models/User');
const { encryptSensitiveData, decryptSensitiveData, isEncrypted } = require('../../src/utils/encryption');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../utils/testDatabase');

describe('Property Test: User Data Completeness', () => {

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  test('Property 1: User registration data completeness - All fields stored correctly', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      async (userData) => {
        // Create user with the generated data
        const user = new User(userData);
        const savedUser = await user.save();
        
        // Verify user was saved successfully
        expect(savedUser._id).toBeDefined();
        expect(savedUser.createdAt).toBeDefined();
        expect(savedUser.updatedAt).toBeDefined();
        
        // Verify basic fields are stored correctly
        expect(savedUser.email).toBe(userData.email.toLowerCase());
        expect(savedUser.dob).toEqual(userData.dob);
        expect(savedUser.gender).toBe(userData.gender);
        expect(savedUser.bloodGroup).toBe(userData.bloodGroup);
        expect(savedUser.role).toBe(userData.role || 'user');
        
        // Verify sensitive fields are encrypted
        expect(isEncrypted(savedUser.fullName)).toBe(true);
        expect(isEncrypted(savedUser.phone)).toBe(true);
        expect(isEncrypted(savedUser.address.street)).toBe(true);
        
        // Verify password is hashed (not plaintext)
        const userWithPassword = await User.findById(savedUser._id).select('+password');
        expect(userWithPassword.password).toBeDefined();
        expect(userWithPassword.password).not.toBe(userData.password);
        expect(userWithPassword.password.length).toBeGreaterThan(50); // bcrypt hash length
        
        // Verify medical conditions are encrypted if provided
        if (userData.medicalConditions && userData.medicalConditions.length > 0) {
          expect(savedUser.medicalConditions).toHaveLength(userData.medicalConditions.length);
          savedUser.medicalConditions.forEach(condition => {
            expect(isEncrypted(condition)).toBe(true);
          });
        }
        
        // Verify allergies are encrypted if provided
        if (userData.allergies && userData.allergies.length > 0) {
          expect(savedUser.allergies).toHaveLength(userData.allergies.length);
          savedUser.allergies.forEach(allergy => {
            expect(isEncrypted(allergy)).toBe(true);
          });
        }
        
        // Verify emergency contacts are stored and encrypted
        expect(savedUser.emergencyContacts).toHaveLength(userData.emergencyContacts.length);
        savedUser.emergencyContacts.forEach((contact, index) => {
          expect(isEncrypted(contact.name)).toBe(true);
          expect(isEncrypted(contact.phone)).toBe(true);
          expect(contact.relation).toBe(userData.emergencyContacts[index].relation);
        });
        
        // Verify vehicles are stored and encrypted if provided
        if (userData.vehicles && userData.vehicles.length > 0) {
          expect(savedUser.vehicles).toHaveLength(userData.vehicles.length);
          savedUser.vehicles.forEach((vehicle, index) => {
            expect(isEncrypted(vehicle.vehicleNumber)).toBe(true);
            expect(vehicle.type).toBe(userData.vehicles[index].type);
            expect(vehicle.model).toBe(userData.vehicles[index].model);
          });
        }
        
        // Verify insurance data is encrypted if provided
        if (userData.insurance) {
          expect(savedUser.insurance).toBeDefined();
          if (userData.insurance.provider) {
            expect(isEncrypted(savedUser.insurance.provider)).toBe(true);
          }
          if (userData.insurance.policyNumber) {
            expect(isEncrypted(savedUser.insurance.policyNumber)).toBe(true);
          }
          if (userData.insurance.validTill) {
            expect(savedUser.insurance.validTill).toEqual(userData.insurance.validTill);
          }
        }
        
        // Verify role-specific fields
        if (userData.role === 'police') {
          expect(savedUser.department).toBe(userData.department);
          expect(savedUser.jurisdiction).toBe(userData.jurisdiction);
          if (userData.badgeNumber) {
            expect(savedUser.badgeNumber).toBe(userData.badgeNumber);
          }
        }
        
        if (userData.role === 'hospital') {
          expect(savedUser.department).toBe(userData.department);
          expect(savedUser.licenseNumber).toBe(userData.licenseNumber);
        }
        
        // Verify default values
        expect(savedUser.isActive).toBe(true);
        expect(savedUser.isVerified).toBe(false);
        expect(savedUser.isBanned).toBe(false);
        expect(savedUser.loginCount).toBe(0);
        expect(savedUser.lastActiveAt).toBeDefined();
      }
    ), { numRuns: 50 }); // Reduced runs due to database operations
  });

  test('Property 1a: User data decryption consistency', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      async (userData) => {
        // Create and save user
        const user = new User(userData);
        const savedUser = await user.save();
        
        // Get decrypted data using the model method
        const decryptedData = savedUser.getDecryptedData();
        
        // Verify decrypted data matches original input
        expect(decryptedData.fullName).toBe(userData.fullName);
        expect(decryptedData.phone).toBe(userData.phone);
        expect(decryptedData.address.street).toBe(userData.address.street);
        
        // Verify medical data decryption
        if (userData.medicalConditions && userData.medicalConditions.length > 0) {
          expect(decryptedData.medicalConditions).toEqual(userData.medicalConditions);
        }
        
        if (userData.allergies && userData.allergies.length > 0) {
          expect(decryptedData.allergies).toEqual(userData.allergies);
        }
        
        // Verify emergency contacts decryption
        decryptedData.emergencyContacts.forEach((contact, index) => {
          expect(contact.name).toBe(userData.emergencyContacts[index].name);
          expect(contact.phone).toBe(userData.emergencyContacts[index].phone);
          expect(contact.relation).toBe(userData.emergencyContacts[index].relation);
        });
        
        // Verify vehicles decryption
        if (userData.vehicles && userData.vehicles.length > 0) {
          decryptedData.vehicles.forEach((vehicle, index) => {
            expect(vehicle.vehicleNumber).toBe(userData.vehicles[index].vehicleNumber);
            expect(vehicle.type).toBe(userData.vehicles[index].type);
            expect(vehicle.model).toBe(userData.vehicles[index].model);
          });
        }
        
        // Verify insurance decryption
        if (userData.insurance) {
          if (userData.insurance.provider) {
            expect(decryptedData.insurance.provider).toBe(userData.insurance.provider);
          }
          if (userData.insurance.policyNumber) {
            expect(decryptedData.insurance.policyNumber).toBe(userData.insurance.policyNumber);
          }
        }
      }
    ), { numRuns: 30 });
  });

  test('Property 1b: Email uniqueness enforcement', () => {
    // Feature: emergency-incident-platform, Property 2: Email uniqueness enforcement
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      userRegistrationDataArbitrary(),
      async (userData1, userData2) => {
        // Use the same email for both users
        const sharedEmail = userData1.email;
        userData2.email = sharedEmail;
        
        // Create first user
        const user1 = new User(userData1);
        const savedUser1 = await user1.save();
        expect(savedUser1.email).toBe(sharedEmail.toLowerCase());
        
        // Attempt to create second user with same email
        const user2 = new User(userData2);
        
        // This should throw a duplicate key error
        await expect(user2.save()).rejects.toThrow();
        
        // Verify only one user exists with this email
        const usersWithEmail = await User.find({ email: sharedEmail.toLowerCase() });
        expect(usersWithEmail).toHaveLength(1);
        expect(usersWithEmail[0]._id.toString()).toBe(savedUser1._id.toString());
      }
    ), { numRuns: 20 });
  });

  test('Property 1c: Password hashing and comparison', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      async (userData) => {
        const originalPassword = userData.password;
        
        // Create and save user
        const user = new User(userData);
        const savedUser = await user.save();
        
        // Verify password is hashed
        const userWithPassword = await User.findById(savedUser._id).select('+password');
        expect(userWithPassword.password).not.toBe(originalPassword);
        expect(userWithPassword.password.length).toBeGreaterThan(50);
        
        // Verify password comparison works
        const isValidPassword = await userWithPassword.comparePassword(originalPassword);
        expect(isValidPassword).toBe(true);
        
        // Verify wrong password fails
        const isInvalidPassword = await userWithPassword.comparePassword('wrongpassword');
        expect(isInvalidPassword).toBe(false);
      }
    ), { numRuns: 20 });
  });

  test('Property 1d: Role-specific field validation', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      fc.record({
        ...userRegistrationDataArbitrary().value,
        role: fc.constantFrom('police', 'hospital', 'admin')
      }),
      async (userData) => {
        // Ensure required fields are present for specific roles
        if (userData.role === 'police') {
          userData.department = userData.department || 'Police Department';
          userData.jurisdiction = userData.jurisdiction || 'City District';
          userData.badgeNumber = userData.badgeNumber || 'BADGE123';
        }
        
        if (userData.role === 'hospital') {
          userData.department = userData.department || 'Emergency Department';
          userData.licenseNumber = userData.licenseNumber || 'LIC123456';
        }
        
        // Create and save user
        const user = new User(userData);
        const savedUser = await user.save();
        
        // Verify role-specific fields are saved
        expect(savedUser.role).toBe(userData.role);
        
        if (userData.role === 'police') {
          expect(savedUser.department).toBe(userData.department);
          expect(savedUser.jurisdiction).toBe(userData.jurisdiction);
          if (userData.badgeNumber) {
            expect(savedUser.badgeNumber).toBe(userData.badgeNumber);
          }
        }
        
        if (userData.role === 'hospital') {
          expect(savedUser.department).toBe(userData.department);
          expect(savedUser.licenseNumber).toBe(userData.licenseNumber);
        }
      }
    ), { numRuns: 20 });
  });

  test('Property 1e: User model methods functionality', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      async (userData) => {
        // Create and save user
        const user = new User(userData);
        const savedUser = await user.save();
        
        // Test updateLastLogin method
        const originalLoginCount = savedUser.loginCount;
        const originalLastLogin = savedUser.lastLogin;
        
        await savedUser.updateLastLogin();
        
        expect(savedUser.loginCount).toBe(originalLoginCount + 1);
        expect(savedUser.lastLogin).toBeDefined();
        expect(savedUser.lastLogin).not.toBe(originalLastLogin);
        expect(savedUser.lastActiveAt).toBeDefined();
        
        // Test ban/unban methods
        const banReason = 'Test ban reason';
        const adminId = new mongoose.Types.ObjectId();
        
        await savedUser.banUser(banReason, adminId);
        
        expect(savedUser.isBanned).toBe(true);
        expect(savedUser.banReason).toBe(banReason);
        expect(savedUser.bannedBy.toString()).toBe(adminId.toString());
        expect(savedUser.bannedAt).toBeDefined();
        expect(savedUser.isActive).toBe(false);
        
        await savedUser.unbanUser();
        
        expect(savedUser.isBanned).toBe(false);
        expect(savedUser.banReason).toBeUndefined();
        expect(savedUser.bannedBy).toBeUndefined();
        expect(savedUser.bannedAt).toBeUndefined();
        expect(savedUser.isActive).toBe(true);
      }
    ), { numRuns: 15 });
  });

  test('Property 1f: User static methods functionality', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      fc.array(userRegistrationDataArbitrary(), { minLength: 2, maxLength: 5 }),
      async (usersData) => {
        // Create multiple users with different roles
        const users = [];
        for (let i = 0; i < usersData.length; i++) {
          const userData = usersData[i];
          // Ensure unique emails
          userData.email = `user${i}@test.com`;
          
          const user = new User(userData);
          const savedUser = await user.save();
          users.push(savedUser);
        }
        
        // Test findByEmail static method
        const testUser = users[0];
        const foundUser = await User.findByEmail(testUser.email);
        expect(foundUser).toBeDefined();
        expect(foundUser._id.toString()).toBe(testUser._id.toString());
        
        // Test findActiveByRole static method
        const userRoleUsers = await User.findActiveByRole('user');
        const actualUserRoleCount = users.filter(u => u.role === 'user').length;
        expect(userRoleUsers.length).toBe(actualUserRoleCount);
        
        // Test getUserStats static method
        const stats = await User.getUserStats();
        expect(Array.isArray(stats)).toBe(true);
        
        // Verify stats contain expected role counts
        const totalUsers = users.length;
        const statsTotal = stats.reduce((sum, stat) => sum + stat.count, 0);
        expect(statsTotal).toBe(totalUsers);
        
        // Each stat should have the expected structure
        stats.forEach(stat => {
          expect(stat).toHaveProperty('_id'); // role
          expect(stat).toHaveProperty('count');
          expect(stat).toHaveProperty('active');
          expect(stat).toHaveProperty('banned');
          expect(typeof stat.count).toBe('number');
          expect(typeof stat.active).toBe('number');
          expect(typeof stat.banned).toBe('number');
        });
      }
    ), { numRuns: 10 });
  });

  test('Property 1g: Data validation and constraints', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      async (userData) => {
        // Test age validation
        const validUser = new User(userData);
        await expect(validUser.save()).resolves.toBeDefined();
        
        // Test invalid age (too young)
        const tooYoungUser = new User({
          ...userData,
          email: 'tooyoung@test.com',
          dob: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000) // 10 years old
        });
        await expect(tooYoungUser.save()).rejects.toThrow();
        
        // Test invalid age (too old)
        const tooOldUser = new User({
          ...userData,
          email: 'tooold@test.com',
          dob: new Date(Date.now() - 150 * 365 * 24 * 60 * 60 * 1000) // 150 years old
        });
        await expect(tooOldUser.save()).rejects.toThrow();
        
        // Test invalid email format
        const invalidEmailUser = new User({
          ...userData,
          email: 'invalid-email-format'
        });
        await expect(invalidEmailUser.save()).rejects.toThrow();
        
        // Test emergency contacts validation (too many)
        const tooManyContactsUser = new User({
          ...userData,
          email: 'toomanycontacts@test.com',
          emergencyContacts: Array(10).fill().map((_, i) => ({
            name: `Contact ${i}`,
            relation: 'friend',
            phone: `123456789${i}`
          }))
        });
        await expect(tooManyContactsUser.save()).rejects.toThrow();
        
        // Test vehicles validation (too many)
        const tooManyVehiclesUser = new User({
          ...userData,
          email: 'toomanyvehicles@test.com',
          vehicles: Array(10).fill().map((_, i) => ({
            vehicleNumber: `VEH${i}`,
            type: 'car',
            model: `Model ${i}`
          }))
        });
        await expect(tooManyVehiclesUser.save()).rejects.toThrow();
      }
    ), { numRuns: 10 });
  });

});

describe('User Model Edge Cases', () => {

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  test('Property: Encryption round-trip consistency', () => {
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 1000 }),
      (originalText) => {
        // Test encryption and decryption round-trip
        const encrypted = encryptSensitiveData(originalText);
        expect(encrypted).toBeDefined();
        expect(encrypted.encrypted).toBeDefined();
        expect(encrypted.iv).toBeDefined();
        expect(encrypted.authTag).toBeDefined();
        expect(encrypted.algorithm).toBe('aes-256-gcm');
        
        const decrypted = decryptSensitiveData(encrypted);
        expect(decrypted).toBe(originalText);
        
        // Verify encrypted data is different from original
        expect(encrypted.encrypted).not.toBe(originalText);
      }
    ), { numRuns: 100 });
  });

  test('Property: Null and undefined handling', () => {
    fc.assert(fc.property(
      fc.option(fc.string()),
      (maybeString) => {
        // Test encryption handles null/undefined gracefully
        const encrypted = encryptSensitiveData(maybeString);
        
        if (maybeString === null || maybeString === undefined || maybeString === '') {
          expect(encrypted).toBeNull();
        } else {
          expect(encrypted).toBeDefined();
          expect(encrypted.encrypted).toBeDefined();
          
          const decrypted = decryptSensitiveData(encrypted);
          expect(decrypted).toBe(maybeString);
        }
      }
    ), { numRuns: 50 });
  });

});