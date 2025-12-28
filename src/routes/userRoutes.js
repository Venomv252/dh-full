/**
 * User Routes
 * API endpoints for user registration, profile management, and administrative functions
 * Handles comprehensive user operations with security and validation
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  registerUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  listUsers,
  getUserStatistics,
  updateUserRole,
  searchUsers
} = require('../controllers/userController');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validators } = require('../middleware/validation');
const { 
  roleCheckers, 
  requireAdmin, 
  requireRegisteredUser,
  addPermissionHeaders 
} = require('../middleware/roleCheck');
const Joi = require('joi');

/**
 * Additional validation schemas for user routes
 */
const userValidationSchemas = {
  // User ID parameter validation
  userIdParam: Joi.object({
    userId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid user ID format'
      })
  }),
  
  // Role update validation
  roleUpdate: Joi.object({
    role: Joi.string()
      .valid('user', 'admin', 'hospital')
      .required()
      .messages({
        'any.only': 'Role must be one of: user, admin, hospital'
      })
  }),
  
  // User search validation
  userSearch: Joi.object({
    email: Joi.string().email().optional(),
    role: Joi.string().valid('user', 'admin', 'hospital').optional(),
    ageRange: Joi.object({
      min: Joi.number().integer().min(0).max(150).optional(),
      max: Joi.number().integer().min(0).max(150).optional()
    }).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional(),
    hasEmergencyContacts: Joi.boolean().optional(),
    hasVehicles: Joi.boolean().optional(),
    hasInsurance: Joi.boolean().optional(),
    dateRange: Joi.object({
      start: Joi.date().iso().optional(),
      end: Joi.date().iso().min(Joi.ref('start')).optional()
    }).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),
  
  // User list query validation
  userListQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    role: Joi.string().valid('user', 'admin', 'hospital').optional(),
    search: Joi.string().max(100).optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'email', 'role').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Delete user query validation
  deleteUserQuery: Joi.object({
    permanent: Joi.boolean().default(false)
  })
};

/**
 * Create validation middleware for user-specific schemas
 */
