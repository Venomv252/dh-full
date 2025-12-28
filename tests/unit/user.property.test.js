/**
 * User Model Property-Based Tests
 * 
 * Property-based tests for User model data completeness and validation
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const { generators, validators } = require('../utils/propertyTestHelpers');
const { createTestUser, clearTestData } = require('../utils/testHelpers');

describe('User Model Property Tests', () => {
  afterEach(async () => {
    await clearTestData();
  });

  /**
   * Feature: emergency-incident-platform, Property 1: User registration data completeness
   * 
   * Property 1: User registration data completeness
   * For any valid user registration data including personal details, medical information, 
   * emergency contacts, vehicles, and insurance, the system should store all provided 
   * fields correctly and completely in the database
   * 
   * Validates: Requirements 1.1, 1.5, 1.6, 1.7
   */
  test('Property 1: User registration data completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate comprehensive user data with simplified, reliable generators
        fc.record({
          // Personal Information (Required)
          fullName: fc.string({ minLength: 2, maxLength: 50 })
            .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim() || 'John Doe')
            .map(s => s.length >= 2 ? s : 'John Doe'),
          dob: fc.date({ min: new Date('1940-01-01'), max: new Date('2005-12-31') }),
          gender: fc.constantFrom('male', 'female', 'other'),
          
          // Contact Information (Required) - Generate unique emails with timestamp
          email: fc.integer({ min: 1000, max: 999999 }).map(n => `user${n}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`),
          phone: fc.integer({ min: 1000000000, max: 9999999999 }).map(n => `+1${n}`),
          
          // Address Information (Required)
          address: fc.record({
            street: fc.string({ minLength: 5, maxLength: 100 })
              .map(s => s.replace(/[^a-zA-Z0-9\s,.-]/g, 'A').trim() || '123 Main Street')
              .map(s => s.length >= 5 ? s : '123 Main Street'),
            city: fc.string({ minLength: 2, maxLength: 50 })
              .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim() || 'New York')
              .map(s => s.length >= 2 ? s : 'New York'),
            state: fc.string({ minLength: 2, maxLength: 50 })
              .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim() || 'NY')
              .map(s => s.length >= 2 ? s : 'NY'),
            pincode: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
          }),
          
          // Medical Information (Optional)
          bloodGroup: fc.option(fc.constantFrom('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'), { nil: undefined }),
          medicalConditions: fc.array(
            fc.string({ minLength: 3, maxLength: 100 })
              .map(s => s.replace(/[^a-zA-Z0-9\s,.-]/g, 'A').trim() || 'Diabetes')
              .map(s => s.length >= 3 ? s : 'Diabetes'),
            { maxLength: 3 }
          ),
          allergies: fc.array(
            fc.string({ minLength: 3, maxLength: 100 })
              .map(s => s.replace(/[^a-zA-Z0-9\s,.-]/g, 'A').trim() || 'Peanuts')
              .map(s => s.length >= 3 ? s : 'Peanuts'),
            { maxLength: 3 }
          ),
          
          // Emergency Contacts (Optional)
          emergencyContacts: fc.array(
            fc.record({
              name: fc.string({ minLength: 2, maxLength: 50 })
                .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim() || 'Jane Doe')
                .map(s => s.length >= 2 ? s : 'Jane Doe'),
              relation: fc.constantFrom('Parent', 'Spouse', 'Sibling', 'Child', 'Friend', 'Colleague', 'Other'),
              phone: fc.integer({ min: 1000000000, max: 9999999999 }).map(n => `+1${n}`)
            }),
            { maxLength: 3 }
          ),
          
          // Vehicle Information (Optional)
          vehicles: fc.array(
            fc.record({
              vehicleNumber: fc.string({ minLength: 6, maxLength: 15 })
                .map(s => s.toUpperCase().replace(/[^A-Z0-9]/g, 'A') || 'ABC123')
                .map(s => s.length >= 6 ? s : 'ABC123'),
              type: fc.constantFrom('Car', 'Motorcycle', 'Truck', 'Bus', 'Van', 'Bicycle', 'Other'),
              model: fc.string({ minLength: 2, maxLength: 50 })
                .map(s => s.replace(/[^a-zA-Z0-9\s-]/g, 'A').trim() || 'Toyota Camry')
                .map(s => s.length >= 2 ? s : 'Toyota Camry')
            }),
            { maxLength: 3 }
          ),
          
          // Insurance Information (Optional)
          insurance: fc.option(
            fc.record({
              provider: fc.option(
                fc.string({ minLength: 2, maxLength: 50 })
                  .map(s => s.replace(/[^a-zA-Z0-9\s&.-]/g, 'A').trim() || 'State Farm')
                  .map(s => s.length >= 2 ? s : 'State Farm'), 
                { nil: undefined }
              ),
              policyNumber: fc.option(
                fc.string({ minLength: 5, maxLength: 30 })
                  .map(s => s.replace(/[^A-Z0-9]/g, 'A') || 'POL123456')
                  .map(s => s.length >= 5 ? s : 'POL123456'), 
                { nil: undefined }
              ),
              validTill: fc.option(fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000), max: new Date('2030-12-31') }), { nil: undefined })
            }),
            { nil: undefined }
          ),
          
          // System Information (Optional)
          role: fc.option(fc.constantFrom('user', 'admin', 'hospital'), { nil: undefined })
        }),
        
        async (userData) => {
          try {
            // Create user with the generated data
            const user = new User(userData);
            const savedUser = await user.save();
            
            // Retrieve the user from database
            const retrievedUser = await User.findById(savedUser._id);
            expect(retrievedUser).toBeTruthy();
            
            // Get decrypted data for comparison
            const decryptedData = retrievedUser.getDecryptedData();
            
            // Verify all required fields are stored correctly
            expect(decryptedData.fullName).toBe(userData.fullName);
            expect(decryptedData.email).toBe(userData.email.toLowerCase());
            expect(decryptedData.dob.toISOString()).toBe(userData.dob.toISOString());
            expect(decryptedData.gender).toBe(userData.gender);
            expect(decryptedData.phone).toBe(userData.phone);
            
            // Verify address completeness
            expect(decryptedData.address.street).toBe(userData.address.street);
            expect(decryptedData.address.city).toBe(userData.address.city);
            expect(decryptedData.address.state).toBe(userData.address.state);
            expect(decryptedData.address.pincode).toBe(userData.address.pincode);
            
            // Verify optional fields are stored when provided
            if (userData.bloodGroup !== undefined) {
              expect(decryptedData.bloodGroup).toBe(userData.bloodGroup);
            }
            
            if (userData.medicalConditions && userData.medicalConditions.length > 0) {
              expect(decryptedData.medicalConditions).toHaveLength(userData.medicalConditions.length);
              userData.medicalConditions.forEach((condition, index) => {
                expect(decryptedData.medicalConditions[index]).toBe(condition);
              });
            }
            
            if (userData.allergies && userData.allergies.length > 0) {
              expect(decryptedData.allergies).toHaveLength(userData.allergies.length);
              userData.allergies.forEach((allergy, index) => {
                expect(decryptedData.allergies[index]).toBe(allergy);
              });
            }
            
            if (userData.emergencyContacts && userData.emergencyContacts.length > 0) {
              expect(decryptedData.emergencyContacts).toHaveLength(userData.emergencyContacts.length);
              userData.emergencyContacts.forEach((contact, index) => {
                expect(decryptedData.emergencyContacts[index].name).toBe(contact.name);
                expect(decryptedData.emergencyContacts[index].relation).toBe(contact.relation);
                expect(decryptedData.emergencyContacts[index].phone).toBe(contact.phone);
              });
            }
            
            if (userData.vehicles && userData.vehicles.length > 0) {
              expect(decryptedData.vehicles).toHaveLength(userData.vehicles.length);
              userData.vehicles.forEach((vehicle, index) => {
                expect(decryptedData.vehicles[index].vehicleNumber).toBe(vehicle.vehicleNumber);
                expect(decryptedData.vehicles[index].type).toBe(vehicle.type);
                expect(decryptedData.vehicles[index].model).toBe(vehicle.model);
              });
            }
            
            if (userData.insurance) {
              if (userData.insurance.provider !== undefined) {
                expect(decryptedData.insurance.provider).toBe(userData.insurance.provider);
              }
              if (userData.insurance.policyNumber !== undefined) {
                expect(decryptedData.insurance.policyNumber).toBe(userData.insurance.policyNumber);
              }
              if (userData.insurance.validTill !== undefined) {
                expect(decryptedData.insurance.validTill.toISOString()).toBe(userData.insurance.validTill.toISOString());
              }
            }
            
            // Verify role is set correctly (defaults to 'user' if not provided)
            const expectedRole = userData.role || 'user';
            expect(decryptedData.role).toBe(expectedRole);
            
            // Verify system fields are automatically set
            expect(decryptedData.createdAt).toBeTruthy();
            expect(decryptedData.updatedAt).toBeTruthy();
            expect(decryptedData._id).toBeTruthy();
            
            return true;
          } catch (error) {
            // Log the error for debugging
            console.error('Property test error:', error.message);
            console.error('User data:', JSON.stringify(userData, null, 2));
            return false;
          }
        }
      ),
      { 
        numRuns: 50, // Reduced for faster testing
        timeout: 30000,
        verbose: false
      }
    );
  }, 35000);

  /**
   * Property: User email uniqueness constraint
   * For any two users with the same email, only the first should be saved successfully
   */
  test('Property: User email uniqueness constraint', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 999999 }).map(n => `user${n}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`),
        fc.record({
          fullName: fc.string({ minLength: 2, maxLength: 50 })
            .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim() || 'John Doe')
            .map(s => s.length >= 2 ? s : 'John Doe'),
          phone: fc.integer({ min: 1000000000, max: 9999999999 }).map(n => `+1${n}`),
          dob: fc.date({ min: new Date('1940-01-01'), max: new Date('2005-12-31') }),
          gender: fc.constantFrom('male', 'female', 'other'),
          address: fc.record({
            street: fc.string({ minLength: 5, maxLength: 100 })
              .map(s => s.replace(/[^a-zA-Z0-9\s,.-]/g, 'A').trim() || '123 Main Street')
              .map(s => s.length >= 5 ? s : '123 Main Street'),
            city: fc.string({ minLength: 2, maxLength: 50 })
              .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim() || 'New York')
              .map(s => s.length >= 2 ? s : 'New York'),
            state: fc.string({ minLength: 2, maxLength: 50 })
              .map(s => s.replace(/[^a-zA-Z\s]/g, 'A').trim() || 'NY')
              .map(s => s.length >= 2 ? s : 'NY'),
            pincode: fc.integer({ min: 100000, max: 999999 }).map(n => n.toString())
          })
        }),
        
        async (email, baseUserData) => {
          try {
            // Create first user with the email
            const user1Data = { ...baseUserData, email };
            const user1 = new User(user1Data);
            await user1.save();
            
            // Verify first user was saved successfully
            const savedUser1 = await User.findOne({ email: email.toLowerCase() });
            expect(savedUser1).toBeTruthy();
            
            // Try to create second user with same email but different data
            const user2Data = { 
              ...baseUserData, 
              email,
              fullName: baseUserData.fullName + ' Different',
              phone: '+19876543210' // Different phone
            };
            const user2 = new User(user2Data);
            
            // Second save should fail due to email uniqueness
            let duplicateError = null;
            try {
              await user2.save();
            } catch (error) {
              duplicateError = error;
            }
            
            // Verify that duplicate email was rejected
            expect(duplicateError).toBeTruthy();
            expect(duplicateError.message).toContain('Email already exists');
            
            // Verify only one user exists with this email
            const usersWithEmail = await User.find({ email: email.toLowerCase() });
            expect(usersWithEmail).toHaveLength(1);
            
            return true;
          } catch (error) {
            console.error('Email uniqueness test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 20, // Reduced for faster testing
        timeout: 15000
      }
    );
  }, 20000);
});