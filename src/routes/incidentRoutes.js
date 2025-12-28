/**
 * Incident Routes
 * API endpoints for incident reporting, management, and geospatial queries
 * Handles incident CRUD operations, upvoting, and advanced filtering
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  createIncident,
  getIncidentById,
  listIncidents,
  updateIncident,
  deleteIncident,
  upvoteIncident,
  getMyIncidents,
  getIncidentStatistics
} = require('../controllers/incidentController');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validators, validateBody, validateQuery } = require('../middleware/validation');
const { 
  roleCheckers, 
  requireAdmin, 
  requireHospitalOrAdmin,
  addPermissionHeaders 
} = require('../middleware/roleCheck');
const Joi = require('joi');

/**
 * Additional validation schemas for incident routes
 */
const incidentValidationSchemas = {
  // Incident ID parameter validation
  incidentIdParam: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid incident ID format'
      })
  }),
  
  // Incident list query validation
  incidentListQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid('Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other').optional(),
    status: Joi.string().valid('reported', 'verified', 'resolved').optional(),
    lat: Joi.number().min(-90).max(90).optional(),
    lng: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().integer().min(100).max(50000).default(5000).optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'upvotes', 'type', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),
  
  // My incidents query validation
  myIncidentsQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('reported', 'verified', 'resolved').optional(),
    type: Joi.string().valid('Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other').optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'upvotes').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  }),
  
  // Upvote action validation
  upvoteAction: Joi.object({
    action: Joi.string().valid('add', 'remove').default('add')
  }),
  
  // Incident update validation (for status changes)
  incidentUpdate: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    type: Joi.string().valid('Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other').optional(),
    status: Joi.string().valid('reported', 'verified', 'resolved').optional(),
    media: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('image', 'video').required(),
        url: Joi.string().uri({ scheme: ['http', 'https'] }).required()
      })
    ).max(10).optional()
  })
};

/**
 * Create validation middleware for incident-specific schemas
 */
