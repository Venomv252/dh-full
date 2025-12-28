/**
 * Rate Limiting Middleware
 * Implements different rate limits for guest, user, admin, and hospital roles
 * Uses express-rate-limit with Redis store support for production scaling
 */

const rateLimit = require('express-rate-limit');
const { USER_ROLES, ERROR_CODES, HTTP_STATUS } = require('../config/constants');

/**
 * Rate limit configurations for different user types
 */
const RATE_LIMIT_CONFIG = {
  // Guest users - most restrictive
  guest: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: 'Too many requests from guest user. Please register for higher limits.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Regular users - moderate limits
  user: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per window
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Hospital users - higher limits for emergency services
  hospital: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per window
    message: 'Rate limit exceeded. Contact support if this is an emergency.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Admin users - highest limits
  admin: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    message: 'Admin rate limit exceeded. Please contact system administrator.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Default/unauthenticated - very restrictive
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: 'Too many requests. Please authenticate for higher limits.',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

/**
 * Endpoint-specific rate limits for sensitive operations
 */
const ENDPOINT_LIMITS = {
  // Authentication endpoints - prevent brute force
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
  },
  
  // Registration endpoints - prevent spam
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: 'Too many registration attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Incident creation - prevent spam incidents
  incidentCreation: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: {
      guest: 2,    // Guests: 2 incidents per 5 minutes
      user: 10,    // Users: 10 incidents per 5 minutes
      hospital: 50, // Hospitals: 50 incidents per 5 minutes
      admin: 100   // Admins: 100 incidents per 5 minutes
    },
    message: 'Too many incident reports. Please wait before creating another.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Upvoting - prevent vote manipulation
  upvoting: {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: {
      guest: 5,   // Guests: 5 upvotes per minute
      user: 20,   // Users: 20 upvotes per minute
      hospital: 50, // Hospitals: 50 upvotes per minute
      admin: 100  // Admins: 100 upvotes per minute
    },
    message: 'Too many upvotes. Please wait before upvoting again.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Password reset - prevent abuse
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour per IP
    message: 'Too many password reset attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

/**
 * Custom key generator that considers user authentication
 * @param {object} req - Express request object
 * @returns {string} - Unique key for rate limiting
 */
const generateKey = (req) => {
  // Use user ID for authenticated users, IP for others
  if (req.isAuthenticated && req.user) {
    if (req.isUser) {
      return `user:${req.user.userId}`;
    } else if (req.isGuest) {
      return `guest:${req.user.guestId}`;
    }
  }
  
  // Fall back to IP address for unauthenticated requests
  return `ip:${req.ip}`;
};

/**
 * Custom handler for rate limit exceeded
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const rateLimitHandler = (req, res, next) => {
  const userType = req.user?.role || 'unauthenticated';
  const identifier = generateKey(req);
  
  // Log rate limit violation
  console.warn(`Rate limit exceeded for ${userType} (${identifier}) on ${req.method} ${req.path}`);
  
  // Send structured error response
  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    success: false,
    error: {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests',
      details: {
        userType,
        retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
        suggestion: userType === 'guest' ? 'Register as a user for higher limits' : 'Please wait before making more requests'
      }
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Skip rate limiting for certain conditions
 * @param {object} req - Express request object
 * @returns {boolean} - Whether to skip rate limiting
 */
const skipRateLimit = (req) => {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  
  // Skip for health check endpoints
  if (req.path === '/health' || req.path === '/ping') {
    return true;
  }
  
  // Skip for admin users on certain endpoints (optional)
  if (req.user?.role === USER_ROLES.ADMIN && req.path.startsWith('/api/admin/')) {
    return false; // Still apply limits but could be configured differently
  }
  
  return false;
};

/**
 * Create role-based rate limiter
 * @param {object} customConfig - Custom configuration overrides
 * @returns {function} - Express middleware function
 */
const createRoleBasedLimiter = (customConfig = {}) => {
  // Create limiters for each role at initialization time
  const limiters = {};
  
  Object.keys(RATE_LIMIT_CONFIG).forEach(role => {
    const config = {
      ...RATE_LIMIT_CONFIG[role],
      ...customConfig
    };
    
    limiters[role] = rateLimit({
      ...config,
      keyGenerator: generateKey,
      handler: rateLimitHandler,
      skip: skipRateLimit
    });
  });
  
  return (req, res, next) => {
    // Determine user role for rate limiting
    let userRole = 'default';
    
    if (req.isAuthenticated && req.user) {
      userRole = req.user.role || 'user';
    }
    
    // Add custom headers
    res.set({
      'X-RateLimit-Policy': `${userRole}-${RATE_LIMIT_CONFIG[userRole]?.max || RATE_LIMIT_CONFIG.default.max}-${RATE_LIMIT_CONFIG[userRole]?.windowMs || RATE_LIMIT_CONFIG.default.windowMs}ms`,
      'X-RateLimit-UserType': userRole
    });
    
    // Apply the appropriate rate limiter
    const limiter = limiters[userRole] || limiters.default;
    limiter(req, res, next);
  };
};

/**
 * Create endpoint-specific rate limiter
 * @param {string} endpointType - Type of endpoint (auth, registration, etc.)
 * @param {object} customConfig - Custom configuration overrides
 * @returns {function} - Express middleware function
 */
const createEndpointLimiter = (endpointType, customConfig = {}) => {
  const baseConfig = ENDPOINT_LIMITS[endpointType];
  
  if (!baseConfig) {
    throw new Error(`Unknown endpoint type: ${endpointType}`);
  }
  
  // Handle role-specific limits - create limiters for each role
  if (typeof baseConfig.max === 'object') {
    const limiters = {};
    
    Object.keys(baseConfig.max).forEach(role => {
      const config = {
        ...baseConfig,
        ...customConfig,
        max: baseConfig.max[role]
      };
      
      limiters[role] = rateLimit({
        ...config,
        keyGenerator: generateKey,
        handler: rateLimitHandler,
        skip: skipRateLimit
      });
    });
    
    return (req, res, next) => {
      const userRole = req.user?.role || 'guest';
      
      res.set({
        'X-RateLimit-Endpoint': endpointType,
        'X-RateLimit-Policy': `${endpointType}-${baseConfig.max[userRole] || baseConfig.max.guest}-${baseConfig.windowMs}ms`
      });
      
      const limiter = limiters[userRole] || limiters.guest;
      limiter(req, res, next);
    };
  } else {
    // Single rate limit for all users
    const config = { ...baseConfig, ...customConfig };
    const limiter = rateLimit({
      ...config,
      keyGenerator: generateKey,
      handler: rateLimitHandler,
      skip: skipRateLimit
    });
    
    return (req, res, next) => {
      res.set({
        'X-RateLimit-Endpoint': endpointType,
        'X-RateLimit-Policy': `${endpointType}-${config.max}-${config.windowMs}ms`
      });
      
      limiter(req, res, next);
    };
  }
};

/**
 * Global rate limiter for all requests
 * Applies basic rate limiting before authentication
 */
const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window per IP
  message: 'Too many requests from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: rateLimitHandler,
  skip: skipRateLimit
});

