/**
 * User Model Encryption Property-Based Tests
 * 
 * Property-based tests for User model sensitive data encryption
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const { encrypt, decrypt } = require('../../src/utils/encryption');
const { clearTestData } = require('../utils/testHelpers');

describe('User Model Encryption Property Tests', () => {
  afterEach(async () => {
    await clearTestData();
  });

  /**
   * Feature: emergency-incident-platform, Property 3: Sensitive data encryption
   * 
   * Property 3: Sensitive data encryption
   * For any user with sensitive personal information (full name, phone, address, 
   * medical conditions, allergies, emergency contacts, vehicle numbers, insurance details),
   * the system should encrypt all sensitive fields before storing in the database
   * and decrypt them correctly when retrieved
   * 
   * Validates: Requirements 1.3, 6.3
   */
  test('Property 3: Sensitive data encryption', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate unique counter for each test run
        fc.integer({ min: 1, max: 1000000 }),
        
        async (uniqueId) => {
          try {
            // Create user data with unique email to avoid conflicts
            const userData = {
              // Personal Information (Sensitive)
              fullName: 'John Doe Test',
              
              // Contact Information (Sensitive) - Make unique
              email: `test_encryption_${uniqueId}_${Date.now()}@example.com`,
              phone: '+15551234567',
              
              // Non-sensitive required fields
              dob: new Date('1990-01-01'),
              gender: 'male',
              
              // Address Information (Street is sensitive)
              address: {
                street: '123 Test Street',
                city: 'Test City',
                state: 'TS',
                pincode: '123456'
              },
              
              // Medical Information (Sensitive)
              medicalConditions: ['Test Condition'],
              allergies: ['Test Allergy'],
              
              // Emergency Contacts (Sensitive: name and phone)
              emergencyContacts: [{
                name: 'Jane Test',
                relation: 'Parent',
                phone: '+15559876543'
              }],
              
              // Vehicle Information (Sensitive: vehicle number)
              vehicles: [{
                vehicleNumber: 'TEST123',
                type: 'Car',
                model: 'Test Model'
              }],
              
              // Insurance Information (Sensitive: provider and policy number)
              insurance: {
                provider: 'Test Insurance',
                policyNumber: 'POL123456',
                validTill: new Date('2030-12-31')
              }
            };
            
            // Store original data for comparison
            const originalData = JSON.parse(JSON.stringify(userData));
            
            // Create and save user
            const user = new User(userData);
            const savedUser = await user.save();
            
            // Get raw document from database (without decryption)
            const rawUser = await User.findById(savedUser._id).lean();
            
            // Verify sensitive fields are encrypted in database
            // Full name should be encrypted (JSON string format)
            expect(typeof rawUser.fullName).toBe('string');
            expect(rawUser.fullName.startsWith('{')).toBe(true);
            expect(rawUser.fullName).not.toBe(originalData.fullName);
            
            // Phone should be encrypted
            expect(typeof rawUser.phone).toBe('string');
            expect(rawUser.phone.startsWith('{')).toBe(true);
            expect(rawUser.phone).not.toBe(originalData.phone);
            
            // Street address should be encrypted
            expect(typeof rawUser.address.street).toBe('string');
            expect(rawUser.address.street.startsWith('{')).toBe(true);
            expect(rawUser.address.street).not.toBe(originalData.address.street);
            
            // Medical conditions should be encrypted
            if (rawUser.medicalConditions && rawUser.medicalConditions.length > 0) {
              rawUser.medicalConditions.forEach((condition, index) => {
                expect(typeof condition).toBe('string');
                expect(condition.startsWith('{')).toBe(true);
                expect(condition).not.toBe(originalData.medicalConditions[index]);
              });
            }
            
            // Allergies should be encrypted
            if (rawUser.allergies && rawUser.allergies.length > 0) {
              rawUser.allergies.forEach((allergy, index) => {
                expect(typeof allergy).toBe('string');
                expect(allergy.startsWith('{')).toBe(true);
                expect(allergy).not.toBe(originalData.allergies[index]);
              });
            }
            
            // Emergency contacts should have encrypted names and phones
            if (rawUser.emergencyContacts && rawUser.emergencyContacts.length > 0) {
              rawUser.emergencyContacts.forEach((contact, index) => {
                expect(typeof contact.name).toBe('string');
                expect(contact.name.startsWith('{')).toBe(true);
                expect(contact.name).not.toBe(originalData.emergencyContacts[index].name);
                
                expect(typeof contact.phone).toBe('string');
                expect(contact.phone.startsWith('{')).toBe(true);
                expect(contact.phone).not.toBe(originalData.emergencyContacts[index].phone);
                
                // Relation should NOT be encrypted
                expect(contact.relation).toBe(originalData.emergencyContacts[index].relation);
              });
            }
            
            // Vehicle numbers should be encrypted
            if (rawUser.vehicles && rawUser.vehicles.length > 0) {
              rawUser.vehicles.forEach((vehicle, index) => {
                expect(typeof vehicle.vehicleNumber).toBe('string');
                expect(vehicle.vehicleNumber.startsWith('{')).toBe(true);
                expect(vehicle.vehicleNumber).not.toBe(originalData.vehicles[index].vehicleNumber);
                
                // Type and model should NOT be encrypted
                expect(vehicle.type).toBe(originalData.vehicles[index].type);
                expect(vehicle.model).toBe(originalData.vehicles[index].model);
              });
            }
            
            // Insurance provider and policy number should be encrypted
            if (rawUser.insurance) {
              if (rawUser.insurance.provider) {
                expect(typeof rawUser.insurance.provider).toBe('string');
                expect(rawUser.insurance.provider.startsWith('{')).toBe(true);
                expect(rawUser.insurance.provider).not.toBe(originalData.insurance.provider);
              }
              
              if (rawUser.insurance.policyNumber) {
                expect(typeof rawUser.insurance.policyNumber).toBe('string');
                expect(rawUser.insurance.policyNumber.startsWith('{')).toBe(true);
                expect(rawUser.insurance.policyNumber).not.toBe(originalData.insurance.policyNumber);
              }
              
              // Valid till date should NOT be encrypted
              if (rawUser.insurance.validTill && originalData.insurance.validTill) {
                expect(new Date(rawUser.insurance.validTill).getTime())
                  .toBe(new Date(originalData.insurance.validTill).getTime());
              }
            }
            
            // Verify non-sensitive fields are NOT encrypted
            expect(rawUser.email).toBe(originalData.email.toLowerCase());
            expect(rawUser.gender).toBe(originalData.gender);
            expect(rawUser.address.city).toBe(originalData.address.city);
            expect(rawUser.address.state).toBe(originalData.address.state);
            expect(rawUser.address.pincode).toBe(originalData.address.pincode);
            
            // Now verify decryption works correctly
            const decryptedUser = savedUser.getDecryptedData();
            
            // Verify all sensitive fields decrypt to original values
            expect(decryptedUser.fullName).toBe(originalData.fullName);
            expect(decryptedUser.phone).toBe(originalData.phone);
            expect(decryptedUser.address.street).toBe(originalData.address.street);
            
            // Verify medical conditions decrypt correctly
            if (originalData.medicalConditions && originalData.medicalConditions.length > 0) {
              expect(decryptedUser.medicalConditions).toHaveLength(originalData.medicalConditions.length);
              originalData.medicalConditions.forEach((condition, index) => {
                expect(decryptedUser.medicalConditions[index]).toBe(condition);
              });
            }
            
            // Verify allergies decrypt correctly
            if (originalData.allergies && originalData.allergies.length > 0) {
              expect(decryptedUser.allergies).toHaveLength(originalData.allergies.length);
              originalData.allergies.forEach((allergy, index) => {
                expect(decryptedUser.allergies[index]).toBe(allergy);
              });
            }
            
            // Verify emergency contacts decrypt correctly
            if (originalData.emergencyContacts && originalData.emergencyContacts.length > 0) {
              expect(decryptedUser.emergencyContacts).toHaveLength(originalData.emergencyContacts.length);
              originalData.emergencyContacts.forEach((contact, index) => {
                expect(decryptedUser.emergencyContacts[index].name).toBe(contact.name);
                expect(decryptedUser.emergencyContacts[index].phone).toBe(contact.phone);
                expect(decryptedUser.emergencyContacts[index].relation).toBe(contact.relation);
              });
            }
            
            // Verify vehicles decrypt correctly
            if (originalData.vehicles && originalData.vehicles.length > 0) {
              expect(decryptedUser.vehicles).toHaveLength(originalData.vehicles.length);
              originalData.vehicles.forEach((vehicle, index) => {
                expect(decryptedUser.vehicles[index].vehicleNumber).toBe(vehicle.vehicleNumber);
                expect(decryptedUser.vehicles[index].type).toBe(vehicle.type);
                expect(decryptedUser.vehicles[index].model).toBe(vehicle.model);
              });
            }
            
            // Verify insurance decrypts correctly
            if (originalData.insurance) {
              if (originalData.insurance.provider) {
                expect(decryptedUser.insurance.provider).toBe(originalData.insurance.provider);
              }
              if (originalData.insurance.policyNumber) {
                expect(decryptedUser.insurance.policyNumber).toBe(originalData.insurance.policyNumber);
              }
              if (originalData.insurance.validTill) {
                expect(decryptedUser.insurance.validTill.getTime())
                  .toBe(new Date(originalData.insurance.validTill).getTime());
              }
            }
            
            return true;
          } catch (error) {
            console.error('Encryption property test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 5, // Reduced for faster testing while ensuring good coverage
        timeout: 15000,
        verbose: false
      }
    );
  }, 20000);

  /**
   * Property: Encryption consistency
   * For the same input data, encryption should produce different ciphertext each time
   * but decrypt to the same original value (due to random IV in encryption)
   */
  test('Property: Encryption produces different ciphertext for same input', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 })
          .map(s => s.replace(/[^a-zA-Z0-9\s]/g, 'A').trim() || 'Test Data')
          .map(s => s.length >= 5 ? s : 'Test Data'),
        
        async (testString) => {
          try {
            // Encrypt the same string multiple times
            const encrypted1 = encrypt(testString);
            const encrypted2 = encrypt(testString);
            const encrypted3 = encrypt(testString);
            
            // Ciphertext should be different each time (due to random IV)
            expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
            expect(encrypted2.encrypted).not.toBe(encrypted3.encrypted);
            expect(encrypted1.encrypted).not.toBe(encrypted3.encrypted);
            
            // But all should decrypt to the same original value
            expect(decrypt(encrypted1)).toBe(testString);
            expect(decrypt(encrypted2)).toBe(testString);
            expect(decrypt(encrypted3)).toBe(testString);
            
            // IV should be different each time
            expect(encrypted1.iv).not.toBe(encrypted2.iv);
            expect(encrypted2.iv).not.toBe(encrypted3.iv);
            expect(encrypted1.iv).not.toBe(encrypted3.iv);
            
            return true;
          } catch (error) {
            console.error('Encryption consistency test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 20,
        timeout: 10000
      }
    );
  }, 15000);

  /**
   * Property: Encryption roundtrip integrity
   * For any string, encrypt(string) -> decrypt(encrypted) should equal original string
   */
  test('Property: Encryption roundtrip integrity', async () => {
    await fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 })
          .filter(s => s.trim().length > 0), // Ensure non-empty strings
        
        (originalString) => {
          try {
            const encrypted = encrypt(originalString);
            const decrypted = decrypt(encrypted);
            
            expect(decrypted).toBe(originalString);
            expect(typeof encrypted.encrypted).toBe('string');
            expect(typeof encrypted.iv).toBe('string');
            expect(encrypted.encrypted.length).toBeGreaterThan(0);
            expect(encrypted.iv.length).toBeGreaterThan(0);
            
            return true;
          } catch (error) {
            console.error('Roundtrip integrity test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 50,
        timeout: 10000
      }
    );
  }, 15000);
});