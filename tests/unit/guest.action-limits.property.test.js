/**
 * Property Test: Guest Action Limits Enforcement
 * 
 * Tests Property 7: Guest action limits enforcement
 * Validates Requirements 2.7, 2.8, 6.4
 * 
 * This test ensures that:
 * - Guest reporting actions are limited (Requirement 2.7)
 * - Guest upvoting actions are limited (Requirement 2.8)
 * - Action count limits are enforced (Requirement 6.4)
 */

const fc = require('fast-check');
const Guest = require('../../src/models/Guest');
const { GUEST_LIMITS, ERROR_CODES } = require('../../src/config/constants');
const { createTestGuest } = require('../factories/guestFactory');

describe('Property Test: Guest Action Limits Enforcement', () => {
  
  /**
   * Main Property Test: Guest action limits enforcement
   * 
   * This test validates that guest action limits are enforced consistently
   * regardless of action type (report or upvote) and sequence.
   */
  test('Property 7: Guest action limits are enforced consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          initialActionCount: fc.integer({ min: 0, max: GUEST_LIMITS.MAX_ACTIONS }),
          actionSequence: fc.array(
            fc.record({
              type: fc.constantFrom('report', 'upvote', 'check'),
              shouldSucceed: fc.boolean()
            }),
            { minLength: 1, maxLength: 20 }
          ).filter(seq => seq.some(action => action.type !== 'check')), // Ensure at least one non-check action
          maxActions: fc.constant(GUEST_LIMITS.MAX_ACTIONS)
        }),
        
        async ({ initialActionCount, actionSequence, maxActions }) => {
          // Create guest with initial state
          const guest = await createTestGuest({
            actionCount: initialActionCount,
            maxActions: maxActions
          });
          
          let expectedActionCount = initialActionCount;
          let actionsBlocked = 0;
          let actionsAllowed = 0;
          
          // Process action sequence
          for (const action of actionSequence) {
            const guestBefore = await Guest.findById(guest._id);
            const canPerformAction = guestBefore.canPerformAction();
            
            if (action.type === 'check') {
              // Just verify current state
              expect(guestBefore.actionCount).toBe(expectedActionCount);
              expect(guestBefore.canPerformAction()).toBe(expectedActionCount < maxActions);
              expect(guestBefore.getRemainingActions()).toBe(
                Math.max(0, maxActions - expectedActionCount)
              );
              continue;
            }
            
            // Simulate action attempt (report or upvote)
            if (canPerformAction) {
              // Action should be allowed
              const updatedGuest = await guestBefore.incrementActionCount();
              expectedActionCount++;
              actionsAllowed++;
              
              // Verify action was recorded
              expect(updatedGuest.actionCount).toBe(expectedActionCount);
              expect(updatedGuest.actionCount).toBeLessThanOrEqual(maxActions);
              
              // Verify remaining actions calculation
              expect(updatedGuest.getRemainingActions()).toBe(
                Math.max(0, maxActions - expectedActionCount)
              );
              
            } else {
              // Action should be blocked
              await expect(guestBefore.incrementActionCount())
                .rejects
                .toMatchObject({
                  message: 'Guest has reached maximum action limit',
                  code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED
                });
              
              actionsBlocked++;
              
              // Action count should remain unchanged
              const unchangedGuest = await Guest.findById(guest._id);
              expect(unchangedGuest.actionCount).toBe(expectedActionCount);
            }
          }
          
          // Final verification
          const finalGuest = await Guest.findById(guest._id);
          
          // Action count should never exceed maxActions
          expect(finalGuest.actionCount).toBeLessThanOrEqual(maxActions);
          expect(finalGuest.actionCount).toBe(expectedActionCount);
          
          // If at limit, no more actions should be possible
          if (finalGuest.actionCount >= maxActions) {
            expect(finalGuest.canPerformAction()).toBe(false);
            expect(finalGuest.getRemainingActions()).toBe(0);
            
            // Verify one more action attempt fails
            await expect(finalGuest.incrementActionCount())
              .rejects
              .toMatchObject({
                code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED
              });
          }
          
          // Verify action tracking consistency
          const totalActionAttempts = actionSequence.filter(a => a.type !== 'check').length;
          expect(actionsAllowed + actionsBlocked).toBe(totalActionAttempts);
          expect(finalGuest.actionCount).toBe(initialActionCount + actionsAllowed);
        }
      ),
      { 
        numRuns: 50,
        timeout: 15000,
        verbose: process.env.NODE_ENV === 'test'
      }
    );
  });

  /**
   * Property Test: Action type independence
   * 
   * Tests that action limits apply equally to all action types
   * (reporting incidents and upvoting incidents)
   */
  test('Property 7a: Action limits apply equally to all action types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          reportActions: fc.integer({ min: 0, max: 15 }),
          upvoteActions: fc.integer({ min: 0, max: 15 }),
          mixedSequence: fc.boolean() // Whether to mix action types
        }),
        
        async ({ reportActions, upvoteActions, mixedSequence }) => {
          const guest = await createTestGuest({ maxActions: GUEST_LIMITS.MAX_ACTIONS });
          
          let totalActionsAttempted = reportActions + upvoteActions;
          let totalActionsAllowed = Math.min(totalActionsAttempted, GUEST_LIMITS.MAX_ACTIONS);
          let actualActionsPerformed = 0;
          
          // Create action sequence
          let actionSequence = [];
          for (let i = 0; i < reportActions; i++) {
            actionSequence.push('report');
          }
          for (let i = 0; i < upvoteActions; i++) {
            actionSequence.push('upvote');
          }
          
          // Shuffle if mixed sequence requested
          if (mixedSequence) {
            actionSequence = actionSequence.sort(() => Math.random() - 0.5);
          }
          
          // Perform actions
          for (const actionType of actionSequence) {
            const currentGuest = await Guest.findById(guest._id);
            
            if (currentGuest.canPerformAction()) {
              // Action should succeed regardless of type
              await currentGuest.incrementActionCount();
              actualActionsPerformed++;
            } else {
              // Action should fail regardless of type
              await expect(currentGuest.incrementActionCount())
                .rejects
                .toMatchObject({
                  code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED
                });
            }
          }
          
          // Final verification
          const finalGuest = await Guest.findById(guest._id);
          
          // Total actions performed should match expected
          expect(actualActionsPerformed).toBe(totalActionsAllowed);
          expect(finalGuest.actionCount).toBe(totalActionsAllowed);
          
          // Action limit should be enforced regardless of action type mix
          expect(finalGuest.actionCount).toBeLessThanOrEqual(GUEST_LIMITS.MAX_ACTIONS);
          
          // If limit reached, no more actions of any type should be allowed
          if (finalGuest.actionCount >= GUEST_LIMITS.MAX_ACTIONS) {
            expect(finalGuest.canPerformAction()).toBe(false);
            
            // Test that both report and upvote actions are blocked
            await expect(finalGuest.incrementActionCount())
              .rejects
              .toMatchObject({
                code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED
              });
          }
        }
      ),
      { 
        numRuns: 30,
        timeout: 10000
      }
    );
  });

  /**
   * Property Test: Limit enforcement persistence
   * 
   * Tests that action limits persist across database operations
   * and guest sessions
   */
  test('Property 7b: Action limits persist across sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          session1Actions: fc.integer({ min: 1, max: 8 }),
          session2Actions: fc.integer({ min: 1, max: 8 }),
          sessionGap: fc.integer({ min: 10, max: 100 }) // milliseconds between sessions
        }),
        
        async ({ session1Actions, session2Actions, sessionGap }) => {
          // Session 1: Create guest and perform some actions
          const guest = await createTestGuest({ maxActions: GUEST_LIMITS.MAX_ACTIONS });
          const guestId = guest.guestId;
          
          let session1Performed = 0;
          for (let i = 0; i < session1Actions; i++) {
            const currentGuest = await Guest.findById(guest._id);
            if (currentGuest.canPerformAction()) {
              await currentGuest.incrementActionCount();
              session1Performed++;
            }
          }
          
          // Simulate session gap
          await new Promise(resolve => setTimeout(resolve, sessionGap));
          
          // Session 2: Reload guest and attempt more actions
          const reloadedGuest = await Guest.findByGuestId(guestId);
          expect(reloadedGuest).toBeTruthy();
          expect(reloadedGuest.actionCount).toBe(session1Performed);
          
          let session2Performed = 0;
          for (let i = 0; i < session2Actions; i++) {
            const currentGuest = await Guest.findById(reloadedGuest._id);
            if (currentGuest.canPerformAction()) {
              await currentGuest.incrementActionCount();
              session2Performed++;
            } else {
              // Should be blocked due to persistent limit
              await expect(currentGuest.incrementActionCount())
                .rejects
                .toMatchObject({
                  code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED
                });
            }
          }
          
          // Final verification
          const finalGuest = await Guest.findByGuestId(guestId);
          const totalExpectedActions = Math.min(
            session1Performed + session2Performed,
            GUEST_LIMITS.MAX_ACTIONS
          );
          
          // Action count should persist across sessions
          expect(finalGuest.actionCount).toBe(totalExpectedActions);
          expect(finalGuest.actionCount).toBeLessThanOrEqual(GUEST_LIMITS.MAX_ACTIONS);
          
          // Limit enforcement should persist
          if (finalGuest.actionCount >= GUEST_LIMITS.MAX_ACTIONS) {
            expect(finalGuest.canPerformAction()).toBe(false);
            expect(finalGuest.getRemainingActions()).toBe(0);
          }
        }
      ),
      { 
        numRuns: 25,
        timeout: 12000
      }
    );
  });

  /**
   * Property Test: Sequential action limit enforcement
   * 
   * Tests that action limits are enforced correctly in sequential
   * action attempts near the limit
   */
  test('Property 7c: Action limits enforced near the limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialActions: fc.integer({ min: 7, max: 9 }),
          additionalAttempts: fc.integer({ min: 2, max: 8 })
        }),
        
        async ({ initialActions, additionalAttempts }) => {
          // Create guest near the limit
          const guest = await createTestGuest({
            actionCount: initialActions,
            maxActions: GUEST_LIMITS.MAX_ACTIONS
          });
          
          const remainingActions = GUEST_LIMITS.MAX_ACTIONS - initialActions;
          let successfulActions = 0;
          let failedActions = 0;
          
          // Attempt additional actions sequentially
          for (let i = 0; i < additionalAttempts; i++) {
            const currentGuest = await Guest.findById(guest._id);
            
            if (currentGuest.canPerformAction()) {
              await currentGuest.incrementActionCount();
              successfulActions++;
            } else {
              // Should fail with proper error
              await expect(currentGuest.incrementActionCount())
                .rejects
                .toMatchObject({
                  code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED
                });
              failedActions++;
            }
          }
          
          // Verify final state
          const finalGuest = await Guest.findById(guest._id);
          
          // Successful actions should not exceed remaining actions
          expect(successfulActions).toBeLessThanOrEqual(remainingActions);
          expect(finalGuest.actionCount).toBeLessThanOrEqual(GUEST_LIMITS.MAX_ACTIONS);
          expect(finalGuest.actionCount).toBe(initialActions + successfulActions);
          
          // Some attempts should have failed if we exceeded the limit
          if (additionalAttempts > remainingActions) {
            expect(failedActions).toBeGreaterThan(0);
          }
          
          // If at limit, no more actions should be possible
          if (finalGuest.actionCount >= GUEST_LIMITS.MAX_ACTIONS) {
            expect(finalGuest.canPerformAction()).toBe(false);
            await expect(finalGuest.incrementActionCount())
              .rejects
              .toMatchObject({
                code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED
              });
          }
        }
      ),
      { 
        numRuns: 20,
        timeout: 10000
      }
    );
  });

  /**
   * Property Test: Error consistency for limit violations
   * 
   * Tests that limit violation errors are consistent and informative
   */
  test('Property 7d: Consistent error handling for limit violations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          actionType: fc.constantFrom('report', 'upvote', 'generic'),
          attemptsAfterLimit: fc.integer({ min: 1, max: 10 })
        }),
        
        async ({ actionType, attemptsAfterLimit }) => {
          // Create guest at the limit
          const guest = await createTestGuest({
            actionCount: GUEST_LIMITS.MAX_ACTIONS,
            maxActions: GUEST_LIMITS.MAX_ACTIONS
          });
          
          // Verify guest is at limit
          expect(guest.canPerformAction()).toBe(false);
          expect(guest.getRemainingActions()).toBe(0);
          
          // Attempt actions after limit
          for (let i = 0; i < attemptsAfterLimit; i++) {
            const currentGuest = await Guest.findById(guest._id);
            
            // Every attempt should fail with consistent error
            await expect(currentGuest.incrementActionCount())
              .rejects
              .toMatchObject({
                message: 'Guest has reached maximum action limit',
                code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED,
                statusCode: 403
              });
            
            // Action count should remain unchanged
            const unchangedGuest = await Guest.findById(guest._id);
            expect(unchangedGuest.actionCount).toBe(GUEST_LIMITS.MAX_ACTIONS);
            expect(unchangedGuest.canPerformAction()).toBe(false);
          }
          
          // Final verification - guest should still be at limit
          const finalGuest = await Guest.findById(guest._id);
          expect(finalGuest.actionCount).toBe(GUEST_LIMITS.MAX_ACTIONS);
          expect(finalGuest.canPerformAction()).toBe(false);
          expect(finalGuest.getRemainingActions()).toBe(0);
        }
      ),
      { 
        numRuns: 15,
        timeout: 8000
      }
    );
  });

});