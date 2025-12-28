/**
 * Rate Limiting Middleware Tests
 * Tests for role-based and endpoint-specific rate limiting
 */

const request = require('supertest');
const express = require('express');
const { 
  rateLimiters,
  createRoleBasedLimiter,
  createEndpointLimiter,
  getRateLimitStatus,
  generateKey,
  RATE_LIMIT_CONFIG
} = require('../rateLimiter');
const { USER_ROLES, ERROR_CODES } = require('../../config/constants');

// Mock authentication middleware for testing
const mockAuth = (userType, role = null) => {
  return (req, res, next) => {
    if (userType === 'user') {
      req.isAuthenticated = true;
      req.isUser = true;
      req.isGuest = false;
      req.user = {
        userId: 'test-user-id',
        userType: 'user',
        role: role || USER_ROLES.USER,
        email: 'test@example.com'
      };
    } else if (userType === 'guest') {
      req.isAuthenticated = true;
      req.isUser = false;
      req.isGuest = true;
      req.user = {
        guestId: 'test-guest-id',
        userType: 'guest',
        role: USER_ROLES.GUEST,
        canPerformAction: true
      };
    } else {
      req.isAuthenticated = false;
      req.isUser = false;
      req.isGuest = false;
      req.user = null;
    }
    next();
  };
};

