/**
 * Property Test: Guest Action Tracking
 * 
 * Tests Property 6: Guest action tracking
 * Validates Requirements 2.2, 2.4, 2.6
 * 
 * This test ensures that:
 * - Action counts are tracked accurately (Requirement 2.2)
 * - Action limits are enforced properly (Requirement 2.4)
 * - Activity timestamps are updated correctly (Requirement 2.6)
 */

const fc = require('fast-check');
const Guest = require('../../src/models/Guest');
const { GUEST_LIMITS } = require('../../src/config/constants');
const { createTestGuest } = require('../factories/guestFactory');

describe('Property Test: Guest Action Tracking', () => {
  
  /**
   * Main Property Test: Guest action tracking consistency
   * 
   * This test validates that guest action tracking works correctly
   * across various scenarios and maintains data integrity.
   */
  test('Property 6: Guest action tracking maintains consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          initialActionCount: fc.integer({ min: 0, max: GUEST_LIMITS.MAX_ACTIONS }),
          actionSequence: fc.array(
            fc.boolean(), // true = perform action, false = check status
            { minLength: 1, maxLength: 15 }
          ),
          maxActions: fc.constant(GUEST_LIMITS.MAX_ACTIONS) // Use the constant limit
        }),
        
        async ({ initialActionCount, actionSequence, maxActions }) => {
          // Create guest with initial state
          const guest = await createTestGuest({
            actionCount: initialActionCount,
            maxActions: maxActions
          });
          
          const initialLastActive = guest.lastActiveAt;
          let expectedActionCount = initialActionCount;
          let lastActiveUpdated = false;
          
          // Process action sequence
          for (const shouldPerformAction of actionSequence) {
            const guestBefore = await Guest.findById(guest._id);
            
            if (shouldPerformAction) {
              // Attempt to perform action
              if (guestBefore.canPerformAction()) {
                // Should succeed
                await new Promise(resolve => setTimeout(resolve, 1)); // Ensure timestamp difference
                const updatedGuest = await guestBefore.incrementActionCount();
                expectedActionCount++;
                lastActiveUpdated = true;
                
                // Verify action count increased
                expect(updatedGuest.actionCount).toBe(expectedActionCount);
                
                // Verify lastActiveAt was updated (allow for same timestamp in fast operations)
                expect(updatedGuest.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
                  guestBefore.lastActiveAt.getTime()
                );
                
                // Verify remaining actions calculation
                expect(updatedGuest.getRemainingActions()).toBe(
                  Math.max(0, maxActions - expectedActionCount)
                );
                
              } else {
                // Should fail - at limit
                await expect(guestBefore.incrementActionCount())
                  .rejects
                  .toThrow('Guest has reached maximum action limit');
                
                // Action count should remain unchanged
                const unchangedGuest = await Guest.findById(guest._id);
                expect(unchangedGuest.actionCount).toBe(expectedActionCount);
              }
            } else {
              // Just check status - no changes expected
              const status = guestBefore.getStatus();
              
              // Verify status consistency
              expect(status.actionCount).toBe(expectedActionCount);
              expect(status.maxActions).toBe(maxActions);
              expect(status.remainingActions).toBe(
                Math.max(0, maxActions - expectedActionCount)
              );
              expect(status.canPerformAction).toBe(expectedActionCount < maxActions);
            }
          }
          
          // Final verification
          const finalGuest = await Guest.findById(guest._id);
          
          // Action count should match expected
          expect(finalGuest.actionCount).toBe(expectedActionCount);
          
          // If any actions were performed, lastActiveAt should be updated
          if (lastActiveUpdated) {
            expect(finalGuest.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
              initialLastActive.getTime()
            );
          }
          
          // Action count should never exceed maxActions
          expect(finalGuest.actionCount).toBeLessThanOrEqual(maxActions);
          
          // Remaining actions should be calculated correctly
          expect(finalGuest.getRemainingActions()).toBe(
            Math.max(0, maxActions - expectedActionCount)
          );
          
          // canPerformAction should be accurate
          expect(finalGuest.canPerformAction()).toBe(
            expectedActionCount < maxActions
          );
        }
      ),
      { 
        numRuns: 50,
        timeout: 10000,
        verbose: process.env.NODE_ENV === 'test'
      }
    );
  });

  /**
   * Property Test: Action count boundaries
   * 
   * Tests that action counts respect boundaries and limits
   */
  test('Property 6a: Action count boundaries are respected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          maxActions: fc.constant(GUEST_LIMITS.MAX_ACTIONS), // Use the constant limit
          attemptedActions: fc.integer({ min: 0, max: 20 })
        }),
        
        async ({ maxActions, attemptedActions }) => {
          const guest = await createTestGuest({ maxActions });
          let actualActions = 0;
          
          // Attempt to perform actions
          for (let i = 0; i < attemptedActions; i++) {
            const currentGuest = await Guest.findById(guest._id);
            
            if (currentGuest.canPerformAction()) {
              await currentGuest.incrementActionCount();
              actualActions++;
            } else {
              // Should not be able to perform more actions
              await expect(currentGuest.incrementActionCount())
                .rejects
                .toThrow('Guest has reached maximum action limit');
            }
          }
          
          // Final verification
          const finalGuest = await Guest.findById(guest._id);
          
          // Action count should never exceed maxActions
          expect(finalGuest.actionCount).toBeLessThanOrEqual(maxActions);
          expect(finalGuest.actionCount).toBe(Math.min(attemptedActions, maxActions));
          expect(actualActions).toBe(Math.min(attemptedActions, maxActions));
          
          // If at limit, should not be able to perform more actions
          if (finalGuest.actionCount >= maxActions) {
            expect(finalGuest.canPerformAction()).toBe(false);
            expect(finalGuest.getRemainingActions()).toBe(0);
          }
        }
      ),
      { 
        numRuns: 30,
        timeout: 8000
      }
    );
  });

  /**
   * Property Test: Activity timestamp updates
   * 
   * Tests that lastActiveAt is updated correctly during actions
   */
  test('Property 6b: Activity timestamps update correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          actionCount: fc.integer({ min: 1, max: 5 }),
          delayMs: fc.integer({ min: 10, max: 100 }) // Small delays for timestamp differences
        }),
        
        async ({ actionCount, delayMs }) => {
          const guest = await createTestGuest({ maxActions: 10 });
          const initialLastActive = guest.lastActiveAt;
          let previousLastActive = initialLastActive;
          
          for (let i = 0; i < actionCount; i++) {
            // Small delay to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            const currentGuest = await Guest.findById(guest._id);
            const beforeAction = currentGuest.lastActiveAt;
            
            // Perform action
            const updatedGuest = await currentGuest.incrementActionCount();
            
            // Verify timestamp was updated
            expect(updatedGuest.lastActiveAt.getTime()).toBeGreaterThan(
              beforeAction.getTime()
            );
            expect(updatedGuest.lastActiveAt.getTime()).toBeGreaterThan(
              previousLastActive.getTime()
            );
            
            previousLastActive = updatedGuest.lastActiveAt;
          }
          
          // Final verification - lastActiveAt should be much later than initial
          const finalGuest = await Guest.findById(guest._id);
          expect(finalGuest.lastActiveAt.getTime()).toBeGreaterThan(
            initialLastActive.getTime()
          );
        }
      ),
      { 
        numRuns: 20,
        timeout: 15000
      }
    );
  });

  /**
   * Property Test: Action tracking persistence
   * 
   * Tests that action tracking data persists correctly across database operations
   */
  test('Property 6c: Action tracking data persists correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialActions: fc.integer({ min: 0, max: 8 }),
          additionalActions: fc.integer({ min: 1, max: 5 }),
          maxActions: fc.constant(GUEST_LIMITS.MAX_ACTIONS) // Use the constant limit
        }),
        
        async ({ initialActions, additionalActions, maxActions }) => {
          // Create guest with initial actions
          const guest = await createTestGuest({
            actionCount: initialActions,
            maxActions
          });
          
          const guestId = guest.guestId;
          const initialData = {
            actionCount: guest.actionCount,
            maxActions: guest.maxActions,
            lastActiveAt: guest.lastActiveAt
          };
          
          // Perform additional actions
          let currentGuest = guest;
          for (let i = 0; i < additionalActions; i++) {
            if (currentGuest.canPerformAction()) {
              currentGuest = await currentGuest.incrementActionCount();
            }
          }
          
          // Reload from database
          const reloadedGuest = await Guest.findByGuestId(guestId);
          
          // Verify data persistence
          expect(reloadedGuest).toBeTruthy();
          expect(reloadedGuest.guestId).toBe(guestId);
          expect(reloadedGuest.maxActions).toBe(maxActions);
          
          // Action count should reflect performed actions
          const expectedFinalActions = Math.min(
            initialActions + additionalActions,
            maxActions
          );
          expect(reloadedGuest.actionCount).toBe(expectedFinalActions);
          
          // If actions were performed, lastActiveAt should be updated
          if (expectedFinalActions > initialActions) {
            expect(reloadedGuest.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
              initialData.lastActiveAt.getTime()
            );
          }
          
          // Status methods should work correctly
          const status = reloadedGuest.getStatus();
          expect(status.actionCount).toBe(expectedFinalActions);
          expect(status.remainingActions).toBe(maxActions - expectedFinalActions);
          expect(status.canPerformAction).toBe(expectedFinalActions < maxActions);
        }
      ),
      { 
        numRuns: 25,
        timeout: 10000
      }
    );
  });

});