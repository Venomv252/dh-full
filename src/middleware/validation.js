/**
 * Validation Middleware
 * Implements Joi schemas for API endpoint validation and input sanitization
 * Provides reusable validation functions for all data types
 */

const Joi = require('joi');
const { 
  INCIDENT_TYPES, 
  INCIDENT_STATUS, 
  GENDER_OPTIONS, 
  BLOOD_GROUPS,
  USER_ROLES,
  MEDIA_TYPES,
  USER_TYPES,
  ERROR_CODES,
  HTTP_STATUS,
  GEO_CONSTANTS
} = require('../config/constants');

/**
 * Custom Joi extensions for application-specific validation
 */
const customJoi = Joi.extend({
  type: 'geoCoordinates',
  base: Joi.array(),
  messages: {
    'geoCoordinates.invalid': 'Invalid coordinates format. Must be [longitude, latitude]',
    'geoCoordinates.longitude': 'Longitude must be between -180 and 180',
    'geoCoordinates.latitude': 'Latitude must be between -90 and 90'
  },
  validate(value, helpers) {
    if (!Array.isArray(value) || value.length !== 2) {
      return { value, errors: helpers.error('geoCoordinates.invalid') };
    }
    
    const [longitude, latitude] = value;
    
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return { value, errors: helpers.error('geoCoordinates.longitude') };
    }
    
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return { value, errors: helpers.error('geoCoordinates.latitude') };
    }
    
    return { value };
  }
});

/**
 * Input sanitization functions
 */
const sanitize = {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   * @param {string} input - Input string to sanitize
   * @returns {string} - Sanitized string
   */
  string: (input) => {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      // Remove potential HTML/XML tags
      .replace(/<[^>]*>/g, '')
      // Remove potential script injections
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      // Remove SQL injection patterns
      .replace(/['";\\]/g, '')
      // Limit length to prevent DoS
      .substring(0, 10000);
  },

  /**
   * Sanitize email input
   * @param {string} email - Email to sanitize
   * @returns {string} - Sanitized email
   */
  email: (input) => {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .toLowerCase()
      // Remove dangerous characters but keep valid email chars
      .replace(/[^a-z0-9@._-]/g, '')
      .substring(0, 254); // RFC 5321 limit
  },

  /**
   * Sanitize phone number input
   * @param {string} phone - Phone number to sanitize
   * @returns {string} - Sanitized phone number
   */
  phone: (input) => {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      // Keep only digits, +, -, and spaces
      .replace(/[^0-9+\-\s]/g, '')
      .substring(0, 20);
  },

  /**
   * Sanitize URL input
   * @param {string} url - URL to sanitize
   * @returns {string} - Sanitized URL
   */
  url: (input) => {
    if (typeof input !== 'string') return '';
    
    try {
      const url = new URL(input.trim());
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        return '';
      }
      return url.toString().substring(0, 2048);
    } catch {
      return '';
    }
  }
};

/**
 * Common Joi schema components
 */
const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ObjectId format'),
  
  // Email validation with sanitization
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(254)
    .lowercase()
    .custom((value, helpers) => sanitize.email(value)),
  
  // Phone number validation with sanitization
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .custom((value, helpers) => sanitize.phone(value))
    .message('Phone number must be in international format (+1234567890)'),
  
  // Password validation (for future use)
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
  
  // URL validation with sanitization
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(2048)
    .custom((value, helpers) => sanitize.url(value)),
  
  // GeoJSON Point coordinates
  geoCoordinates: customJoi.geoCoordinates(),
  
  // Date validation
  date: Joi.date().iso(),
  
  // Pagination parameters
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  },
  
  // Search radius for geospatial queries
  searchRadius: Joi.number().integer().min(100).max(50000).default(5000)
};

/**
 * User-related validation schemas
 */
