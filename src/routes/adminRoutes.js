/**
 * Admin Routes
 * API endpoints for administrative functions including incident management,
 * user management, system analytics, and bulk operations
 * Provides comprehensive admin dashboard functionality
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  getAdminDashboard,
  getAdminIncidents,
  bulkUpdateIncidentStatus,
  bulkDeleteIncidents,
  getSystemAnalytics,
  getAdminUsers
} = require('../controllers/adminController');

// Import middleware
const { authenticate } = require('../middleware/auth');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validators, validateBody, validateQuery } = require('../middleware/validation');
const { 
  requireAdmin,
  addPermissionHeaders,
  roleCheckers
} = require('../middleware/roleCheck');
const Joi = require('joi');
const { INCIDENT_STATUS, USER_ROLES, ERROR_CODES } = require('../config/constants');

/**
 * Additional validation schemas for admin routes
 */
const adminValidationSchemas = {
  // Admin incidents query validation
  incidentQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...Object.values(INCIDENT_STATUS)).optional(),
    type: Joi.string().optional(),
    reporterType: Joi.string().valid('user', 'guest').optional(),
    priority: Joi.string().valid('normal', 'high', 'urgent').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'upvotes', 'type', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().max(200).optional()
  }),

  // Bulk status update validation
  bulkStatusUpdate: Joi.object({
    incidentIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(100)
      .required(),
    status: Joi.string().valid(...Object.values(INCIDENT_STATUS)).required(),
    reason: Joi.string().max(500).optional()
  }),

  // Bulk delete validation
  bulkDelete: Joi.object({
    incidentIds: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(50)
      .required(),
    reason: Joi.string().max(500).optional()
  }),

  // Analytics query validation
  analyticsQuery: Joi.object({
    timeframe: Joi.string().valid('24h', '7d', '30d', '90d').default('30d')
  }),

  // User management query validation
  userQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    role: Joi.string().valid(...Object.values(USER_ROLES)).optional(),
    search: Joi.string().max(200).optional(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'email', 'role').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    status: Joi.string().valid('active', 'deactivated').default('active')
  })
};

/**
 * Apply common admin middleware to all routes
 * - Authentication required
 * - Admin role required
 * - Rate limiting
 * - Permission headers
 */
router.use(authenticate);
router.use(requireAdmin);
router.use(rateLimiters.api);
router.use(addPermissionHeaders('admin'));

/**
 * Admin Dashboard Routes
 */

// GET /api/admin/dashboard - Get comprehensive admin dashboard data
router.get('/dashboard', 
  rateLimiters.burst, // Allow frequent dashboard refreshes
  getAdminDashboard
);

/**
 * Incident Management Routes
 */

// GET /api/admin/incidents - Get admin incident management view with filtering
router.get('/incidents',
  validateQuery(adminValidationSchemas.incidentQuery),
  getAdminIncidents
);

// PATCH /api/admin/incidents/bulk-status - Bulk update incident status
router.patch('/incidents/bulk-status',
  rateLimiters.strict, // Limit bulk operations
  validateBody(adminValidationSchemas.bulkStatusUpdate),
  bulkUpdateIncidentStatus
);

// DELETE /api/admin/incidents/bulk-delete - Bulk delete incidents
router.delete('/incidents/bulk-delete',
  rateLimiters.strict, // Limit bulk operations
  validateBody(adminValidationSchemas.bulkDelete),
  bulkDeleteIncidents
);

/**
 * User Management Routes
 */

// GET /api/admin/users - Get user management data with filtering
router.get('/users',
  validateQuery(adminValidationSchemas.userQuery),
  getAdminUsers
);

/**
 * Analytics and Reporting Routes
 */

// GET /api/admin/analytics - Get system analytics and trends
router.get('/analytics',
  validateQuery(adminValidationSchemas.analyticsQuery),
  getSystemAnalytics
);

/**
 * Error handling middleware specific to admin routes
 */
router.use((err, req, res, next) => {
  console.error('Admin route error:', err.message);
  console.error('Stack:', err.stack);

  // Log admin actions for audit trail
  if (req.user) {
    console.log(`Admin action error - User: ${req.user.email}, Route: ${req.method} ${req.path}, Error: ${err.message}`);
  }

  // Determine error status code
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || ERROR_CODES.INTERNAL_ERROR;

  // Send structured error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        stack: err.stack,
        adminUser: req.user?.email,
        route: `${req.method} ${req.path}`
      } : undefined
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
  