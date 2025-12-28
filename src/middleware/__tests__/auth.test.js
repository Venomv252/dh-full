/**
 * Authentication Middleware Tests
 * Tests for JWT and guest authentication functionality
 */

const jwt = require('jsonwebtoken');
const { 
  authenticate, 
  requireAuth, 
  requireUserAuth, 
  optionalAuth,
  checkGuestActionLimit,
  generateUserToken,
  extractToken,
  extractGuestId,
  getUserContext
} = require('../auth');
const User = require('../../models/User');
const Guest = require('../../models/Guest');
const { USER_TYPES, ERROR_CODES } = require('../../config/constants');

// Mock the models
jest.mock('../../models/User');
jest.mock('../../models/Guest');

describe('Authentication Middleware', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      headers: {},
      user: null,
      isAuthenticated: false,
      isUser: false,
      isGuest: false
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('extractToken', () => {
    test('should extract token from Bearer format', () => {
      const token = extractToken('Bearer abc123');
      expect(token).toBe('abc123');
    });

    test('should extract token from direct format', () => {
      const token = extractToken('abc123');
      expect(token).toBe('abc123');
    });

    test('should return null for empty header', () => {
      const token = extractToken('');
      expect(token).toBe(null);
    });

    test('should return null for undefined header', () => {
      const token = extractToken(undefined);
      expect(token).toBe(null);
    });
  });

  describe('extractGuestId', () => {
    test('should extract guestId from x-guest-id header', () => {
      const headers = { 'x-guest-id': 'guest123' };
      const guestId = extractGuestId(headers);
      expect(guestId).toBe('guest123');
    });

    test('should extract guestId from guest-id header', () => {
      const headers = { 'guest-id': 'guest123' };
      const guestId = extractGuestId(headers);
      expect(guestId).toBe('guest123');
    });

    test('should extract guestId from guestid header', () => {
      const headers = { 'guestid': 'guest123' };
      const guestId = extractGuestId(headers);
      expect(guestId).toBe('guest123');
    });

    test('should return null when no guest headers present', () => {
      const headers = { 'authorization': 'Bearer token' };
      const guestId = extractGuestId(headers);
      expect(guestId).toBe(null);
    });
  });

  describe('generateUserToken', () => {
    test('should generate valid JWT token for user', () => {
      const user = {
        _id: 'user123',
        role: 'user',
        email: 'test@example.com'
      };

      const token = generateUserToken(user);
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe('user123');
      expect(decoded.userType).toBe(USER_TYPES.USER);
      expect(decoded.role).toBe('user');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('authenticate middleware', () => {
    test('should authenticate valid JWT token', async () => {
      const mockUser = {
        _id: 'user123',
        role: 'user',
        email: 'test@example.com',
        isActive: true
      };

      User.findById.mockResolvedValue(mockUser);
      
      const token = generateUserToken(mockUser);
      req.headers.authorization = `Bearer ${token}`;

      await authenticate(req, res, next);

      expect(req.isAuthenticated).toBe(true);
      expect(req.isUser).toBe(true);
      expect(req.isGuest).toBe(false);
      expect(req.user.userType).toBe(USER_TYPES.USER);
      expect(req.user.email).toBe('test@example.com');
      expect(next).toHaveBeenCalled();
    });

    test('should authenticate valid guest ID', async () => {
      const mockGuest = {
        guestId: 'guest123',
        actionCount: 5,
        maxActions: 10,
        canPerformAction: () => true,
        isActive: () => true
      };

      Guest.findByGuestId.mockResolvedValue(mockGuest);
      
      req.headers['x-guest-id'] = 'guest123';

      await authenticate(req, res, next);

      expect(req.isAuthenticated).toBe(true);
      expect(req.isUser).toBe(false);
      expect(req.isGuest).toBe(true);
      expect(req.user.userType).toBe(USER_TYPES.GUEST);
      expect(req.user.guestId).toBe('guest123');
      expect(next).toHaveBeenCalled();
    });

    test('should handle invalid JWT token', async () => {
      req.headers.authorization = 'Bearer invalid-token';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ERROR_CODES.INVALID_TOKEN
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle invalid guest ID', async () => {
      Guest.findByGuestId.mockResolvedValue(null);
      
      req.headers['x-guest-id'] = 'invalid-guest';

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ERROR_CODES.GUEST_NOT_FOUND
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should continue without authentication when no credentials provided', async () => {
      await authenticate(req, res, next);

      expect(req.isAuthenticated).toBe(false);
      expect(req.user).toBe(null);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireAuth middleware', () => {
    test('should pass when user is authenticated', () => {
      req.isAuthenticated = true;
      req.user = { userType: USER_TYPES.USER };

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject when user is not authenticated', () => {
      req.isAuthenticated = false;

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ERROR_CODES.UNAUTHORIZED_ACCESS
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireUserAuth middleware', () => {
    test('should pass when registered user is authenticated', () => {
      req.isAuthenticated = true;
      req.isUser = true;
      req.user = { userType: USER_TYPES.USER };

      requireUserAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject guest users', () => {
      req.isAuthenticated = true;
      req.isGuest = true;
      req.isUser = false;
      req.user = { userType: USER_TYPES.GUEST };

      requireUserAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ERROR_CODES.UNAUTHORIZED_ACCESS
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated users', () => {
      req.isAuthenticated = false;

      requireUserAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('checkGuestActionLimit middleware', () => {
    test('should pass when guest can perform actions', () => {
      req.isGuest = true;
      req.user = {
        canPerformAction: true,
        actionCount: 5,
        maxActions: 10
      };

      checkGuestActionLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject when guest has reached action limit', () => {
      req.isGuest = true;
      req.user = {
        canPerformAction: false,
        actionCount: 10,
        maxActions: 10
      };

      checkGuestActionLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should pass for registered users', () => {
      req.isUser = true;
      req.isGuest = false;
      req.user = { userType: USER_TYPES.USER };

      checkGuestActionLimit(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('getUserContext', () => {
    test('should return user context for authenticated user', () => {
      req.isAuthenticated = true;
      req.isUser = true;
      req.user = {
        userType: USER_TYPES.USER,
        userId: 'user123',
        role: 'user',
        email: 'test@example.com'
      };

      const context = getUserContext(req);

      expect(context).toEqual({
        userType: USER_TYPES.USER,
        userId: 'user123',
        guestId: null,
        role: 'user',
        canPerformAction: true,
        actionCount: null,
        maxActions: null,
        email: 'test@example.com'
      });
    });

    test('should return guest context for authenticated guest', () => {
      req.isAuthenticated = true;
      req.isGuest = true;
      req.user = {
        userType: USER_TYPES.GUEST,
        guestId: 'guest123',
        role: 'guest',
        canPerformAction: true,
        actionCount: 5,
        maxActions: 10
      };

      const context = getUserContext(req);

      expect(context).toEqual({
        userType: USER_TYPES.GUEST,
        userId: null,
        guestId: 'guest123',
        role: 'guest',
        canPerformAction: true,
        actionCount: 5,
        maxActions: 10,
        email: null
      });
    });

    test('should return null for unauthenticated request', () => {
      req.isAuthenticated = false;

      const context = getUserContext(req);

      expect(context).toBe(null);
    });
  });
});