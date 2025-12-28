/**
 * Authentication Middleware
 * Handles JWT token validation for users and guestId validation for guests
 * Sets user context in request object for downstream middleware and controllers
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Guest = require('../models/Guest');
const { USER_TYPES, ERROR_CODES, HTTP_STATUS } = require('../config/constants');

// Import token blacklist checker
let isTokenBlacklisted;
try {
  const authController = require('../controllers/authController');
  isTokenBlacklisted = authController.isTokenBlacklisted;
} catch (error) {
  // Fallback if authController is not available
  isTokenBlacklisted = () => false;
}

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Extracted token or null
 */
const extractToken = (authHeader) => {
  if (!authHeader) return null;
  
  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return authHeader;
};

/**
 * Extract guestId from headers
 * @param {object} headers - Request headers
 * @returns {string|null} - Extracted guestId or null
 */
const extractGuestId = (headers) => {
  // Check multiple possible header names for flexibility
  return headers['x-guest-id'] || 
         headers['guest-id'] || 
         headers['guestid'] || 
         null;
};

/**
 * Verify JWT token and get user data
 * @param {string} token - JWT token to verify
 * @returns {Promise<object>} - User data from token
 */
const verifyJWTToken = async (token) => {
  try {
    // Check if token is blacklisted
    if (isTokenBlacklisted && isTokenBlacklisted(token)) {
      throw new Error('Token has been invalidated');
    }
    
    const jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
    
    // Verify the token
    const decoded = jwt.verify(token, jwtSecret);
    
    // Validate token structure
    if (!decoded.userId || !decoded.userType) {
      throw new Error('Invalid token structure');
    }
    
    // Get user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }
    
    return {
      userId: decoded.userId,
      userType: USER_TYPES.USER,
      role: user.role,
      email: user.email,
      exp: decoded.exp,
      iat: decoded.iat,
      user: user
    };
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else if (error.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    } else {
      throw error;
    }
  }
};

/**
 * Verify guest ID and get guest data
 * @param {string} guestId - Guest ID to verify
 * @returns {Promise<object>} - Guest data
 */
const verifyGuestId = async (guestId) => {
  try {
    if (!guestId) {
      throw new Error('Guest ID is required');
    }
    
    // Find guest in database
    const guest = await Guest.findByGuestId(guestId);
    if (!guest) {
      throw new Error('Guest not found');
    }
    
    // Check if guest is still active (optional - could be used for cleanup)
    if (!guest.isActive()) {
      // For now, we'll allow inactive guests but could implement stricter rules
      console.warn(`Inactive guest accessing system: ${guestId}`);
    }
    
    return {
      guestId: guest.guestId,
      userType: USER_TYPES.GUEST,
      role: USER_TYPES.GUEST,
      actionCount: guest.actionCount,
      maxActions: guest.maxActions,
      canPerformAction: guest.canPerformAction(),
      guest: guest
    };
    
  } catch (error) {
    throw error;
  }
};

