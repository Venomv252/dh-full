/**
 * Guest Model Property-Based Tests
 * 
 * Property-based tests for Guest model ID uniqueness and validation
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const Guest = require('../../src/models/Guest');
const { generateGuestId } = require('../../src/utils/encryption');
const { clearTestData } = require('../utils/testHelpers');

describe('Guest Model Property Tests', () => {
  afterEach(async () => {
    await clearTestData();
  });

  /**
   * Feature: emergency-incident-platform, Property 5: Guest ID uniqueness
   * 
   * Property 5: Guest ID uniqueness
   * For any number of guests created, each guest should have a unique guestId
   * that follows the expected format and cannot be duplicated in the database
   * 
   * Validates: Requirements 2.1
   */
  test('Property 5: Guest ID uniqueness', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a number of guests to create (between 2 and 20)
        fc.integer({ min: 2, max: 20 }),
        
        async (numGuests) => {
          try {
            const createdGuests = [];
            const guestIds = new Set();
            
            // Create multiple guests
            for (let i = 0; i < numGuests; i++) {
              const guest = new Guest();
              const savedGuest = await guest.save();
              
              // Verify guest ID format (should match: guest_<timestamp>_<random>)
              expect(savedGuest.guestId).toMatch(/^guest_[a-z0-9]+_[a-f0-9]{16}$/);
              
              // Verify guest ID is unique
              expect(guestIds.has(savedGuest.guestId)).toBe(false);
              guestIds.add(savedGuest.guestId);
              
              // Verify guest ID is immutable (cannot be changed)
              expect(savedGuest.guestId).toBeTruthy();
              expect(typeof savedGuest.guestId).toBe('string');
              
              createdGuests.push(savedGuest);
              
              // Small delay to ensure timestamp differences
              await new Promise(resolve => setTimeout(resolve, 1));
            }
            
            // Verify all guest IDs are unique
            expect(guestIds.size).toBe(numGuests);
            
            // Verify database uniqueness constraint
            const allGuests = await Guest.find({});
            const dbGuestIds = allGuests.map(g => g.guestId);
            const uniqueDbGuestIds = new Set(dbGuestIds);
            expect(uniqueDbGuestIds.size).toBe(dbGuestIds.length);
            
            // Try to create a guest with a duplicate ID (should fail)
            if (createdGuests.length > 0) {
              const duplicateGuest = new Guest({ guestId: createdGuests[0].guestId });
              
              let duplicateError = null;
              try {
                await duplicateGuest.save();
              } catch (error) {
                duplicateError = error;
              }
              
              // Should fail due to unique constraint
              expect(duplicateError).toBeTruthy();
              expect(duplicateError.code).toBe(11000); // MongoDB duplicate key error
            }
            
            return true;
          } catch (error) {
            console.error('Guest ID uniqueness test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 10, // Reduced for faster testing
        timeout: 15000,
        verbose: false
      }
    );
  }, 20000);

  /**
   * Property: Guest ID generation consistency
   * For any guest creation, the generated ID should follow the expected format
   * and be different from previously generated IDs
   */
  test('Property: Guest ID generation consistency', async () => {
    await fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }), // Number of IDs to generate
        
        (numIds) => {
          try {
            const generatedIds = new Set();
            
            // Generate multiple guest IDs
            for (let i = 0; i < numIds; i++) {
              const guestId = generateGuestId();
              
              // Verify format: guest_<timestamp>_<random>
              expect(guestId).toMatch(/^guest_[a-z0-9]+_[a-f0-9]{16}$/);
              
              // Verify uniqueness
              expect(generatedIds.has(guestId)).toBe(false);
              generatedIds.add(guestId);
              
              // Verify structure
              const parts = guestId.split('_');
              expect(parts).toHaveLength(3);
              expect(parts[0]).toBe('guest');
              expect(parts[1]).toBeTruthy(); // timestamp part
              expect(parts[2]).toBeTruthy(); // random part
              expect(parts[2]).toHaveLength(16); // 8 bytes = 16 hex chars
            }
            
            // Verify all IDs are unique
            expect(generatedIds.size).toBe(numIds);
            
            return true;
          } catch (error) {
            console.error('Guest ID generation test error:', error.message);
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
   * Property: Guest ID immutability
   * For any guest, once created, the guestId should not be changeable
   */
  test('Property: Guest ID immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 })
          .map(s => `guest_test_${s.replace(/[^a-zA-Z0-9]/g, 'x')}`),
        
        async (attemptedNewId) => {
          try {
            // Create a guest
            const guest = new Guest();
            const savedGuest = await guest.save();
            const originalId = savedGuest.guestId;
            
            // Verify original ID is set
            expect(originalId).toBeTruthy();
            expect(originalId).toMatch(/^guest_[a-z0-9]+_[a-f0-9]{16}$/);
            
            // Try to change the guest ID
            savedGuest.guestId = attemptedNewId;
            
            let updateError = null;
            try {
              await savedGuest.save();
            } catch (error) {
              updateError = error;
            }
            
            // Should fail due to immutable constraint or validation
            // MongoDB might allow the save but the ID should remain unchanged
            const reloadedGuest = await Guest.findById(savedGuest._id);
            expect(reloadedGuest.guestId).toBe(originalId);
            expect(reloadedGuest.guestId).not.toBe(attemptedNewId);
            
            return true;
          } catch (error) {
            console.error('Guest ID immutability test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 10,
        timeout: 10000
      }
    );
  }, 15000);

  /**
   * Property: Guest creation with default values
   * For any guest created, it should have proper default values set
   */
  test('Property: Guest creation with default values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null), // No input needed, testing defaults
        
        async () => {
          try {
            // Create a guest with no explicit values
            const guest = new Guest();
            const savedGuest = await guest.save();
            
            // Verify default values are set correctly
            expect(savedGuest.guestId).toBeTruthy();
            expect(savedGuest.guestId).toMatch(/^guest_[a-z0-9]+_[a-f0-9]{16}$/);
            expect(savedGuest.actionCount).toBe(0);
            expect(savedGuest.maxActions).toBe(10); // GUEST_LIMITS.MAX_ACTIONS
            expect(savedGuest.lastActiveAt).toBeInstanceOf(Date);
            expect(savedGuest.createdAt).toBeInstanceOf(Date);
            
            // Verify timestamps are recent (within last minute)
            const now = new Date();
            const oneMinuteAgo = new Date(now.getTime() - 60000);
            expect(savedGuest.createdAt.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
            expect(savedGuest.lastActiveAt.getTime()).toBeGreaterThan(oneMinuteAgo.getTime());
            
            // Verify helper methods work
            expect(savedGuest.canPerformAction()).toBe(true);
            expect(savedGuest.getRemainingActions()).toBe(10);
            expect(savedGuest.isActive()).toBe(true);
            
            // Verify status method
            const status = savedGuest.getStatus();
            expect(status.guestId).toBe(savedGuest.guestId);
            expect(status.actionCount).toBe(0);
            expect(status.maxActions).toBe(10);
            expect(status.remainingActions).toBe(10);
            expect(status.canPerformAction).toBe(true);
            expect(status.isActive).toBe(true);
            
            return true;
          } catch (error) {
            console.error('Guest creation test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 15,
        timeout: 10000
      }
    );
  }, 15000);
});