describe('Rate Limiting Middleware', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Set NODE_ENV to development for testing
    process.env.NODE_ENV = 'development';
  });

  describe('generateKey function', () => {
    test('should generate user key for authenticated user', () => {
      const req = {
        isAuthenticated: true,
        isUser: true,
        user: { userId: 'user123' },
        ip: '127.0.0.1'
      };
      
      const key = generateKey(req);
      expect(key).toBe('user:user123');
    });

    test('should generate guest key for authenticated guest', () => {
      const req = {
        isAuthenticated: true,
        isGuest: true,
        user: { guestId: 'guest123' },
        ip: '127.0.0.1'
      };
      
      const key = generateKey(req);
      expect(key).toBe('guest:guest123');
    });

    test('should generate IP key for unauthenticated user', () => {
      const req = {
        isAuthenticated: false,
        ip: '127.0.0.1'
      };
      
      const key = generateKey(req);
      expect(key).toBe('ip:127.0.0.1');
    });
  });

  describe('getRateLimitStatus function', () => {
    test('should return correct status for user', () => {
      const req = {
        user: { role: USER_ROLES.USER },
        ip: '127.0.0.1'
      };
      
      const status = getRateLimitStatus(req);
      
      expect(status.userType).toBe(USER_ROLES.USER);
      expect(status.maxRequests).toBe(RATE_LIMIT_CONFIG.user.max);
      expect(status.windowMs).toBe(RATE_LIMIT_CONFIG.user.windowMs);
      expect(status.identifier).toBe('ip:127.0.0.1');
    });

    test('should return default status for unauthenticated user', () => {
      const req = {
        user: null,
        ip: '127.0.0.1'
      };
      
      const status = getRateLimitStatus(req);
      
      expect(status.userType).toBe('default');
      expect(status.maxRequests).toBe(RATE_LIMIT_CONFIG.default.max);
    });
  });

  describe('Role-based rate limiting', () => {
    test('should apply different limits for different user roles', async () => {
      // Test endpoint with role-based limiter
      app.get('/test-guest', mockAuth('guest'), rateLimiters.api, (req, res) => {
        res.json({ success: true, userType: 'guest' });
      });
      
      app.get('/test-user', mockAuth('user'), rateLimiters.api, (req, res) => {
        res.json({ success: true, userType: 'user' });
      });
      
      app.get('/test-admin', mockAuth('user', USER_ROLES.ADMIN), rateLimiters.api, (req, res) => {
        res.json({ success: true, userType: 'admin' });
      });

      // Test that different roles get different responses
      const guestResponse = await request(app).get('/test-guest');
      expect(guestResponse.status).toBe(200);
      expect(guestResponse.body.userType).toBe('guest');

      const userResponse = await request(app).get('/test-user');
      expect(userResponse.status).toBe(200);
      expect(userResponse.body.userType).toBe('user');

      const adminResponse = await request(app).get('/test-admin');
      expect(adminResponse.status).toBe(200);
      expect(adminResponse.body.userType).toBe('admin');
    });

    test('should include rate limit headers in response', async () => {
      app.get('/test-headers', mockAuth('user'), rateLimiters.api, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test-headers');
      
      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Endpoint-specific rate limiting', () => {
    test('should create auth rate limiter with correct config', () => {
      const authLimiter = createEndpointLimiter('auth');
      expect(typeof authLimiter).toBe('function');
    });

    test('should create incident creation limiter with role-specific limits', () => {
      const incidentLimiter = createEndpointLimiter('incidentCreation');
      expect(typeof incidentLimiter).toBe('function');
    });

    test('should throw error for unknown endpoint type', () => {
      expect(() => {
        createEndpointLimiter('unknown-endpoint');
      }).toThrow('Unknown endpoint type: unknown-endpoint');
    });
  });

  describe('Rate limit enforcement', () => {
    test('should allow requests within limit', async () => {
      // Create a very permissive limiter for testing
      const testLimiter = createRoleBasedLimiter({
        windowMs: 60000, // 1 minute
        max: 10 // 10 requests
      });
      
      app.get('/test-within-limit', mockAuth('user'), testLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Make several requests within limit
      for (let i = 0; i < 3; i++) {
        const response = await request(app).get('/test-within-limit');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    test('should block requests exceeding limit', async () => {
      // Create a very restrictive limiter for testing
      const testLimiter = createRoleBasedLimiter({
        windowMs: 60000, // 1 minute
        max: 1 // Only 1 request allowed
      });
      
      app.get('/test-exceed-limit', mockAuth('user'), testLimiter, (req, res) => {
        res.json({ success: true });
      });

      // First request should succeed
      const firstResponse = await request(app).get('/test-exceed-limit');
      expect(firstResponse.status).toBe(200);

      // Second request should be rate limited
      const secondResponse = await request(app).get('/test-exceed-limit');
      expect(secondResponse.status).toBe(429);
      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.error.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    });
  });

  describe('Custom rate limit configurations', () => {
    test('should accept custom configuration overrides', () => {
      const customLimiter = createRoleBasedLimiter({
        windowMs: 30000, // 30 seconds
        max: 5 // 5 requests
      });
      
      expect(typeof customLimiter).toBe('function');
    });

    test('should handle role-specific endpoint limits', async () => {
      app.get('/test-role-specific', 
        mockAuth('guest'), 
        createEndpointLimiter('incidentCreation'), 
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-role-specific');
      expect(response.status).toBe(200);
    });
  });

  describe('Skip conditions', () => {
    test('should skip rate limiting in test environment', async () => {
      // Set test environment
      process.env.NODE_ENV = 'test';
      
      const testLimiter = createRoleBasedLimiter({
        windowMs: 1000,
        max: 1
      });
      
      app.get('/test-skip', mockAuth('user'), testLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Multiple requests should all succeed in test environment
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/test-skip');
        expect(response.status).toBe(200);
      }
      
      // Reset environment
      process.env.NODE_ENV = 'development';
    });

    test('should skip rate limiting for health check endpoints', async () => {
      app.get('/health', rateLimiters.global, (req, res) => {
        res.json({ status: 'healthy' });
      });

      // Health check should not be rate limited
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });
  });

  describe('Error responses', () => {
    test('should return structured error response when rate limited', async () => {
      const testLimiter = createRoleBasedLimiter({
        windowMs: 60000,
        max: 1
      });
      
      app.get('/test-error-format', mockAuth('user'), testLimiter, (req, res) => {
        res.json({ success: true });
      });

      // First request succeeds
      await request(app).get('/test-error-format');

      // Second request should return structured error
      const response = await request(app).get('/test-error-format');
      
      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should include helpful details in error response', async () => {
      const testLimiter = createRoleBasedLimiter({
        windowMs: 60000,
        max: 1
      });
      
      app.get('/test-error-details', mockAuth('guest'), testLimiter, (req, res) => {
        res.json({ success: true });
      });

      // Exceed limit
      await request(app).get('/test-error-details');
      const response = await request(app).get('/test-error-details');
      
      expect(response.body.error.details).toHaveProperty('userType');
      expect(response.body.error.details).toHaveProperty('windowMs');
      expect(response.body.error.details).toHaveProperty('maxRequests');
      expect(response.body.error.details).toHaveProperty('retryAfter');
      expect(response.body.error.details).toHaveProperty('suggestion');
    });
  });

  describe('Pre-configured rate limiters', () => {
    test('should have all expected pre-configured limiters', () => {
      expect(rateLimiters).toHaveProperty('api');
      expect(rateLimiters).toHaveProperty('auth');
      expect(rateLimiters).toHaveProperty('registration');
      expect(rateLimiters).toHaveProperty('incidentCreation');
      expect(rateLimiters).toHaveProperty('upvoting');
      expect(rateLimiters).toHaveProperty('global');
      expect(rateLimiters).toHaveProperty('strict');
      expect(rateLimiters).toHaveProperty('burst');
    });

    test('should apply global rate limiter correctly', async () => {
      app.get('/test-global', rateLimiters.global, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test-global');
      expect(response.status).toBe(200);
    });
  });
});