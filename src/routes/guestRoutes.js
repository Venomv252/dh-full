/**
 * Guest Routes
 * API endpoints for guest user management and operations
 * Handles guest creation, action tracking, and administrative functions
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  createGuest,
  getGuest,
  incrementGuestAction,
  canGuestAct,
  getGuestStatistics,
  cleanupInactiveGuests,
  getActiveGuests
} = require('../controllers/guestController');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validators } = require('../middleware/validation');
const { roleCheckers, requireAdmin, addPermissionHeaders } = require('../middleware/roleCheck');
const Joi = require('joi');

/**
 * Additional validation schemas for guest routes
 */
const guestValidationSchemas = {
  // Guest ID parameter validation
  guestIdParam: Joi.object({
    guestId: Joi.string()
      .min(10)
      .max(50)
      .required()
      .pattern(/^[a-zA-Z0-9_-]+$/)
      .messages({
        'string.pattern.base': 'Guest ID must be alphanumeric with hyphens and underscores only'
      })
  }),
  
  // Action increment validation
  actionIncrement: Joi.object({
    actionType: Joi.string()
      .valid('incident_report', 'upvote', 'view', 'search', 'other')
      .optional()
      .default('other')
  }),
  
  // Cleanup query validation
  cleanupQuery: Joi.object({
    daysInactive: Joi.number()
      .integer()
      .min(1)
      .max(365)
      .default(7)
      .optional()
  }),
  
  // Active guests query validation
  activeGuestsQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
  })
};

/**
 * Create validation middleware for guest-specific schemas
 */