/**
 * Strict rate limiter for sensitive operations
 * Used for password resets, admin operations, etc.
 */
const strictRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: 'Too many sensitive operations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: skipRateLimit
});

/**
 * Burst rate limiter for high-frequency operations
 * Allows short bursts but prevents sustained abuse
 */
const burstRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Request rate too high. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: rateLimitHandler,
  skip: skipRateLimit
});

/**
 * Get rate limit status for a request
 * @param {object} req - Express request object
 * @returns {object} - Rate limit status information
 */
const getRateLimitStatus = (req) => {
  const userRole = req.user?.role || 'default';
  const config = RATE_LIMIT_CONFIG[userRole] || RATE_LIMIT_CONFIG.default;
  
  return {
    userType: userRole,
    windowMs: config.windowMs,
    maxRequests: config.max,
    identifier: generateKey(req),
    resetTime: new Date(Date.now() + config.windowMs).toISOString()
  };
};

/**
 * Middleware to add rate limit information to response headers
 */
const addRateLimitHeaders = (req, res, next) => {
  const status = getRateLimitStatus(req);
  
  res.set({
    'X-RateLimit-UserType': status.userType,
    'X-RateLimit-Window': status.windowMs.toString(),
    'X-RateLimit-Max': status.maxRequests.toString(),
    'X-RateLimit-Reset': status.resetTime
  });
  
  next();
};

// Pre-configured rate limiters for common use cases
const rateLimiters = {
  // General API rate limiting
  api: createRoleBasedLimiter(),
  
  // Authentication endpoints
  auth: createEndpointLimiter('auth'),
  
  // Registration endpoints
  registration: createEndpointLimiter('registration'),
  
  // Incident creation
  incidentCreation: createEndpointLimiter('incidentCreation'),
  
  // Upvoting
  upvoting: createEndpointLimiter('upvoting'),
  
  // Password reset
  passwordReset: createEndpointLimiter('passwordReset'),
  
  // Global rate limiting
  global: globalRateLimiter,
  
  // Strict rate limiting
  strict: strictRateLimiter,
  
  // Burst rate limiting
  burst: burstRateLimiter
};

module.exports = {
  // Main rate limiters
  rateLimiters,
  
  // Factory functions
  createRoleBasedLimiter,
  createEndpointLimiter,
  
  // Utility functions
  getRateLimitStatus,
  addRateLimitHeaders,
  generateKey,
  
  // Configuration
  RATE_LIMIT_CONFIG,
  ENDPOINT_LIMITS,
  
  // Individual limiters for direct use
  globalRateLimiter,
  strictRateLimiter,
  burstRateLimiter
};