/**
 * Main authentication middleware
 * Attempts to authenticate user via JWT token or guest ID
 * Sets req.user with authentication context
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const guestId = extractGuestId(req.headers);
    
    let authContext = null;
    
    // Try JWT authentication first (for registered users)
    if (authHeader) {
      try {
        const token = extractToken(authHeader);
        if (token) {
          authContext = await verifyJWTToken(token);
          console.log(`User authenticated: ${authContext.email} (${authContext.role})`);
        }
      } catch (jwtError) {
        // JWT authentication failed, but we might still have guest authentication
        console.warn('JWT authentication failed:', jwtError.message);
        
        // If we have a JWT token but it's invalid, return error
        // Don't fall back to guest authentication in this case
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: {
            code: ERROR_CODES.INVALID_TOKEN,
            message: 'Invalid or expired authentication token',
            details: { reason: jwtError.message }
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Try guest authentication if no valid JWT token
    if (!authContext && guestId) {
      try {
        authContext = await verifyGuestId(guestId);
        console.log(`Guest authenticated: ${authContext.guestId} (${authContext.actionCount}/${authContext.maxActions} actions)`);
      } catch (guestError) {
        console.warn('Guest authentication failed:', guestError.message);
        
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: {
            code: ERROR_CODES.GUEST_NOT_FOUND,
            message: 'Invalid guest ID',
            details: { reason: guestError.message }
          },
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Set authentication context in request
    req.user = authContext;
    req.isAuthenticated = !!authContext;
    req.isUser = authContext?.userType === USER_TYPES.USER;
    req.isGuest = authContext?.userType === USER_TYPES.GUEST;
    
    next();
    
  } catch (error) {
    console.error('Authentication middleware error:', error.message);
    
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Authentication system error',
        details: process.env.NODE_ENV === 'development' ? { error: error.message } : {}
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Require authentication middleware
 * Ensures that the request has valid authentication (user or guest)
 */
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED_ACCESS,
        message: 'Authentication required. Provide either a valid JWT token or guest ID.',
        details: {
          authMethods: ['JWT token in Authorization header', 'Guest ID in x-guest-id header']
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Require user authentication (registered users only)
 * Rejects guest users
 */
const requireUserAuth = (req, res, next) => {
  if (!req.isAuthenticated || !req.isUser) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED_ACCESS,
        message: 'Registered user authentication required',
        details: {
          required: 'Valid JWT token for registered user',
          provided: req.isGuest ? 'Guest authentication' : 'No authentication'
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Optional authentication middleware
 * Attempts authentication but doesn't require it
 * Useful for endpoints that work for both authenticated and anonymous users
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Run authentication but don't fail if it doesn't work
    await authenticate(req, res, () => {
      // Authentication succeeded or failed, but we continue either way
      next();
    });
  } catch (error) {
    // If authentication middleware itself fails, continue without auth
    req.user = null;
    req.isAuthenticated = false;
    req.isUser = false;
    req.isGuest = false;
    next();
  }
};

/**
 * Generate JWT token for user (for future use)
 * @param {object} user - User object
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - JWT token
 */
const generateUserToken = (user, expiresIn = '24h') => {
  const jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
  
  const payload = {
    userId: user._id,
    userType: USER_TYPES.USER,
    role: user.role,
    email: user.email,
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

/**
 * Refresh JWT token (for future use)
 * @param {string} token - Current JWT token
 * @returns {string} - New JWT token
 */
const refreshToken = async (token) => {
  try {
    const jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
    
    // Verify current token (even if expired)
    const decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true });
    
    // Get fresh user data
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate new token
    return generateUserToken(user);
    
  } catch (error) {
    throw new Error('Token refresh failed: ' + error.message);
  }
};

/**
 * Middleware to check if guest can perform actions
 * Used for endpoints that consume guest action limits
 */
const checkGuestActionLimit = (req, res, next) => {
  if (req.isGuest && req.user) {
    if (!req.user.canPerformAction) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED,
          message: 'Guest user has reached maximum action limit',
          details: {
            actionCount: req.user.actionCount,
            maxActions: req.user.maxActions,
            suggestion: 'Register as a user to continue using the service'
          }
        },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
};

/**
 * Get user context helper
 * Extracts user information for use in controllers
 * @param {object} req - Express request object
 * @returns {object} - User context object
 */
const getUserContext = (req) => {
  if (!req.isAuthenticated) {
    return null;
  }
  
  return {
    userType: req.user.userType,
    userId: req.isUser ? req.user.userId : null,
    guestId: req.isGuest ? req.user.guestId : null,
    role: req.user.role,
    canPerformAction: req.isGuest ? req.user.canPerformAction : true,
    actionCount: req.isGuest ? req.user.actionCount : null,
    maxActions: req.isGuest ? req.user.maxActions : null,
    email: req.isUser ? req.user.email : null
  };
};

module.exports = {
  authenticate,
  requireAuth,
  requireUserAuth,
  optionalAuth,
  checkGuestActionLimit,
  generateUserToken,
  refreshToken,
  getUserContext,
  
  // Helper functions (exported for testing)
  extractToken,
  extractGuestId,
  verifyJWTToken,
  verifyGuestId
};