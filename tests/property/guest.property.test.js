/**
 * Property-Based Tests for Guest Action Management
 * 
 * Tests the guest management system functionality including action tracking,
 * limits, session management, and blocking mechanisms
 * Property 5: Guest action management
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Guest = require('../../src/models/Guest');

// Test database setup
let mongoServer;
let mongoUri;

describe('Property Test: Guest Action Management', () => {

  beforeAll(async () => {
    // Set up in-memory MongoDB for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await Guest.deleteMany({});
  });

  test('Property 5: Guest action management - Guest ID uniqueness', () => {
    // Feature: emergency-incident-platform, Property 5: Guest action management
    fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1', '172.16.0.1', '127.0.0.1'),
        userAgent: fc.string({ minLength: 10, maxLength: 100 })
      }), { minLength: 1, maxLength: 10 }),
      async (guestData) => {
        // Create multiple guests
        const guests = [];
        for (const data of guestData) {
          const guest = new Guest({
            ipAddress: data.ipAddress,
            userAgent: data.userAgent
          });
          await guest.save();
          guests.push(guest);
        }
        
        // All guest IDs should be unique
        const guestIds = guests.map(g => g.guestId);
        const uniqueIds = new Set(guestIds);
        expect(uniqueIds.size).toBe(guestIds.length);
        
        // All guest IDs should follow the pattern
        guestIds.forEach(id => {
          expect(id).toMatch(/^guest_[a-f0-9]{32}$/);
        });
        
        // Verify database uniqueness constraint
        const dbGuests = await Guest.find({});
        expect(dbGuests.length).toBe(guests.length);
      }
    ), { numRuns: 10 });
  });

  test('Property 5a: Action recording and limits', () => {
    // Feature: emergency-incident-platform, Property 5: Guest action management
    fc.assert(fc.asyncProperty(
      fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1'),
        actions: fc.array(fc.record({
          type: fc.constantFrom('incident_report', 'incident_view', 'media_upload', 'page_view'),
          details: fc.object()
        }), { minLength: 1, maxLength: 15 })
      }),
      async (testData) => {
        // Create guest
        const guest = new Guest({
          ipAddress: testData.ipAddress,
          userAgent: 'Test Browser'
        });
        await guest.save();
        
        let successfulActions = 0;
        const maxDailyActions = guest.getMaxDailyActions();
        
        // Record actions up to the limit
        for (const actionData of testData.actions) {
          try {
            if (guest.canPerformAction && successfulActions < maxDailyActions) {
              await guest.recordAction(actionData.type, actionData.details, {
                ip: testData.ipAddress,
                get: () => 'Test Browser'
              });
              successfulActions++;
              
              // Verify action was recorded
              expect(guest.totalActions).toBe(successfulActions);
              expect(guest.dailyActions).toBe(successfulActions);
              expect(guest.actions.length).toBe(successfulActions);
              
              // Verify action details
              const lastAction = guest.actions[guest.actions.length - 1];
              expect(lastAction.action).toBe(actionData.type);
              expect(lastAction.ipAddress).toBe(testData.ipAddress);
            } else {
              // Should fail when limit is reached
              await expect(guest.recordAction(actionData.type, actionData.details, {
                ip: testData.ipAddress
              })).rejects.toThrow();
            }
          } catch (error) {
            // Expected when limits are exceeded
            expect(error.message).toContain('limit exceeded');
          }
        }
        
        // Verify final state
        expect(guest.totalActions).toBe(successfulActions);
        expect(guest.dailyActions).toBe(successfulActions);
        expect(guest.remainingDailyActions).toBe(Math.max(0, maxDailyActions - successfulActions));
      }
    ), { numRuns: 8 });
  });

  test('Property 5b: Session management lifecycle', () => {
    // Feature: emergency-incident-platform, Property 5: Guest action management
    fc.assert(fc.asyncProperty(
      fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1'),
        sessionDurationMinutes: fc.integer({ min: 1, max: 480 }) // 1 minute to 8 hours
      }),
      async (testData) => {
        // Create guest with active session
        const guest = new Guest({
          ipAddress: testData.ipAddress,
          userAgent: 'Test Browser'
        });
        await guest.save();
        
        // Verify initial session state
        expect(guest.isSessionActive).toBe(true);
        expect(guest.sessionStartTime).toBeDefined();
        expect(guest.sessionEndTime).toBeUndefined();
        expect(guest.sessionId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
        
        // Simulate session activity
        const startTime = guest.sessionStartTime;
        const simulatedEndTime = new Date(startTime.getTime() + testData.sessionDurationMinutes * 60 * 1000);
        
        // End session
        guest.sessionEndTime = simulatedEndTime;
        await guest.endSession();
        
        // Verify session ended properly
        expect(guest.isSessionActive).toBe(false);
        expect(guest.sessionEndTime).toBeDefined();
        
        // Verify session duration calculation
        const expectedDuration = Math.floor((simulatedEndTime - startTime) / 1000);
        expect(guest.sessionDuration).toBeCloseTo(expectedDuration, 0);
        
        // Verify guest cannot perform actions after session ends
        expect(guest.canPerformAction).toBe(false);
      }
    ), { numRuns: 10 });
  });

  test('Property 5c: Blocking and unblocking functionality', () => {
    // Feature: emergency-incident-platform, Property 5: Guest action management
    fc.assert(fc.asyncProperty(
      fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1'),
        blockReason: fc.string({ minLength: 5, maxLength: 50 }),
        blockDurationHours: fc.integer({ min: 1, max: 72 })
      }),
      async (testData) => {
        // Create guest
        const guest = new Guest({
          ipAddress: testData.ipAddress,
          userAgent: 'Test Browser'
        });
        await guest.save();
        
        // Verify guest can initially perform actions
        expect(guest.canPerformAction).toBe(true);
        expect(guest.isBlocked).toBe(false);
        
        // Block guest
        await guest.blockGuest(testData.blockReason, testData.blockDurationHours);
        
        // Verify blocking state
        expect(guest.isBlocked).toBe(true);
        expect(guest.blockReason).toBe(testData.blockReason);
        expect(guest.blockedAt).toBeDefined();
        expect(guest.blockExpiresAt).toBeDefined();
        expect(guest.canPerformAction).toBe(false);
        
        // Verify block expiration time
        const expectedExpiration = new Date(guest.blockedAt.getTime() + testData.blockDurationHours * 60 * 60 * 1000);
        expect(guest.blockExpiresAt.getTime()).toBeCloseTo(expectedExpiration.getTime(), 1000);
        
        // Unblock guest
        await guest.unblockGuest();
        
        // Verify unblocking state
        expect(guest.isBlocked).toBe(false);
        expect(guest.blockReason).toBeUndefined();
        expect(guest.blockedAt).toBeUndefined();
        expect(guest.blockExpiresAt).toBeUndefined();
        expect(guest.canPerformAction).toBe(true);
      }
    ), { numRuns: 10 });
  });

  test('Property 5d: Daily action reset functionality', () => {
    // Feature: emergency-incident-platform, Property 5: Guest action management
    fc.assert(fc.asyncProperty(
      fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1'),
        initialActions: fc.integer({ min: 1, max: 5 })
      }),
      async (testData) => {
        // Create guest
        const guest = new Guest({
          ipAddress: testData.ipAddress,
          userAgent: 'Test Browser'
        });
        await guest.save();
        
        // Record some initial actions
        for (let i = 0; i < testData.initialActions; i++) {
          await guest.recordAction('page_view', {}, { ip: testData.ipAddress });
        }
        
        // Verify initial state
        expect(guest.dailyActions).toBe(testData.initialActions);
        expect(guest.totalActions).toBe(testData.initialActions);
        
        // Simulate next day by setting lastDailyReset to yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        guest.lastDailyReset = yesterday;
        
        // Record another action (should trigger daily reset)
        await guest.recordAction('page_view', {}, { ip: testData.ipAddress });
        
        // Verify daily reset occurred
        expect(guest.dailyActions).toBe(1); // Only the new action
        expect(guest.totalActions).toBe(testData.initialActions + 1); // Total should include all
        
        // Verify reset date was updated
        const today = new Date();
        expect(guest.lastDailyReset.toDateString()).toBe(today.toDateString());
      }
    ), { numRuns: 10 });
  });

  test('Property 5e: User conversion tracking', () => {
    // Feature: emergency-incident-platform, Property 5: Guest action management
    fc.assert(fc.asyncProperty(
      fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1'),
        userId: fc.string({ minLength: 24, maxLength: 24 }) // MongoDB ObjectId length
      }),
      async (testData) => {
        // Create guest
        const guest = new Guest({
          ipAddress: testData.ipAddress,
          userAgent: 'Test Browser'
        });
        await guest.save();
        
        // Verify initial conversion state
        expect(guest.convertedToUser).toBe(false);
        expect(guest.convertedUserId).toBeUndefined();
        expect(guest.convertedAt).toBeUndefined();
        expect(guest.isSessionActive).toBe(true);
        
        // Convert guest to user
        const mockUserId = new mongoose.Types.ObjectId(testData.userId);
        await guest.convertToUser(mockUserId);
        
        // Verify conversion state
        expect(guest.convertedToUser).toBe(true);
        expect(guest.convertedUserId.toString()).toBe(mockUserId.toString());
        expect(guest.convertedAt).toBeDefined();
        expect(guest.isSessionActive).toBe(false);
        expect(guest.sessionEndTime).toBeDefined();
        
        // Verify conversion timestamp is recent
        const now = new Date();
        const timeDiff = Math.abs(now - guest.convertedAt);
        expect(timeDiff).toBeLessThan(5000); // Within 5 seconds
      }
    ), { numRuns: 10 });
  });

  test('Property 5f: Action summary and statistics', () => {
    // Feature: emergency-incident-platform, Property 5: Guest action management
    fc.assert(fc.asyncProperty(
      fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1'),
        actionTypes: fc.array(fc.constantFrom('incident_report', 'incident_view', 'media_upload', 'page_view'), { minLength: 1, maxLength: 8 })
      }),
      async (testData) => {
        // Create guest
        const guest = new Guest({
          ipAddress: testData.ipAddress,
          userAgent: 'Test Browser'
        });
        await guest.save();
        
        // Record various actions
        const actionCounts = {};
        for (const actionType of testData.actionTypes) {
          await guest.recordAction(actionType, {}, { ip: testData.ipAddress });
          actionCounts[actionType] = (actionCounts[actionType] || 0) + 1;
        }
        
        // Get action summary
        const summary = guest.getActionSummary();
        
        // Verify summary accuracy
        expect(summary.totalActions).toBe(testData.actionTypes.length);
        expect(summary.dailyActions).toBe(testData.actionTypes.length);
        
        // Verify action breakdown
        Object.keys(actionCounts).forEach(actionType => {
          expect(summary.actionBreakdown[actionType]).toBe(actionCounts[actionType]);
        });
        
        // Verify other summary fields
        expect(summary.sessionDuration).toBeGreaterThanOrEqual(0);
        expect(summary.remainingDailyActions).toBeGreaterThanOrEqual(0);
        expect(typeof summary.incidentsReported).toBe('number');
        expect(typeof summary.mediaUploaded).toBe('number');
      }
    ), { numRuns: 8 });
  });

  test('Property 5g: IP address validation and tracking', () => {
    // Feature: emergency-incident-platform, Property 5: Guest action management
    fc.assert(fc.asyncProperty(
      fc.oneof(
        fc.constantFrom('192.168.1.1', '10.0.0.1', '172.16.0.1', '127.0.0.1'), // Valid IPv4
        fc.constantFrom('::1', '2001:db8::1'), // Valid IPv6
        fc.constantFrom('invalid.ip', '999.999.999.999', '') // Invalid IPs
      ),
      async (ipAddress) => {
        try {
          // Attempt to create guest with IP
          const guest = new Guest({
            ipAddress: ipAddress,
            userAgent: 'Test Browser'
          });
          
          // Validate IP format
          const isValidIPv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipAddress);
          const isValidIPv6 = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(ipAddress);
          const isLocalhost = ipAddress === '::1' || ipAddress === '127.0.0.1';
          
          if (isValidIPv4 || isValidIPv6 || isLocalhost) {
            // Valid IP should save successfully
            await guest.save();
            expect(guest.ipAddress).toBe(ipAddress);
            
            // Should be able to find by IP
            const foundGuests = await Guest.findActiveByIP(ipAddress);
            expect(foundGuests.length).toBeGreaterThan(0);
            expect(foundGuests[0].ipAddress).toBe(ipAddress);
          } else {
            // Invalid IP should fail validation
            await expect(guest.save()).rejects.toThrow();
          }
        } catch (error) {
          // Expected for invalid IPs
          expect(error.message).toContain('Invalid IP address format');
        }
      }
    ), { numRuns: 15 });
  });

});

describe('Guest Model Static Methods', () => {

  beforeEach(async () => {
    await Guest.deleteMany({});
  });

  test('Property: Guest statistics aggregation', () => {
    fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1', '172.16.0.1'),
        isActive: fc.boolean(),
        isBlocked: fc.boolean(),
        convertedToUser: fc.boolean(),
        totalActions: fc.integer({ min: 0, max: 50 }),
        incidentsReported: fc.integer({ min: 0, max: 10 })
      }), { minLength: 1, maxLength: 10 }),
      async (guestData) => {
        // Create guests with various states
        const guests = [];
        for (const data of guestData) {
          const guest = new Guest({
            ipAddress: data.ipAddress,
            userAgent: 'Test Browser',
            isSessionActive: data.isActive,
            isBlocked: data.isBlocked,
            convertedToUser: data.convertedToUser,
            totalActions: data.totalActions,
            incidentsReported: data.incidentsReported
          });
          await guest.save();
          guests.push(guest);
        }
        
        // Get statistics
        const stats = await Guest.getGuestStats();
        
        // Verify statistics accuracy
        expect(stats.totalGuests).toBe(guests.length);
        expect(stats.activeGuests).toBe(guests.filter(g => g.isSessionActive).length);
        expect(stats.blockedGuests).toBe(guests.filter(g => g.isBlocked).length);
        expect(stats.convertedGuests).toBe(guests.filter(g => g.convertedToUser).length);
        expect(stats.totalActions).toBe(guests.reduce((sum, g) => sum + g.totalActions, 0));
        expect(stats.totalIncidents).toBe(guests.reduce((sum, g) => sum + g.incidentsReported, 0));
      }
    ), { numRuns: 8 });
  });

  test('Property: Session cleanup functionality', () => {
    fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1'),
        hoursAgo: fc.integer({ min: 1, max: 48 })
      }), { minLength: 1, maxLength: 5 }),
      async (guestData) => {
        // Create guests with different last action times
        const guests = [];
        for (const data of guestData) {
          const guest = new Guest({
            ipAddress: data.ipAddress,
            userAgent: 'Test Browser',
            isSessionActive: true
          });
          
          // Set last action time to hours ago
          const lastActionTime = new Date(Date.now() - data.hoursAgo * 60 * 60 * 1000);
          guest.lastActionAt = lastActionTime;
          
          await guest.save();
          guests.push({ guest, hoursAgo: data.hoursAgo });
        }
        
        // Run cleanup (sessions older than 24 hours should be deactivated)
        const result = await Guest.cleanupExpiredSessions();
        
        // Verify cleanup results
        const expiredCount = guests.filter(g => g.hoursAgo > 24).length;
        expect(result.modifiedCount).toBe(expiredCount);
        
        // Verify session states after cleanup
        for (const { guest, hoursAgo } of guests) {
          const updatedGuest = await Guest.findById(guest._id);
          if (hoursAgo > 24) {
            expect(updatedGuest.isSessionActive).toBe(false);
            expect(updatedGuest.sessionEndTime).toBeDefined();
          } else {
            expect(updatedGuest.isSessionActive).toBe(true);
          }
        }
      }
    ), { numRuns: 8 });
  });

});