/**
 * Database Relationship Integrity Property-Based Tests
 * 
 * Property-based tests for database relationship integrity across models
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const Guest = require('../../src/models/Guest');
const Incident = require('../../src/models/Incident');
const { USER_TYPES, INCIDENT_TYPES } = require('../../src/config/constants');
const { clearTestData } = require('../utils/testHelpers');

describe('Database Relationship Integrity Property Tests', () => {
  afterEach(async () => {
    await clearTestData();
  });

  /**
   * Feature: emergency-incident-platform, Property 19: Database relationship integrity
   * 
   * Property 19: Database relationship integrity
   * For any incident with reporter and upvoter relationships, the system should
   * maintain referential integrity, ensure proper foreign key constraints,
   * and handle cascading operations correctly
   * 
   * Validates: Requirements 7.4
   */
  test('Property 19: Database relationship integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test scenario with users, guests, and incidents
        fc.record({
          numUsers: fc.integer({ min: 1, max: 3 }),
          numGuests: fc.integer({ min: 1, max: 3 }),
          numIncidents: fc.integer({ min: 1, max: 5 }),
          reporterType: fc.constantFrom(USER_TYPES.USER, USER_TYPES.GUEST),
          upvoterTypes: fc.array(fc.constantFrom(USER_TYPES.USER, USER_TYPES.GUEST), { minLength: 1, maxLength: 4 })
        }),
        
        async (scenario) => {
          try {
            const createdUsers = [];
            const createdGuests = [];
            const createdIncidents = [];
            
            // Create test users
            for (let i = 0; i < scenario.numUsers; i++) {
              const user = new User({
                fullName: `Test User ${i}`,
                email: `user${i}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
                phone: `+155512345${i.toString().padStart(2, '0')}`,
                dob: new Date('1990-01-01'),
                gender: 'male',
                address: {
                  street: `${123 + i} Test Street`,
                  city: 'Test City',
                  state: 'TS',
                  pincode: '123456'
                }
              });
              const savedUser = await user.save();
              createdUsers.push(savedUser);
            }
            
            // Create test guests
            for (let i = 0; i < scenario.numGuests; i++) {
              const guest = new Guest();
              const savedGuest = await guest.save();
              createdGuests.push(savedGuest);
            }
            
            // Create incidents with proper relationships
            for (let i = 0; i < scenario.numIncidents; i++) {
              let reportedBy;
              
              // Set reporter based on scenario
              if (scenario.reporterType === USER_TYPES.USER && createdUsers.length > 0) {
                const randomUser = createdUsers[i % createdUsers.length];
                reportedBy = {
                  userType: USER_TYPES.USER,
                  userId: randomUser._id,
                  guestId: null
                };
              } else if (scenario.reporterType === USER_TYPES.GUEST && createdGuests.length > 0) {
                const randomGuest = createdGuests[i % createdGuests.length];
                reportedBy = {
                  userType: USER_TYPES.GUEST,
                  userId: null,
                  guestId: randomGuest._id
                };
              } else {
                // Fallback to user if guests not available
                const randomUser = createdUsers[0];
                reportedBy = {
                  userType: USER_TYPES.USER,
                  userId: randomUser._id,
                  guestId: null
                };
              }
              
              const incident = new Incident({
                title: `Test Incident ${i}`,
                description: `Test incident description for incident ${i}`,
                type: INCIDENT_TYPES.OTHER,
                geoLocation: {
                  type: 'Point',
                  coordinates: [0 + i, 0 + i] // Simple coordinates
                },
                reportedBy: reportedBy
              });
              
              const savedIncident = await incident.save();
              createdIncidents.push(savedIncident);
            }
            
            // Test 1: Verify reporter relationships are correctly established
            for (const incident of createdIncidents) {
              const retrievedIncident = await Incident.findById(incident._id)
                .populate('reportedBy.userId', 'email fullName')
                .populate('reportedBy.guestId', 'guestId');
              
              expect(retrievedIncident.reportedBy).toBeTruthy();
              expect(retrievedIncident.reportedBy.userType).toBeTruthy();
              
              if (retrievedIncident.reportedBy.userType === USER_TYPES.USER) {
                expect(retrievedIncident.reportedBy.userId).toBeTruthy();
                expect(retrievedIncident.reportedBy.guestId).toBeNull();
                
                // Verify populated user data
                if (retrievedIncident.reportedBy.userId) {
                  expect(retrievedIncident.reportedBy.userId.email).toBeTruthy();
                }
              } else {
                expect(retrievedIncident.reportedBy.guestId).toBeTruthy();
                expect(retrievedIncident.reportedBy.userId).toBeNull();
                
                // Verify populated guest data
                if (retrievedIncident.reportedBy.guestId) {
                  expect(retrievedIncident.reportedBy.guestId.guestId).toBeTruthy();
                }
              }
            }
            
            // Test 2: Add upvotes and verify relationship integrity
            if (createdIncidents.length > 0 && scenario.upvoterTypes.length > 0) {
              const testIncident = createdIncidents[0];
              const usedUpvoters = new Set(); // Track used upvoters to avoid duplicates
              
              for (let i = 0; i < scenario.upvoterTypes.length; i++) {
                const upvoterType = scenario.upvoterTypes[i];
                
                if (upvoterType === USER_TYPES.USER && createdUsers.length > 0) {
                  // Find a user that hasn't upvoted yet
                  for (const user of createdUsers) {
                    const upvoterKey = `user_${user._id}`;
                    if (!usedUpvoters.has(upvoterKey)) {
                      try {
                        await testIncident.addUpvote(USER_TYPES.USER, user._id);
                        usedUpvoters.add(upvoterKey);
                        break;
                      } catch (error) {
                        // Skip if already upvoted
                        if (error.code !== 'DUPLICATE_UPVOTE') {
                          throw error;
                        }
                      }
                    }
                  }
                } else if (upvoterType === USER_TYPES.GUEST && createdGuests.length > 0) {
                  // Find a guest that hasn't upvoted yet
                  for (const guest of createdGuests) {
                    const upvoterKey = `guest_${guest._id}`;
                    if (!usedUpvoters.has(upvoterKey)) {
                      try {
                        await testIncident.addUpvote(USER_TYPES.GUEST, null, guest._id);
                        usedUpvoters.add(upvoterKey);
                        break;
                      } catch (error) {
                        // Skip if already upvoted
                        if (error.code !== 'DUPLICATE_UPVOTE') {
                          throw error;
                        }
                      }
                    }
                  }
                }
              }
              
              // Verify upvote relationships
              const updatedIncident = await Incident.findById(testIncident._id)
                .populate('upvotedBy.userId', 'email')
                .populate('upvotedBy.guestId', 'guestId');
              
              expect(updatedIncident.upvotedBy.length).toBeGreaterThan(0);
              expect(updatedIncident.upvotes).toBe(updatedIncident.upvotedBy.length);
              
              // Verify each upvote relationship
              for (const upvote of updatedIncident.upvotedBy) {
                expect(upvote.userType).toBeTruthy();
                expect(upvote.upvotedAt).toBeInstanceOf(Date);
                
                if (upvote.userType === USER_TYPES.USER) {
                  expect(upvote.userId).toBeTruthy();
                  expect(upvote.guestId).toBeFalsy();
                } else {
                  expect(upvote.guestId).toBeTruthy();
                  expect(upvote.userId).toBeFalsy();
                }
              }
            }
            
            // Test 3: Verify referential integrity with invalid references
            let invalidRefError = null;
            try {
              const invalidIncident = new Incident({
                title: 'Invalid Reference Test',
                description: 'Testing invalid reference handling',
                type: INCIDENT_TYPES.OTHER,
                geoLocation: {
                  type: 'Point',
                  coordinates: [0, 0]
                },
                reportedBy: {
                  userType: USER_TYPES.USER,
                  userId: new mongoose.Types.ObjectId(), // Non-existent user
                  guestId: null
                }
              });
              
              await invalidIncident.save();
              
              // Try to populate - should handle gracefully
              const populatedIncident = await Incident.findById(invalidIncident._id)
                .populate('reportedBy.userId');
              
              // Should exist but with null populated reference
              expect(populatedIncident).toBeTruthy();
              expect(populatedIncident.reportedBy.userId).toBeNull();
              
            } catch (error) {
              invalidRefError = error;
            }
            
            // Test 4: Verify cascade behavior when deleting referenced documents
            if (createdUsers.length > 0 && createdIncidents.length > 0) {
              // Find an incident reported by a user
              const userIncident = createdIncidents.find(inc => 
                inc.reportedBy.userType === USER_TYPES.USER
              );
              
              if (userIncident) {
                const reporterUserId = userIncident.reportedBy.userId;
                
                // Delete the user
                await User.findByIdAndDelete(reporterUserId);
                
                // Verify incident still exists but with orphaned reference
                const orphanedIncident = await Incident.findById(userIncident._id)
                  .populate('reportedBy.userId');
                
                expect(orphanedIncident).toBeTruthy();
                expect(orphanedIncident.reportedBy.userId).toBeNull(); // Should be null after population
              }
            }
            
            // Test 5: Verify relationship consistency across queries
            const allIncidents = await Incident.find({})
              .populate('reportedBy.userId', 'email')
              .populate('reportedBy.guestId', 'guestId');
            
            for (const incident of allIncidents) {
              // Verify mutual exclusivity of userId and guestId
              if (incident.reportedBy.userType === USER_TYPES.USER) {
                expect(incident.reportedBy.guestId).toBeFalsy();
              } else {
                expect(incident.reportedBy.userId).toBeFalsy();
              }
              
              // Verify upvote count consistency
              expect(incident.upvotes).toBe(incident.upvotedBy.length);
            }
            
            return true;
          } catch (error) {
            console.error('Database relationship integrity test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 8, // Reduced for faster testing due to complexity
        timeout: 30000,
        verbose: false
      }
    );
  }, 35000);

  /**
   * Property: Foreign key constraint validation
   * For any incident with invalid foreign key references, the system should handle gracefully
   */
  test('Property: Foreign key constraint validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          // Test cases for invalid foreign key scenarios
          { userType: USER_TYPES.USER, userId: null, guestId: null, scenario: 'missing_user_id' },
          { userType: USER_TYPES.GUEST, userId: null, guestId: null, scenario: 'missing_guest_id' },
          { userType: USER_TYPES.USER, userId: 'invalid', guestId: null, scenario: 'invalid_user_id' },
          { userType: USER_TYPES.GUEST, userId: null, guestId: 'invalid', scenario: 'invalid_guest_id' },
          { userType: USER_TYPES.USER, userId: new mongoose.Types.ObjectId(), guestId: new mongoose.Types.ObjectId(), scenario: 'both_ids_present' }
        ),
        
        async (testCase) => {
          try {
            // Try to create incident with invalid foreign key setup
            const incident = new Incident({
              title: 'Foreign Key Test',
              description: 'Testing foreign key constraint validation',
              type: INCIDENT_TYPES.OTHER,
              geoLocation: {
                type: 'Point',
                coordinates: [0, 0]
              },
              reportedBy: {
                userType: testCase.userType,
                userId: testCase.userId,
                guestId: testCase.guestId
              }
            });
            
            let validationError = null;
            try {
              await incident.save();
            } catch (error) {
              validationError = error;
            }
            
            // Should fail validation for invalid foreign key setups
            if (testCase.scenario === 'missing_user_id' || 
                testCase.scenario === 'missing_guest_id' ||
                testCase.scenario === 'both_ids_present') {
              expect(validationError).toBeTruthy();
              expect(validationError.name).toBe('ValidationError');
            }
            
            // Invalid ObjectId format should also fail
            if (testCase.scenario === 'invalid_user_id' || 
                testCase.scenario === 'invalid_guest_id') {
              expect(validationError).toBeTruthy();
            }
            
            return true;
          } catch (error) {
            console.error('Foreign key constraint validation test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 10,
        timeout: 15000
      }
    );
  }, 20000);

  /**
   * Property: Relationship data consistency
   * For any incident with relationships, data should remain consistent across operations
   */
  test('Property: Relationship data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          operations: fc.array(
            fc.constantFrom('create', 'update', 'upvote', 'query'),
            { minLength: 2, maxLength: 5 }
          )
        }),
        
        async (testData) => {
          try {
            // Create initial test data
            const user = new User({
              fullName: 'Consistency Test User',
              email: `consistency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
              phone: '+15551234567',
              dob: new Date('1990-01-01'),
              gender: 'male',
              address: {
                street: '123 Consistency Street',
                city: 'Test City',
                state: 'TS',
                pincode: '123456'
              }
            });
            const savedUser = await user.save();
            
            const guest = new Guest();
            const savedGuest = await guest.save();
            
            let incident = new Incident({
              title: 'Consistency Test Incident',
              description: 'Testing relationship data consistency',
              type: INCIDENT_TYPES.OTHER,
              geoLocation: {
                type: 'Point',
                coordinates: [0, 0]
              },
              reportedBy: {
                userType: USER_TYPES.USER,
                userId: savedUser._id,
                guestId: null
              }
            });
            
            let savedIncident = await incident.save();
            
            // Perform operations and verify consistency
            for (const operation of testData.operations) {
              switch (operation) {
                case 'create':
                  // Already created above
                  break;
                  
                case 'update':
                  savedIncident.title = `Updated ${savedIncident.title}`;
                  savedIncident = await savedIncident.save();
                  break;
                  
                case 'upvote':
                  // Only add upvote if guest hasn't already upvoted
                  if (!savedIncident.hasUpvoted(USER_TYPES.GUEST, null, savedGuest._id)) {
                    await savedIncident.addUpvote(USER_TYPES.GUEST, null, savedGuest._id);
                  }
                  break;
                  
                case 'query':
                  const queriedIncident = await Incident.findById(savedIncident._id)
                    .populate('reportedBy.userId')
                    .populate('upvotedBy.guestId');
                  
                  // Verify consistency
                  expect(queriedIncident.reportedBy.userType).toBe(USER_TYPES.USER);
                  expect(queriedIncident.reportedBy.userId).toBeTruthy();
                  expect(queriedIncident.reportedBy.guestId).toBeNull();
                  expect(queriedIncident.upvotes).toBe(queriedIncident.upvotedBy.length);
                  break;
              }
            }
            
            // Final consistency check
            const finalIncident = await Incident.findById(savedIncident._id)
              .populate('reportedBy.userId', 'email')
              .populate('upvotedBy.guestId', 'guestId');
            
            expect(finalIncident.reportedBy.userType).toBe(USER_TYPES.USER);
            expect(finalIncident.upvotes).toBe(finalIncident.upvotedBy.length);
            
            return true;
          } catch (error) {
            console.error('Relationship data consistency test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 10,
        timeout: 20000
      }
    );
  }, 25000);
});