const validateGuestIdParam = (req, res, next) => {
  const { error, value } = guestValidationSchemas.guestIdParam.validate(req.params);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid guest ID format',
        details: {
          field: 'guestId',
          message: error.details[0].message,
          value: req.params.guestId
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  req.params = value;
  next();
};

const validateActionIncrement = (req, res, next) => {
  const { error, value } = guestValidationSchemas.actionIncrement.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid action increment data',
        details: {
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  req.body = value;
  next();
};

const validateCleanupQuery = (req, res, next) => {
  const { error, value } = guestValidationSchemas.cleanupQuery.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid cleanup parameters',
        details: {
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  req.query = value;
  next();
};

const validateActiveGuestsQuery = (req, res, next) => {
  const { error, value } = guestValidationSchemas.activeGuestsQuery.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid pagination parameters',
        details: {
          errors: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  req.query = value;
  next();
};

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * @route   POST /api/guest/create
 * @desc    Create new guest user
 * @access  Public
 * @rateLimit 3 per hour per IP (registration limit)
 */
router.post('/create',
  rateLimiters.registration,
  validators.guest.create,
  addPermissionHeaders('guests'),
  createGuest
);

// ============================================================================
// GUEST AUTHENTICATED ROUTES (Guest ID required)
// ============================================================================

/**
 * @route   GET /api/guest/:guestId
 * @desc    Get guest information by guestId
 * @access  Guest (own data) or Admin
 * @rateLimit Standard API limits based on user type
 */
router.get('/:guestId',
  rateLimiters.api,
  validateGuestIdParam,
  authenticate, // Sets req.isAuthenticated, req.user, req.isGuest
  roleCheckers.guests.read,
  addPermissionHeaders('guests'),
  getGuest
);

/**
 * @route   POST /api/guest/:guestId/action
 * @desc    Increment guest action count
 * @access  Guest (own data) or Admin
 * @rateLimit Burst limiting to prevent rapid action spam
 */
router.post('/:guestId/action',
  rateLimiters.burst,
  validateGuestIdParam,
  validateActionIncrement,
  authenticate,
  roleCheckers.guests.update,
  addPermissionHeaders('guests'),
  incrementGuestAction
);

/**
 * @route   GET /api/guest/:guestId/can-act
 * @desc    Check if guest can perform actions (without incrementing count)
 * @access  Guest (own data) or Admin
 * @rateLimit Standard API limits
 */
router.get('/:guestId/can-act',
  rateLimiters.api,
  validateGuestIdParam,
  authenticate,
  roleCheckers.guests.read,
  addPermissionHeaders('guests'),
  canGuestAct
);

// ============================================================================
// ADMIN ONLY ROUTES (Administrative functions)
// ============================================================================

/**
 * @route   GET /api/guest/stats
 * @desc    Get system-wide guest statistics
 * @access  Admin only
 * @rateLimit Standard API limits
 */
router.get('/stats',
  rateLimiters.api,
  authenticate,
  requireAdmin,
  addPermissionHeaders('guests'),
  getGuestStatistics
);

/**
 * @route   DELETE /api/guest/cleanup
 * @desc    Cleanup inactive guest records
 * @access  Admin only
 * @rateLimit Strict limiting for destructive operations
 */
router.delete('/cleanup',
  rateLimiters.strict,
  validateCleanupQuery,
  authenticate,
  requireAdmin,
  addPermissionHeaders('guests'),
  cleanupInactiveGuests
);

/**
 * @route   GET /api/guest/active
 * @desc    List active guests with pagination
 * @access  Admin only
 * @rateLimit Standard API limits
 */
router.get('/active',
  rateLimiters.api,
  validateActiveGuestsQuery,
  authenticate,
  requireAdmin,
  addPermissionHeaders('guests'),
  getActiveGuests
);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Route-specific error handler for guest routes
 */
router.use((error, req, res, next) => {
  // Log error for debugging
  console.error(`Guest Route Error: ${error.message}`, {
    path: req.path,
    method: req.method,
    guestId: req.params?.guestId,
    userType: req.user?.role || 'unauthenticated',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Handle specific guest-related errors
  if (error.code === 'GUEST_NOT_FOUND') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'GUEST_NOT_FOUND',
        message: 'Guest user not found',
        details: {
          guestId: req.params?.guestId,
          suggestion: 'Please create a new guest session'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'GUEST_ACTION_LIMIT_EXCEEDED') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'GUEST_ACTION_LIMIT_EXCEEDED',
        message: 'Guest has reached maximum action limit',
        details: {
          actionCount: error.details?.actionCount,
          maxActions: error.details?.maxActions,
          suggestion: 'Register as a user to continue using the service'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'GUEST_ID_GENERATION_ERROR') {
    return res.status(500).json({
      success: false,
      error: {
        code: 'GUEST_ID_GENERATION_ERROR',
        message: 'Failed to generate unique guest ID',
        details: {
          suggestion: 'Please try creating a guest session again'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Guest data validation failed',
        details: {
          errors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message
          }))
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_GUEST_ID',
        message: 'Guest ID already exists',
        details: {
          suggestion: 'Please try creating a guest session again'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack
      } : {}
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// ROUTE DOCUMENTATION AND METADATA
// ============================================================================

/**
 * Route metadata for API documentation
 */
router.routeInfo = {
  basePath: '/api/guest',
  description: 'Guest user management and operations',
  version: '1.0.0',
  routes: [
    {
      method: 'POST',
      path: '/create',
      description: 'Create new guest user session',
      access: 'Public',
      rateLimit: '3 per hour per IP'
    },
    {
      method: 'GET',
      path: '/:guestId',
      description: 'Get guest information',
      access: 'Guest (own data) or Admin',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'POST',
      path: '/:guestId/action',
      description: 'Increment guest action count',
      access: 'Guest (own data) or Admin',
      rateLimit: 'Burst limiting'
    },
    {
      method: 'GET',
      path: '/:guestId/can-act',
      description: 'Check guest action eligibility',
      access: 'Guest (own data) or Admin',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'GET',
      path: '/stats',
      description: 'Get guest statistics',
      access: 'Admin only',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'DELETE',
      path: '/cleanup',
      description: 'Cleanup inactive guests',
      access: 'Admin only',
      rateLimit: 'Strict limiting'
    },
    {
      method: 'GET',
      path: '/active',
      description: 'List active guests',
      access: 'Admin only',
      rateLimit: 'Standard API limits'
    }
  ]
};

module.exports = router;