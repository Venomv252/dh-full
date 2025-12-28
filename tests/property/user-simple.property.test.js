/**
 * Property-Based Tests for User Data Completeness (Simplified)
 * 
 * Tests the user data validation, encryption, and model functionality
 * Property 1: User registration data completeness
 */

const fc = require('fast-check');
const { userRegistrationDataArbitrary } = require('../utils/propertyGenerators');
const User = require('../../src/models/User');
const { encryptSensitiveData, decryptSensitiveData, isEncrypted } = require('../../src/utils/encryption');

describe('Property Test: User Data Completeness (Simplified)', () => {

  test('Property 1: User registration data completeness - Model validation', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      (userData) => {
        // Create user instance (without saving to database)
        const user = new User(userData);
        
        // Verify basic fields are set correctly
        expect(user.email).toBe(userData.email.toLowerCase());
        expect(user.dob).toEqual(userData.dob);
        expect(user.gender).toBe(userData.gender);
        expect(user.bloodGroup).toBe(userData.bloodGroup);
        expect(user.role).toBe(userData.role || 'user');
        
        // Verify address structure
        expect(user.address).toBeDefined();
        expect(user.address.city).toBe(userData.address.city);
        expect(user.address.state).toBe(userData.address.state);
        expect(user.address.pincode).toBe(userData.address.pincode);
        
        // Verify emergency contacts structure
        expect(user.emergencyContacts).toHaveLength(userData.emergencyContacts.length);
        user.emergencyContacts.forEach((contact, index) => {
          expect(contact.relation).toBe(userData.emergencyContacts[index].relation);
        });
        
        // Verify vehicles structure if provided
        if (userData.vehicles && userData.vehicles.length > 0) {
          expect(user.vehicles).toHaveLength(userData.vehicles.length);
          user.vehicles.forEach((vehicle, index) => {
            expect(vehicle.type).toBe(userData.vehicles[index].type);
            expect(vehicle.model).toBe(userData.vehicles[index].model);
          });
        }
        
        // Verify insurance structure if provided
        if (userData.insurance) {
          expect(user.insurance).toBeDefined();
          if (userData.insurance.validTill) {
            expect(user.insurance.validTill).toEqual(userData.insurance.validTill);
          }
        }
        
        // Verify role-specific fields
        if (userData.role === 'police') {
          expect(user.department).toBe(userData.department);
          expect(user.jurisdiction).toBe(userData.jurisdiction);
        }
        
        if (userData.role === 'hospital') {
          expect(user.department).toBe(userData.department);
          expect(user.licenseNumber).toBe(userData.licenseNumber);
        }
        
        // Verify default values
        expect(user.isActive).toBe(true);
        expect(user.isVerified).toBe(false);
        expect(user.isBanned).toBe(false);
        expect(user.loginCount).toBe(0);
      }
    ), { numRuns: 100 });
  });

  test('Property 1a: User model validation rules', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      (userData) => {
        // Test valid user data
        const user = new User(userData);
        const validationError = user.validateSync();
        
        // Should not have validation errors for valid data
        if (validationError) {
          // Log the specific validation errors for debugging
          console.log('Validation errors:', validationError.errors);
        }
        expect(validationError).toBeNull();
        
        // Test age calculation virtual
        if (user.dob) {
          const age = user.age;
          expect(typeof age).toBe('number');
          expect(age).toBeGreaterThanOrEqual(13);
          expect(age).toBeLessThanOrEqual(120);
        }
        
        // Test full address virtual
        if (user.address) {
          const fullAddress = user.fullAddress;
          expect(typeof fullAddress).toBe('string');
          expect(fullAddress).toContain(user.address.city);
          expect(fullAddress).toContain(user.address.state);
          expect(fullAddress).toContain(user.address.pincode);
        }
      }
    ), { numRuns: 50 });
  });

  test('Property 1b: Email validation consistency', () => {
    // Feature: emergency-incident-platform, Property 2: Email uniqueness enforcement
    fc.assert(fc.property(
      fc.record({
        ...userRegistrationDataArbitrary().value,
        email: fc.oneof(
          fc.emailAddress(), // Valid emails
          fc.string({ minLength: 1, maxLength: 50 }), // Invalid emails
          fc.constant('invalid-email'),
          fc.constant('test@'),
          fc.constant('@test.com'),
          fc.constant('test..test@test.com')
        )
      }),
      (userData) => {
        const user = new User(userData);
        const validationError = user.validateSync();
        
        // Check if email is valid format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = emailRegex.test(userData.email);
        
        if (isValidEmail) {
          // Valid email should not cause validation error for email field
          if (validationError && validationError.errors.email) {
            expect(validationError.errors.email).toBeUndefined();
          }
          expect(user.email).toBe(userData.email.toLowerCase());
        } else {
          // Invalid email should cause validation error
          expect(validationError).toBeDefined();
          expect(validationError.errors.email).toBeDefined();
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 1c: Role-specific field requirements', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      fc.record({
        ...userRegistrationDataArbitrary().value,
        role: fc.constantFrom('user', 'police', 'hospital', 'admin'),
        department: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        jurisdiction: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
        licenseNumber: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        badgeNumber: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
      }),
      (userData) => {
        const user = new User(userData);
        const validationError = user.validateSync();
        
        // Check role-specific field requirements
        if (userData.role === 'police') {
          if (!userData.department || !userData.jurisdiction) {
            expect(validationError).toBeDefined();
            if (!userData.department) {
              expect(validationError.errors.department).toBeDefined();
            }
            if (!userData.jurisdiction) {
              expect(validationError.errors.jurisdiction).toBeDefined();
            }
          } else {
            // Should not have errors for these fields if provided
            if (validationError) {
              expect(validationError.errors.department).toBeUndefined();
              expect(validationError.errors.jurisdiction).toBeUndefined();
            }
          }
        }
        
        if (userData.role === 'hospital') {
          if (!userData.department || !userData.licenseNumber) {
            expect(validationError).toBeDefined();
            if (!userData.department) {
              expect(validationError.errors.department).toBeDefined();
            }
            if (!userData.licenseNumber) {
              expect(validationError.errors.licenseNumber).toBeDefined();
            }
          } else {
            // Should not have errors for these fields if provided
            if (validationError) {
              expect(validationError.errors.department).toBeUndefined();
              expect(validationError.errors.licenseNumber).toBeUndefined();
            }
          }
        }
        
        if (userData.role === 'user' || userData.role === 'admin') {
          // These roles don't require department/jurisdiction/license
          if (validationError) {
            expect(validationError.errors.department).toBeUndefined();
            expect(validationError.errors.jurisdiction).toBeUndefined();
            expect(validationError.errors.licenseNumber).toBeUndefined();
          }
        }
      }
    ), { numRuns: 50 });
  });

  test('Property 1d: Emergency contacts validation', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      fc.record({
        ...userRegistrationDataArbitrary().value,
        emergencyContacts: fc.oneof(
          fc.array(fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            relation: fc.constantFrom('spouse', 'parent', 'sibling', 'child', 'friend', 'colleague', 'other'),
            phone: fc.string({ minLength: 10, maxLength: 15 })
          }), { minLength: 1, maxLength: 5 }), // Valid range
          fc.array(fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            relation: fc.constantFrom('spouse', 'parent', 'sibling', 'child', 'friend', 'colleague', 'other'),
            phone: fc.string({ minLength: 10, maxLength: 15 })
          }), { minLength: 6, maxLength: 10 }), // Too many contacts
          fc.constant([]) // No contacts
        )
      }),
      (userData) => {
        const user = new User(userData);
        const validationError = user.validateSync();
        
        const contactCount = userData.emergencyContacts.length;
        
        if (contactCount >= 1 && contactCount <= 5) {
          // Valid number of contacts
          if (validationError && validationError.errors.emergencyContacts) {
            // Should not have validation error for contact count
            expect(validationError.errors.emergencyContacts.message).not.toContain('between 1 and 5');
          }
        } else {
          // Invalid number of contacts
          expect(validationError).toBeDefined();
          expect(validationError.errors.emergencyContacts).toBeDefined();
          expect(validationError.errors.emergencyContacts.message).toContain('between 1 and 5');
        }
      }
    ), { numRuns: 50 });
  });

  test('Property 1e: Vehicles validation', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      fc.record({
        ...userRegistrationDataArbitrary().value,
        vehicles: fc.oneof(
          fc.array(fc.record({
            vehicleNumber: fc.string({ minLength: 1, maxLength: 15 }),
            type: fc.constantFrom('car', 'motorcycle', 'truck', 'bicycle', 'bus', 'van', 'other'),
            model: fc.string({ minLength: 1, maxLength: 100 })
          }), { minLength: 0, maxLength: 5 }), // Valid range
          fc.array(fc.record({
            vehicleNumber: fc.string({ minLength: 1, maxLength: 15 }),
            type: fc.constantFrom('car', 'motorcycle', 'truck', 'bicycle', 'bus', 'van', 'other'),
            model: fc.string({ minLength: 1, maxLength: 100 })
          }), { minLength: 6, maxLength: 10 }) // Too many vehicles
        )
      }),
      (userData) => {
        const user = new User(userData);
        const validationError = user.validateSync();
        
        const vehicleCount = userData.vehicles.length;
        
        if (vehicleCount <= 5) {
          // Valid number of vehicles
          if (validationError && validationError.errors.vehicles) {
            expect(validationError.errors.vehicles.message).not.toContain('more than 5');
          }
        } else {
          // Too many vehicles
          expect(validationError).toBeDefined();
          expect(validationError.errors.vehicles).toBeDefined();
          expect(validationError.errors.vehicles.message).toContain('more than 5');
        }
      }
    ), { numRuns: 50 });
  });

});