const userSchemas = {
  // User registration schema
  register: Joi.object({
    fullName: Joi.string()
      .min(2)
      .max(100)
      .required()
      .custom((value, helpers) => sanitize.string(value)),
    
    dob: commonSchemas.date.required(),
    
    gender: Joi.string()
      .valid(...Object.values(GENDER_OPTIONS))
      .required(),
    
    phone: commonSchemas.phone.required(),
    
    email: commonSchemas.email.required(),
    
    address: Joi.object({
      street: Joi.string()
        .min(5)
        .max(200)
        .required()
        .custom((value, helpers) => sanitize.string(value)),
      city: Joi.string()
        .min(2)
        .max(100)
        .required()
        .custom((value, helpers) => sanitize.string(value)),
      state: Joi.string()
        .min(2)
        .max(100)
        .required()
        .custom((value, helpers) => sanitize.string(value)),
      pincode: Joi.string()
        .pattern(/^\d{4,10}$/)
        .required()
    }).required(),
    
    bloodGroup: Joi.string()
      .valid(...Object.values(BLOOD_GROUPS))
      .optional(),
    
    medicalConditions: Joi.array()
      .items(
        Joi.string()
          .max(200)
          .custom((value, helpers) => sanitize.string(value))
      )
      .max(20)
      .default([]),
    
    allergies: Joi.array()
      .items(
        Joi.string()
          .max(200)
          .custom((value, helpers) => sanitize.string(value))
      )
      .max(20)
      .default([]),
    
    emergencyContacts: Joi.array()
      .items(Joi.object({
        name: Joi.string()
          .min(2)
          .max(100)
          .required()
          .custom((value, helpers) => sanitize.string(value)),
        relation: Joi.string()
          .valid('Parent', 'Spouse', 'Sibling', 'Child', 'Friend', 'Colleague', 'Other')
          .required(),
        phone: commonSchemas.phone.required()
      }))
      .max(5)
      .default([]),
    
    vehicles: Joi.array()
      .items(Joi.object({
        vehicleNumber: Joi.string()
          .min(3)
          .max(20)
          .required()
          .custom((value, helpers) => sanitize.string(value).toUpperCase()),
        type: Joi.string()
          .valid('Car', 'Motorcycle', 'Truck', 'Bus', 'Van', 'Bicycle', 'Other')
          .required(),
        model: Joi.string()
          .min(1)
          .max(100)
          .required()
          .custom((value, helpers) => sanitize.string(value))
      }))
      .max(10)
      .default([]),
    
    insurance: Joi.object({
      provider: Joi.string()
        .max(100)
        .optional()
        .custom((value, helpers) => sanitize.string(value)),
      policyNumber: Joi.string()
        .max(50)
        .optional()
        .custom((value, helpers) => sanitize.string(value)),
      validTill: commonSchemas.date.min('now').optional()
    }).optional()
  }),
  
  // User login schema
  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().min(1).max(128).required(),
    userType: Joi.string()
      .valid('user', 'police', 'hospital', 'admin')
      .default('user')
      .optional()
  }),
  
  // User profile update schema
  updateProfile: Joi.object({
    fullName: Joi.string()
      .min(2)
      .max(100)
      .optional()
      .custom((value, helpers) => sanitize.string(value)),
    
    phone: commonSchemas.phone.optional(),
    
    address: Joi.object({
      street: Joi.string()
        .min(5)
        .max(200)
        .optional()
        .custom((value, helpers) => sanitize.string(value)),
      city: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .custom((value, helpers) => sanitize.string(value)),
      state: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .custom((value, helpers) => sanitize.string(value)),
      pincode: Joi.string()
        .pattern(/^\d{4,10}$/)
        .optional()
    }).optional(),
    
    bloodGroup: Joi.string()
      .valid(...Object.values(BLOOD_GROUPS))
      .optional(),
    
    medicalConditions: Joi.array()
      .items(
        Joi.string()
          .max(200)
          .custom((value, helpers) => sanitize.string(value))
      )
      .max(20)
      .optional(),
    
    allergies: Joi.array()
      .items(
        Joi.string()
          .max(200)
          .custom((value, helpers) => sanitize.string(value))
      )
      .max(20)
      .optional()
  })
};

/**
 * Authentication-related validation schemas
 */