const validateUserIdParam = (req, res, next) => {
  const { error, value } = userValidationSchemas.userIdParam.validate(req.params);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid user ID format',
        details: {
          field: 'userId',
          message: error.details[0].message,
          value: req.params.userId
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  req.params = value;
  next();
};

const validateRoleUpdate = (req, res, next) => {
  const { error, value } = userValidationSchemas.roleUpdate.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid role update data',
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

const validateUserSearch = (req, res, next) => {
  const { error, value } = userValidationSchemas.userSearch.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid search parameters',
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

const validateUserListQuery = (req, res, next) => {
  const { error, value } = userValidationSchemas.userListQuery.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
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

const validateDeleteUserQuery = (req, res, next) => {
  const { error, value } = userValidationSchemas.deleteUserQuery.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid delete parameters',
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
 * @route   POST /api/user/register
 * @desc    Register new user account
 * @access  Public
 * @rateLimit 3 per hour per IP (registration limit)
 */
router.post('/register',
  rateLimiters.registration,
  validators.user.register,
  addPermissionHeaders('users'),
  registerUser
);

// ============================================================================
// AUTHENTICATED USER ROUTES (Registered users only)
// ============================================================================

/**
 * @route   GET /api/user/:userId
 * @desc    Get user profile by ID
 * @access  User (own profile) or Admin
 * @rateLimit Standard API limits
 */
router.get('/:userId',
  rateLimiters.api,
  validateUserIdParam,
  authenticate,
  requireRegisteredUser,
  roleCheckers.users.read,
  addPermissionHeaders('users'),
  getUserProfile
);

/**
 * @route   PUT /api/user/:userId
 * @desc    Update user profile
 * @access  User (own profile) or Admin
 * @rateLimit Standard API limits
 */
router.put('/:userId',
  rateLimiters.api,
  validateUserIdParam,
  validators.user.updateProfile,
  authenticate,
  requireRegisteredUser,
  roleCheckers.users.update,
  addPermissionHeaders('users'),
  updateUserProfile
);

/**
 * @route   DELETE /api/user/:userId
 * @desc    Delete user account (soft delete by default, hard delete for admin)
 * @access  User (own account) or Admin
 * @rateLimit Strict limiting for destructive operations
 */
router.delete('/:userId',
  rateLimiters.strict,
  validateUserIdParam,
  validateDeleteUserQuery,
  authenticate,
  requireRegisteredUser,
  roleCheckers.users.delete,
  addPermissionHeaders('users'),
  deleteUser
);

// ============================================================================
// ADMIN ONLY ROUTES (Administrative functions)
// ============================================================================

/**
 * @route   GET /api/user/list
 * @desc    List all users with pagination and filtering
 * @access  Admin only
 * @rateLimit Standard API limits
 */
router.get('/list',
  rateLimiters.api,
  validateUserListQuery,
  authenticate,
  requireAdmin,
  addPermissionHeaders('users'),
  listUsers
);

/**
 * @route   GET /api/user/stats
 * @desc    Get system-wide user statistics
 * @access  Admin only
 * @rateLimit Standard API limits
 */
router.get('/stats',
  rateLimiters.api,
  authenticate,
  requireAdmin,
  addPermissionHeaders('users'),
  getUserStatistics
);

/**
 * @route   PATCH /api/user/:userId/role
 * @desc    Update user role
 * @access  Admin only
 * @rateLimit Strict limiting for role changes
 */
router.patch('/:userId/role',
  rateLimiters.strict,
  validateUserIdParam,
  validateRoleUpdate,
  authenticate,
  requireAdmin,
  addPermissionHeaders('users'),
  updateUserRole
);

/**
 * @route   POST /api/user/search
 * @desc    Advanced user search with multiple criteria
 * @access  Admin only
 * @rateLimit Standard API limits
 */
router.post('/search',
  rateLimiters.api,
  validateUserSearch,
  authenticate,
  requireAdmin,
  addPermissionHeaders('users'),
  searchUsers
);

// ============================================================================
// UTILITY ROUTES
// ============================================================================

/**
 * @route   GET /api/user/me
 * @desc    Get current user's profile (convenience endpoint)
 * @access  Authenticated users
 * @rateLimit Standard API limits
 */
router.get('/me',
  rateLimiters.api,
  authenticate,
  requireRegisteredUser,
  addPermissionHeaders('users'),
  (req, res, next) => {
    // Redirect to getUserProfile with current user's ID
    req.params.userId = req.user.userId;
    getUserProfile(req, res, next);
  }
);

/**
 * @route   PUT /api/user/me
 * @desc    Update current user's profile (convenience endpoint)
 * @access  Authenticated users
 * @rateLimit Standard API limits
 */
router.put('/me',
  rateLimiters.api,
  validators.user.updateProfile,
  authenticate,
  requireRegisteredUser,
  addPermissionHeaders('users'),
  (req, res, next) => {
    // Redirect to updateUserProfile with current user's ID
    req.params.userId = req.user.userId;
    updateUserProfile(req, res, next);
  }
);

/**
 * @route   DELETE /api/user/me
 * @desc    Delete current user's account (convenience endpoint)
 * @access  Authenticated users
 * @rateLimit Strict limiting for account deletion
 */
router.delete('/me',
  rateLimiters.strict,
  validateDeleteUserQuery,
  authenticate,
  requireRegisteredUser,
  addPermissionHeaders('users'),
  (req, res, next) => {
    // Redirect to deleteUser with current user's ID
    req.params.userId = req.user.userId;
    deleteUser(req, res, next);
  }
);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Route-specific error handler for user routes
 */
router.use((error, req, res, next) => {
  // Log error for debugging
  console.error(`User Route Error: ${error.message}`, {
    path: req.path,
    method: req.method,
    userId: req.params?.userId,
    userRole: req.user?.role || 'unauthenticated',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Handle specific user-related errors
  if (error.code === 'USER_NOT_FOUND') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        details: {
          userId: req.params?.userId,
          suggestion: 'Please verify the user ID is correct'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'EMAIL_ALREADY_EXISTS') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'Email address is already registered',
        details: {
          email: error.details?.email,
          suggestion: 'Please use a different email address or try logging in'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'PHONE_ALREADY_EXISTS') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'PHONE_ALREADY_EXISTS',
        message: 'Phone number is already registered',
        details: {
          suggestion: 'Please use a different phone number or contact support'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'INSUFFICIENT_PERMISSIONS') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'You do not have permission to perform this action',
        details: {
          userRole: req.user?.role,
          requiredPermission: error.details?.requiredPermission,
          suggestion: 'Contact an administrator if you believe this is an error'
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
        message: 'User data validation failed',
        details: {
          errors: Object.keys(error.errors).map(key => ({
            field: key,
            message: error.errors[key].message,
            value: error.errors[key].value
          }))
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    const fieldName = field === 'email' ? 'Email address' : 'Field';
    
    return res.status(409).json({
      success: false,
      error: {
        code: field === 'email' ? 'EMAIL_ALREADY_EXISTS' : 'DUPLICATE_VALUE',
        message: `${fieldName} already exists`,
        details: {
          field,
          suggestion: field === 'email' 
            ? 'Please use a different email address or try logging in'
            : 'Please use a different value for this field'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  // Handle encryption/decryption errors
  if (error.code === 'ENCRYPTION_ERROR') {
    return res.status(500).json({
      success: false,
      error: {
        code: 'ENCRYPTION_ERROR',
        message: 'Data encryption/decryption failed',
        details: {
          suggestion: 'Please try again or contact support if the problem persists'
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
  basePath: '/api/user',
  description: 'User registration, profile management, and administrative functions',
  version: '1.0.0',
  routes: [
    {
      method: 'POST',
      path: '/register',
      description: 'Register new user account',
      access: 'Public',
      rateLimit: '3 per hour per IP'
    },
    {
      method: 'GET',
      path: '/:userId',
      description: 'Get user profile by ID',
      access: 'User (own profile) or Admin',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'PUT',
      path: '/:userId',
      description: 'Update user profile',
      access: 'User (own profile) or Admin',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'DELETE',
      path: '/:userId',
      description: 'Delete user account',
      access: 'User (own account) or Admin',
      rateLimit: 'Strict limiting'
    },
    {
      method: 'GET',
      path: '/list',
      description: 'List all users with filtering',
      access: 'Admin only',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'GET',
      path: '/stats',
      description: 'Get user statistics',
      access: 'Admin only',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'PATCH',
      path: '/:userId/role',
      description: 'Update user role',
      access: 'Admin only',
      rateLimit: 'Strict limiting'
    },
    {
      method: 'POST',
      path: '/search',
      description: 'Advanced user search',
      access: 'Admin only',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'GET',
      path: '/me',
      description: 'Get current user profile',
      access: 'Authenticated users',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'PUT',
      path: '/me',
      description: 'Update current user profile',
      access: 'Authenticated users',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'DELETE',
      path: '/me',
      description: 'Delete current user account',
      access: 'Authenticated users',
      rateLimit: 'Strict limiting'
    }
  ]
};

module.exports = router;