describe('Encryption Property Tests', () => {

  test('Property 17: Data encryption consistency - Round trip', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
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
        
        // Verify encrypted data is different from original
        expect(encrypted.encrypted).not.toBe(originalText);
        
        // Test decryption
        const decrypted = decryptSensitiveData(encrypted);
        expect(decrypted).toBe(originalText);
        
        // Test isEncrypted function
        expect(isEncrypted(encrypted)).toBe(true);
        expect(isEncrypted(originalText)).toBe(false);
        expect(isEncrypted(null)).toBe(false);
        expect(isEncrypted(undefined)).toBe(false);
      }
    ), { numRuns: 100 });
  });

  test('Property 17a: Encryption null/undefined handling', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
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
        
        // Test decryption with invalid data
        expect(decryptSensitiveData(null)).toBeNull();
        expect(decryptSensitiveData(undefined)).toBeNull();
        expect(decryptSensitiveData('invalid')).toBeNull();
        expect(decryptSensitiveData({})).toBeNull();
      }
    ), { numRuns: 50 });
  });

  test('Property 17b: Encryption uniqueness', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (text) => {
        // Same text should produce different encrypted results due to random IV
        const encrypted1 = encryptSensitiveData(text);
        const encrypted2 = encryptSensitiveData(text);
        
        expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
        expect(encrypted1.iv).not.toBe(encrypted2.iv);
        
        // But both should decrypt to the same original text
        expect(decryptSensitiveData(encrypted1)).toBe(text);
        expect(decryptSensitiveData(encrypted2)).toBe(text);
      }
    ), { numRuns: 50 });
  });

  test('Property 17c: Encryption error handling', () => {
    // Feature: emergency-incident-platform, Property 17: Data encryption consistency
    fc.assert(fc.property(
      fc.record({
        encrypted: fc.option(fc.string()),
        iv: fc.option(fc.string()),
        authTag: fc.option(fc.string()),
        algorithm: fc.option(fc.string())
      }),
      (invalidEncryptedData) => {
        // Test decryption with invalid/incomplete data
        try {
          const result = decryptSensitiveData(invalidEncryptedData);
          
          // If any required field is missing, should return null
          if (!invalidEncryptedData.encrypted || !invalidEncryptedData.iv || !invalidEncryptedData.authTag) {
            expect(result).toBeNull();
          }
        } catch (error) {
          // Decryption should handle errors gracefully
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain('Failed to decrypt data');
        }
      }
    ), { numRuns: 50 });
  });

});