const validateIncidentIdParam = (req, res, next) => {
  const { error, value } = incidentValidationSchemas.incidentIdParam.validate(req.params);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid incident ID format',
        details: {
          field: 'id',
          message: error.details[0].message,
          value: req.params.id
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  req.params = value;
  next();
};

const validateIncidentListQuery = (req, res, next) => {
  const { error, value } = incidentValidationSchemas.incidentListQuery.validate(req.query);
  
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

const validateMyIncidentsQuery = (req, res, next) => {
  const { error, value } = incidentValidationSchemas.myIncidentsQuery.validate(req.query);
  
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

const validateUpvoteAction = (req, res, next) => {
  const { error, value } = incidentValidationSchemas.upvoteAction.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid upvote action',
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

const validateIncidentUpdate = (req, res, next) => {
  const { error, value } = incidentValidationSchemas.incidentUpdate.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid update data',
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

// ============================================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================================

/**
 * @route   GET /api/incidents
 * @desc    List incidents with filtering and geospatial queries
 * @access  Public (incident information is public for safety)
 * @rateLimit Standard API limits
 */
router.get('/',
  rateLimiters.api,
  validateIncidentListQuery,
  addPermissionHeaders('incidents'),
  listIncidents
);

/**
 * @route   GET /api/incidents/:id
 * @desc    Get incident details by ID
 * @access  Public (incident details are public for safety)
 * @rateLimit Standard API limits
 */
router.get('/:id',
  rateLimiters.api,
  validateIncidentIdParam,
  addPermissionHeaders('incidents'),
  getIncidentById
);

// ============================================================================
// AUTHENTICATED ROUTES (User or Guest required)
// ============================================================================

/**
 * @route   POST /api/incidents
 * @desc    Create new incident report
 * @access  Authenticated users and guests
 * @rateLimit Incident creation limits (role-based)
 */
router.post('/',
  rateLimiters.incidentCreation,
  authenticate,
  validators.incident.create,
  roleCheckers.incidents.create,
  addPermissionHeaders('incidents'),
  createIncident
);

/**
 * @route   PUT /api/incidents/:id
 * @desc    Update incident (reporter or admin/hospital)
 * @access  Incident reporter or Admin/Hospital (for status changes)
 * @rateLimit Standard API limits
 */
router.put('/:id',
  rateLimiters.api,
  validateIncidentIdParam,
  validateIncidentUpdate,
  authenticate,
  roleCheckers.incidents.update,
  addPermissionHeaders('incidents'),
  updateIncident
);

/**
 * @route   DELETE /api/incidents/:id
 * @desc    Delete incident (reporter within 1 hour or admin)
 * @access  Incident reporter (within 1 hour) or Admin
 * @rateLimit Strict limiting for destructive operations
 */
router.delete('/:id',
  rateLimiters.strict,
  validateIncidentIdParam,
  authenticate,
  roleCheckers.incidents.delete,
  addPermissionHeaders('incidents'),
  deleteIncident
);

/**
 * @route   POST /api/incidents/:id/upvote
 * @desc    Upvote or remove upvote from incident
 * @access  Authenticated users and guests
 * @rateLimit Upvoting limits (role-based)
 */
router.post('/:id/upvote',
  rateLimiters.upvoting,
  validateIncidentIdParam,
  validateUpvoteAction,
  authenticate,
  roleCheckers.incidents.upvote,
  addPermissionHeaders('incidents'),
  upvoteIncident
);

/**
 * @route   GET /api/incidents/my-reports
 * @desc    Get current user's/guest's incident reports
 * @access  Authenticated users and guests
 * @rateLimit Standard API limits
 */
router.get('/my-reports',
  rateLimiters.api,
  validateMyIncidentsQuery,
  authenticate,
  addPermissionHeaders('incidents'),
  getMyIncidents
);

// ============================================================================
// ADMIN/HOSPITAL ROUTES (Administrative functions)
// ============================================================================

/**
 * @route   GET /api/incidents/stats
 * @desc    Get system-wide incident statistics
 * @access  Admin or Hospital users
 * @rateLimit Standard API limits
 */
router.get('/stats',
  rateLimiters.api,
  authenticate,
  requireHospitalOrAdmin,
  addPermissionHeaders('incidents'),
  getIncidentStatistics
);

/**
 * @route   PATCH /api/incidents/:id/status
 * @desc    Update incident status (verify/resolve)
 * @access  Admin or Hospital users only
 * @rateLimit Standard API limits
 */
router.patch('/:id/status',
  rateLimiters.api,
  validateIncidentIdParam,
  validateBody(Joi.object({
    status: Joi.string().valid('verified', 'resolved').required()
  })),
  authenticate,
  requireHospitalOrAdmin,
  addPermissionHeaders('incidents'),
  (req, res, next) => {
    // Convert to updateIncident format
    req.body = { status: req.body.status };
    updateIncident(req, res, next);
  }
);

// ============================================================================
// UTILITY ROUTES
// ============================================================================

/**
 * @route   GET /api/incidents/nearby
 * @desc    Get incidents near a specific location (convenience endpoint)
 * @access  Public
 * @rateLimit Standard API limits
 */
router.get('/nearby',
  rateLimiters.api,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().integer().min(100).max(50000).default(5000),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  addPermissionHeaders('incidents'),
  (req, res, next) => {
    // Convert to listIncidents format
    req.query.page = 1;
    req.query.sortBy = 'createdAt';
    req.query.sortOrder = 'desc';
    listIncidents(req, res, next);
  }
);

/**
 * @route   GET /api/incidents/recent
 * @desc    Get recent incidents (convenience endpoint)
 * @access  Public
 * @rateLimit Standard API limits
 */
router.get('/recent',
  rateLimiters.api,
  validateQuery(Joi.object({
    hours: Joi.number().integer().min(1).max(168).default(24), // Max 1 week
    limit: Joi.number().integer().min(1).max(50).default(20),
    type: Joi.string().valid('Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other').optional()
  })),
  addPermissionHeaders('incidents'),
  (req, res, next) => {
    // Convert to listIncidents format with date filtering
    const hoursAgo = parseInt(req.query.hours);
    req.query.startDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
    req.query.page = 1;
    req.query.sortBy = 'createdAt';
    req.query.sortOrder = 'desc';
    listIncidents(req, res, next);
  }
);

/**
 * @route   GET /api/incidents/popular
 * @desc    Get most upvoted incidents (convenience endpoint)
 * @access  Public
 * @rateLimit Standard API limits
 */
router.get('/popular',
  rateLimiters.api,
  validateQuery(Joi.object({
    timeframe: Joi.string().valid('day', 'week', 'month', 'all').default('week'),
    limit: Joi.number().integer().min(1).max(50).default(20),
    type: Joi.string().valid('Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other').optional()
  })),
  addPermissionHeaders('incidents'),
  (req, res, next) => {
    // Convert to listIncidents format with date filtering and upvote sorting
    const timeframe = req.query.timeframe;
    const timeframes = {
      day: 24,
      week: 168,
      month: 720,
      all: null
    };
    
    if (timeframes[timeframe]) {
      const hoursAgo = timeframes[timeframe];
      req.query.startDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000)).toISOString();
    }
    
    req.query.page = 1;
    req.query.sortBy = 'upvotes';
    req.query.sortOrder = 'desc';
    listIncidents(req, res, next);
  }
);

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Route-specific error handler for incident routes
 */
router.use((error, req, res, next) => {
  // Log error for debugging
  console.error(`Incident Route Error: ${error.message}`, {
    path: req.path,
    method: req.method,
    incidentId: req.params?.id,
    userType: req.user?.role || 'unauthenticated',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });

  // Handle specific incident-related errors
  if (error.code === 'INCIDENT_NOT_FOUND') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'INCIDENT_NOT_FOUND',
        message: 'Incident not found',
        details: {
          incidentId: req.params?.id,
          suggestion: 'Please verify the incident ID is correct'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'DUPLICATE_UPVOTE') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_UPVOTE',
        message: 'You have already upvoted this incident',
        details: {
          incidentId: req.params?.id,
          suggestion: 'You can remove your upvote if you want to change it'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'UPVOTE_NOT_FOUND') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'UPVOTE_NOT_FOUND',
        message: 'You have not upvoted this incident',
        details: {
          incidentId: req.params?.id,
          suggestion: 'You can only remove upvotes you have previously added'
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

  if (error.code === 'MEDIA_LIMIT_EXCEEDED') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MEDIA_LIMIT_EXCEEDED',
        message: 'Maximum media limit reached for this incident',
        details: {
          maxMedia: 10,
          suggestion: 'Please remove some media files before adding new ones'
        }
      },
      timestamp: new Date().toISOString()
    });
  }

  if (error.code === 'INVALID_COORDINATES') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_COORDINATES',
        message: 'Invalid geographic coordinates',
        details: {
          validRanges: {
            latitude: { min: -90, max: 90 },
            longitude: { min: -180, max: 180 }
          },
          suggestion: 'Please provide valid latitude and longitude values'
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
        message: 'Incident data validation failed',
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

  // Handle geospatial query errors
  if (error.message && error.message.includes('2dsphere')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'GEOSPATIAL_QUERY_ERROR',
        message: 'Invalid geospatial query parameters',
        details: {
          suggestion: 'Please check your latitude, longitude, and radius values'
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
  basePath: '/api/incidents',
  description: 'Incident reporting, management, and geospatial queries',
  version: '1.0.0',
  routes: [
    {
      method: 'GET',
      path: '/',
      description: 'List incidents with filtering and geospatial queries',
      access: 'Public',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'GET',
      path: '/:id',
      description: 'Get incident details by ID',
      access: 'Public',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'POST',
      path: '/',
      description: 'Create new incident report',
      access: 'Authenticated users and guests',
      rateLimit: 'Incident creation limits'
    },
    {
      method: 'PUT',
      path: '/:id',
      description: 'Update incident',
      access: 'Incident reporter or Admin/Hospital',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'DELETE',
      path: '/:id',
      description: 'Delete incident',
      access: 'Incident reporter (within 1 hour) or Admin',
      rateLimit: 'Strict limiting'
    },
    {
      method: 'POST',
      path: '/:id/upvote',
      description: 'Upvote or remove upvote from incident',
      access: 'Authenticated users and guests',
      rateLimit: 'Upvoting limits'
    },
    {
      method: 'GET',
      path: '/my-reports',
      description: 'Get current user\'s incident reports',
      access: 'Authenticated users and guests',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'GET',
      path: '/stats',
      description: 'Get incident statistics',
      access: 'Admin or Hospital users',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'PATCH',
      path: '/:id/status',
      description: 'Update incident status',
      access: 'Admin or Hospital users',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'GET',
      path: '/nearby',
      description: 'Get incidents near location',
      access: 'Public',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'GET',
      path: '/recent',
      description: 'Get recent incidents',
      access: 'Public',
      rateLimit: 'Standard API limits'
    },
    {
      method: 'GET',
      path: '/popular',
      description: 'Get most upvoted incidents',
      access: 'Public',
      rateLimit: 'Standard API limits'
    }
  ]
};

module.exports = router;