const authSchemas = {
  // Login validation
  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string()
      .min(1)
      .max(128)
      .required()
      .messages({
        'string.empty': 'Password is required',
        'string.max': 'Password is too long'
      }),
    userType: Joi.string()
      .valid('user', 'police', 'hospital', 'admin')
      .default('user')
      .optional()
  }),
  
  // Token refresh validation
  refreshToken: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'string.empty': 'Refresh token is required',
        'any.required': 'Refresh token is required'
      })
  }),
  
  // Email validation (for password reset)
  email: Joi.object({
    email: commonSchemas.email.required()
  }),
  
  // Password reset validation
  passwordReset: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'string.empty': 'Reset token is required',
        'any.required': 'Reset token is required'
      }),
    newPassword: commonSchemas.password.required()
  })
};

/**
 * Guest-related validation schemas
 */
const guestSchemas = {
  // Guest creation schema
  create: Joi.object({
    maxActions: Joi.number()
      .integer()
      .min(1)
      .max(50)
      .default(10)
      .optional()
  })
};

/**
 * Incident-related validation schemas
 */
const incidentSchemas = {
  // Incident creation schema
  create: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200)
      .required()
      .custom((value, helpers) => sanitize.string(value)),
    
    description: Joi.string()
      .min(10)
      .max(2000)
      .required()
      .custom((value, helpers) => sanitize.string(value)),
    
    type: Joi.string()
      .valid(...Object.values(INCIDENT_TYPES))
      .required(),
    
    geoLocation: Joi.object({
      type: Joi.string()
        .valid(GEO_CONSTANTS.GEOJSON_TYPE)
        .default(GEO_CONSTANTS.GEOJSON_TYPE),
      coordinates: commonSchemas.geoCoordinates.required()
    }).required(),
    
    media: Joi.array()
      .items(Joi.object({
        type: Joi.string()
          .valid(...Object.values(MEDIA_TYPES))
          .required(),
        url: commonSchemas.url.required()
      }))
      .max(10)
      .default([])
    
    // Note: reportedBy is automatically populated by the controller based on authenticated user
    // and should not be included in the request body
  }),
  
  // Incident update schema
  update: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200)
      .optional()
      .custom((value, helpers) => sanitize.string(value)),
    
    description: Joi.string()
      .min(10)
      .max(2000)
      .optional()
      .custom((value, helpers) => sanitize.string(value)),
    
    status: Joi.string()
      .valid(...Object.values(INCIDENT_STATUS))
      .optional()
  }),
  
  // Incident query schema
  query: Joi.object({
    ...commonSchemas.pagination,
    
    type: Joi.string()
      .valid(...Object.values(INCIDENT_TYPES))
      .optional(),
    
    status: Joi.string()
      .valid(...Object.values(INCIDENT_STATUS))
      .optional(),
    
    // Geospatial query parameters
    lat: Joi.number().min(-90).max(90).optional(),
    lng: Joi.number().min(-180).max(180).optional(),
    radius: commonSchemas.searchRadius.optional(),
    
    // Date range filtering
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.min(Joi.ref('startDate')).optional(),
    
    // Sorting
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'upvotes', 'type', 'status')
      .default('createdAt'),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
  }),
  
  // Upvote schema
  upvote: Joi.object({
    userType: Joi.string()
      .valid(...Object.values(USER_TYPES))
      .required(),
    userId: Joi.when('userType', {
      is: USER_TYPES.USER,
      then: commonSchemas.objectId.required(),
      otherwise: Joi.forbidden()
    }),
    guestId: Joi.when('userType', {
      is: USER_TYPES.GUEST,
      then: commonSchemas.objectId.required(),
      otherwise: Joi.forbidden()
    })
  })
};

/**
 * Admin-related validation schemas
 */
const adminSchemas = {
  // Admin incident query schema
  incidentQuery: Joi.object({
    ...commonSchemas.pagination,
    
    status: Joi.string()
      .valid(...Object.values(INCIDENT_STATUS))
      .optional(),
    
    type: Joi.string()
      .valid(...Object.values(INCIDENT_TYPES))
      .optional(),
    
    reporterType: Joi.string()
      .valid(...Object.values(USER_TYPES))
      .optional(),
    
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.min(Joi.ref('startDate')).optional(),
    
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'upvotes', 'type', 'status', 'reportedBy')
      .default('createdAt'),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
  }),
  
  // User management schema
  userQuery: Joi.object({
    ...commonSchemas.pagination,
    
    role: Joi.string()
      .valid(...Object.values(USER_ROLES))
      .optional(),
    
    email: Joi.string().optional(),
    
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.min(Joi.ref('startDate')).optional()
  })
};

