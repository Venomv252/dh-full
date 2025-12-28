/**
 * Rate Limiting Configuration Property-Based Tests
 * 
 * Property-based tests for rate limiting configuration validation
 */

const fc = require('fast-check');
const { clearTestData } = require('../utils/testHelpers');
const { RATE_LIMIT_CONFIG, ENDPOINT_LIMITS, getRateLimitStatus } = require('../../src/middleware/rateLimiter');

describe('Rate Limiting Configuration Property Tests', () => {
  afterEach(async () => {
    await clearTestData();
  });

  /**
   * Feature: emergency-incident-platform, Property 16: Rate limiting enforcement
   * 
   * Property 16: Rate limiting enforcement
   * For any rate limiting configuration, the system should have properly
   * structured rate limits based on user type (guest, user, admin) with
   * appropriate limits and configuration parameters
   * 
   * Validates: Requirements 6.2
   */
  test('Property 16: Rate limiting configuration structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('guest', 'user', 'hospital', 'admin', 'default'),
        
        async (userType) => {
          try {
            const config = RATE_LIMIT_CONFIG[userType];
            
            // Test 1: Configuration exists
            expect(config).toBeDefined();
            expect(config).toBeInstanceOf(Object);
            
            // Test 2: Required properties are present and valid
            expect(config.windowMs).toBeDefined();
            expect(typeof config.windowMs).toBe('number');
            expect(config.windowMs).toBeGreaterThan(0);
            expect(config.windowMs).toBeLessThanOrEqual(60 * 60 * 1000); // Max 1 hour
            
            expect(config.max).toBeDefined();
            expect(typeof config.max).toBe('number');
            expect(config.max).toBeGreaterThan(0);
            expect(config.max).toBeLessThanOrEqual(10000); // Reasonable upper limit
            
            expect(config.message).toBeDefined();
            expect(typeof config.message).toBe('string');
            expect(config.message.length).toBeGreaterThan(0);
            
            expect(config.standardHeaders).toBe(true);
            expect(config.legacyHeaders).toBe(false);
            
            // Test 3: User type hierarchy is maintained
            const guestLimit = RATE_LIMIT_CONFIG.guest.max;
            const userLimit = RATE_LIMIT_CONFIG.user.max;
            const adminLimit = RATE_LIMIT_CONFIG.admin.max;
            
            expect(guestLimit).toBeLessThan(userLimit);
            expect(userLimit).toBeLessThan(adminLimit);
            
            // Test 4: Specific user type validations
            if (userType === 'guest') {
              expect(config.max).toBeLessThanOrEqual(100); // Guests should have low limits
            }
            if (userType === 'admin') {
              expect(config.max).toBeGreaterThanOrEqual(500); // Admins should have high limits
            }
            
            return true;
          } catch (error) {
            console.error('Rate limiting configuration test error:', error.message);
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
   * Property: Endpoint-specific rate limit configuration
   * For any endpoint-specific rate limit, it should have valid configuration
   */
  test('Property: Endpoint rate limit configuration validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('auth', 'registration', 'incidentCreation', 'upvoting'),
        
        async (endpointType) => {
          try {
            const config = ENDPOINT_LIMITS[endpointType];
            
            // Test 1: Configuration exists
            expect(config).toBeDefined();
            expect(config).toBeInstanceOf(Object);
            
            // Test 2: Required properties are present
            expect(config.windowMs).toBeDefined();
            expect(typeof config.windowMs).toBe('number');
            expect(config.windowMs).toBeGreaterThan(0);
            
            expect(config.message).toBeDefined();
            expect(typeof config.message).toBe('string');
            expect(config.message.length).toBeGreaterThan(0);
            
            expect(config.standardHeaders).toBe(true);
            expect(config.legacyHeaders).toBe(false);
            
            // Test 3: Max property validation (can be number or object)
            expect(config.max).toBeDefined();
            if (typeof config.max === 'number') {
              expect(config.max).toBeGreaterThan(0);
            } else if (typeof config.max === 'object') {
              expect(config.max.guest).toBeDefined();
              expect(config.max.user).toBeDefined();
              expect(typeof config.max.guest).toBe('number');
              expect(typeof config.max.user).toBe('number');
              expect(config.max.guest).toBeGreaterThan(0);
              expect(config.max.user).toBeGreaterThan(0);
            }
            
            // Test 4: Endpoint-specific validations
            if (endpointType === 'auth') {
              // Auth endpoints should have very low limits
              const maxLimit = typeof config.max === 'number' ? config.max : Math.max(...Object.values(config.max));
              expect(maxLimit).toBeLessThanOrEqual(10);
            }
            
            if (endpointType === 'registration') {
              // Registration should have low limits and longer windows
              expect(config.windowMs).toBeGreaterThanOrEqual(30 * 60 * 1000); // At least 30 minutes
            }
            
            return true;
          } catch (error) {
            console.error('Endpoint rate limit configuration test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 8,
        timeout: 15000
      }
    );
  }, 20000);

  /**
   * Property: Rate limit status generation consistency
   * For any request context, the rate limit status should be consistent and valid
   */
  test('Property: Rate limit status generation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userRole: fc.constantFrom('guest', 'user', 'hospital', 'admin', 'default'),
          ipAddress: fc.ipV4()
        }),
        
        async (scenario) => {
          try {
            // Create mock request object
            const mockReq = {
              ip: scenario.ipAddress,
              user: scenario.userRole !== 'default' ? { role: scenario.userRole } : null
            };
            
            // Test rate limit status generation
            const status = getRateLimitStatus(mockReq);
            
            // Test 1: Status object structure
            expect(status).toBeDefined();
            expect(status).toBeInstanceOf(Object);
            expect(status).toHaveProperty('userType');
            expect(status).toHaveProperty('windowMs');
            expect(status).toHaveProperty('maxRequests');
            expect(status).toHaveProperty('identifier');
            expect(status).toHaveProperty('resetTime');
            
            // Test 2: Property value validation
            expect(typeof status.userType).toBe('string');
            expect(typeof status.windowMs).toBe('number');
            expect(typeof status.maxRequests).toBe('number');
            expect(typeof status.identifier).toBe('string');
            expect(typeof status.resetTime).toBe('string');
            
            expect(status.windowMs).toBeGreaterThan(0);
            expect(status.maxRequests).toBeGreaterThan(0);
            expect(status.identifier.length).toBeGreaterThan(0);
            
            // Test 3: Reset time is valid ISO string
            expect(() => new Date(status.resetTime)).not.toThrow();
            const resetDate = new Date(status.resetTime);
            expect(resetDate.getTime()).toBeGreaterThan(Date.now());
            
            // Test 4: User type consistency
            const expectedUserType = scenario.userRole !== 'default' ? scenario.userRole : 'default';
            expect(status.userType).toBe(expectedUserType);
            
            // Test 5: Identifier format validation
            expect(status.identifier).toMatch(/^ip:/); // Should always be IP-based in this test
            expect(status.identifier).toContain(scenario.ipAddress);
            
            return true;
          } catch (error) {
            console.error('Rate limit status generation test error:', error.message);
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
   * Property: Rate limit configuration consistency across user types
   * For any pair of user types, their rate limits should follow logical hierarchy
   */
  test('Property: Rate limit hierarchy consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.constantFrom('guest', 'user', 'hospital', 'admin'),
          fc.constantFrom('guest', 'user', 'hospital', 'admin')
        ),
        
        async ([userType1, userType2]) => {
          try {
            const config1 = RATE_LIMIT_CONFIG[userType1];
            const config2 = RATE_LIMIT_CONFIG[userType2];
            
            // Test 1: Both configurations exist
            expect(config1).toBeDefined();
            expect(config2).toBeDefined();
            
            // Test 2: Hierarchy rules
            const hierarchy = ['guest', 'user', 'hospital', 'admin'];
            const index1 = hierarchy.indexOf(userType1);
            const index2 = hierarchy.indexOf(userType2);
            
            if (index1 < index2) {
              // Lower privilege should have lower or equal limits
              expect(config1.max).toBeLessThanOrEqual(config2.max);
            } else if (index1 > index2) {
              // Higher privilege should have higher or equal limits
              expect(config1.max).toBeGreaterThanOrEqual(config2.max);
            } else {
              // Same user type should have same limits
              expect(config1.max).toBe(config2.max);
            }
            
            // Test 3: Window consistency (all should use same window for fairness)
            expect(config1.windowMs).toBe(config2.windowMs);
            
            return true;
          } catch (error) {
            console.error('Rate limit hierarchy test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 15,
        timeout: 15000
      }
    );
  }, 20000);
});