/**
 * Create validation middleware
 * @param {object} schema - Joi schema to validate against
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @returns {function} - Express middleware function
 */
const createValidationMiddleware = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types when possible
    });
    
    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Validation failed',
          details: {
            errors: validationErrors,
            errorCount: validationErrors.length
          }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Replace original data with validated and sanitized data
    req[source] = value;
    
    next();
  };
};

/**
 * Validate request body
 * @param {object} schema - Joi schema
 * @returns {function} - Express middleware
 */
const validateBody = (schema) => createValidationMiddleware(schema, 'body');

/**
 * Validate query parameters
 * @param {object} schema - Joi schema
 * @returns {function} - Express middleware
 */
const validateQuery = (schema) => createValidationMiddleware(schema, 'query');

/**
 * Validate URL parameters
 * @param {object} schema - Joi schema
 * @returns {function} - Express middleware
 */
const validateParams = (schema) => createValidationMiddleware(schema, 'params');

/**
 * Combined validation for multiple sources
 * @param {object} schemas - Object with body, query, params schemas
 * @returns {function} - Express middleware
 */
const validate = (schemas) => {
  return (req, res, next) => {
    const validationPromises = [];
    
    // Validate each source if schema is provided
    if (schemas.body) {
      validationPromises.push(
        new Promise((resolve) => {
          validateBody(schemas.body)(req, res, resolve);
        })
      );
    }
    
    if (schemas.query) {
      validationPromises.push(
        new Promise((resolve) => {
          validateQuery(schemas.query)(req, res, resolve);
        })
      );
    }
    
    if (schemas.params) {
      validationPromises.push(
        new Promise((resolve) => {
          validateParams(schemas.params)(req, res, resolve);
        })
      );
    }
    
    // If no validation needed, continue
    if (validationPromises.length === 0) {
      return next();
    }
    
    // Run all validations
    Promise.all(validationPromises)
      .then(() => next())
      .catch(() => {
        // Error response already sent by individual validators
      });
  };
};

/**
 * Pre-configured validation middleware for common endpoints
 */
const validators = {
  // Authentication validators
  loginValidation: validateBody(authSchemas.login),
  refreshTokenValidation: validateBody(authSchemas.refreshToken),
  emailValidation: validateBody(authSchemas.email),
  passwordResetValidation: validateBody(authSchemas.passwordReset),
  
  // User validators
  user: {
    register: validateBody(userSchemas.register),
    login: validateBody(userSchemas.login),
    updateProfile: validateBody(userSchemas.updateProfile)
  },
  
  // Guest validators
  guest: {
    create: validateBody(guestSchemas.create)
  },
  
  // Incident validators
  incident: {
    create: validateBody(incidentSchemas.create),
    update: validateBody(incidentSchemas.update),
    query: validateQuery(incidentSchemas.query),
    upvote: validateBody(incidentSchemas.upvote),
    getById: validateParams(Joi.object({
      id: commonSchemas.objectId.required()
    }))
  },
  
  // Admin validators
  admin: {
    incidentQuery: validateQuery(adminSchemas.incidentQuery),
    userQuery: validateQuery(adminSchemas.userQuery)
  },
  
  // Common validators
  common: {
    objectId: validateParams(Joi.object({
      id: commonSchemas.objectId.required()
    })),
    pagination: validateQuery(Joi.object(commonSchemas.pagination))
  }
};

module.exports = {
  // Validation middleware functions
  validate,
  validateBody,
  validateQuery,
  validateParams,
  createValidationMiddleware,
  
  // Pre-configured validators
  validators,
  
  // Schemas for direct use
  schemas: {
    auth: authSchemas,
    user: userSchemas,
    guest: guestSchemas,
    incident: incidentSchemas,
    admin: adminSchemas,
    common: commonSchemas
  },
  
  // Sanitization functions
  sanitize,
  
  // Custom Joi instance
  customJoi
};