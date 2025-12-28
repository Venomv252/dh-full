/**
 * Comprehensive Error Handling Middleware
 * Provides centralized error handling with consistent response format,
 * proper HTTP status codes, and detailed error logging
 */

const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * Custom Error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode, code, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error type classification
 */
const ERROR_TYPES = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  RESOURCE: 'resource',
  CONFLICT: 'conflict',
  RATE_LIMIT: 'rate_limit',
  DATABASE: 'database',
  NETWORK: 'network',
  SYSTEM: 'system'
};

/**
 * Map MongoDB errors to application errors
 * @param {Error} error - MongoDB error
 * @returns {object} - Mapped error details
 */
const mapMongoError = (error) => {
  // Duplicate key error (E11000)
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    const value = error.keyValue ? error.keyValue[field] : 'unknown';
    
    let errorCode = ERROR_CODES.DUPLICATE_VALUE;
    let message = `Duplicate value for ${field}`;
    
    // Specific handling for common fields
    if (field === 'email') {
      errorCode = ERROR_CODES.EMAIL_ALREADY_EXISTS;
      message = 'Email address is already registered';
    } else if (field === 'phone') {
      errorCode = ERROR_CODES.PHONE_ALREADY_EXISTS;
      message = 'Phone number is already registered';
    } else if (field === 'guestId') {
      errorCode = ERROR_CODES.GUEST_ID_EXISTS;
      message = 'Guest ID already exists';
    }
    
    return {
      statusCode: HTTP_STATUS.CONFLICT,
      code: errorCode,
      message,
      details: { field, value: field === 'email' ? value : '[REDACTED]' },
      type: ERROR_TYPES.CONFLICT
    };
  }
  
  // Validation error
  if (error.name === 'ValidationError') {
    const errors = Object.keys(error.errors).map(key => ({
      field: key,
      message: error.errors[key].message,
      value: error.errors[key].value,
      kind: error.errors[key].kind
    }));
    
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Data validation failed',
      details: { errors, errorCount: errors.length },
      type: ERROR_TYPES.VALIDATION
    };
  }
  
  // Cast error (invalid ObjectId, etc.)
  if (error.name === 'CastError') {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.INVALID_INPUT,
      message: `Invalid ${error.path}: ${error.value}`,
      details: { 
        field: error.path, 
        value: error.value, 
        expectedType: error.kind 
      },
      type: ERROR_TYPES.VALIDATION
    };
  }
  
  // Connection errors
  if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
    return {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.DATABASE_ERROR,
      message: 'Database connection error',
      details: { reason: 'Database temporarily unavailable' },
      type: ERROR_TYPES.DATABASE
    };
  }
  
  // Generic MongoDB error
  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ERROR_CODES.DATABASE_ERROR,
    message: 'Database operation failed',
    details: { mongoError: error.message },
    type: ERROR_TYPES.DATABASE
  };
};

/**
 * Map JWT errors to application errors
 * @param {Error} error - JWT error
 * @returns {object} - Mapped error details
 */
const mapJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.INVALID_TOKEN,
      message: 'Invalid authentication token',
      details: { reason: 'Token is malformed or invalid' },
      type: ERROR_TYPES.AUTHENTICATION
    };
  }
  
  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.TOKEN_EXPIRED,
      message: 'Authentication token has expired',
      details: { 
        expiredAt: error.expiredAt,
        suggestion: 'Please login again to get a new token'
      },
      type: ERROR_TYPES.AUTHENTICATION
    };
  }
  
  if (error.name === 'NotBeforeError') {
    return {
      statusCode: HTTP_STATUS.UNAUTHORIZED,
      code: ERROR_CODES.INVALID_TOKEN,
      message: 'Token not active yet',
      details: { 
        date: error.date,
        suggestion: 'Token is not yet valid'
      },
      type: ERROR_TYPES.AUTHENTICATION
    };
  }
  
  return {
    statusCode: HTTP_STATUS.UNAUTHORIZED,
    code: ERROR_CODES.INVALID_TOKEN,
    message: 'Authentication error',
    details: { reason: error.message },
    type: ERROR_TYPES.AUTHENTICATION
  };
};

/**
 * Map Joi validation errors to application errors
 * @param {Error} error - Joi validation error
 * @returns {object} - Mapped error details
 */
const mapJoiError = (error) => {
  const errors = error.details.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
    type: detail.type
  }));
  
  return {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    code: ERROR_CODES.VALIDATION_ERROR,
    message: 'Input validation failed',
    details: { errors, errorCount: errors.length },
    type: ERROR_TYPES.VALIDATION
  };
};

/**
 * Map Multer errors to application errors
 * @param {Error} error - Multer error
 * @returns {object} - Mapped error details
 */
const mapMulterError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.FILE_TOO_LARGE,
      message: 'File size exceeds maximum allowed limit',
      details: { 
        maxSize: error.limit,
        suggestion: 'Please upload a smaller file'
      },
      type: ERROR_TYPES.VALIDATION
    };
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.TOO_MANY_FILES,
      message: 'Too many files uploaded',
      details: { 
        maxFiles: error.limit,
        suggestion: 'Please upload fewer files'
      },
      type: ERROR_TYPES.VALIDATION
    };
  }
  
  return {
    statusCode: HTTP_STATUS.BAD_REQUEST,
    code: ERROR_CODES.FILE_UPLOAD_ERROR,
    message: 'File upload error',
    details: { reason: error.message },
    type: ERROR_TYPES.VALIDATION
  };
};

/**
 * Determine error details from various error types
 * @param {Error} error - The error to analyze
 * @returns {object} - Standardized error details
 */
const determineErrorDetails = (error) => {
  // Application errors (already formatted)
  if (error.isOperational) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
      type: ERROR_TYPES.SYSTEM
    };
  }
  
  // MongoDB errors
  if (error.name && (
    error.name.includes('Mongo') || 
    error.code === 11000 || 
    error.name === 'ValidationError' ||
    error.name === 'CastError'
  )) {
    return mapMongoError(error);
  }
  
  // JWT errors
  if (error.name && error.name.includes('Token')) {
    return mapJWTError(error);
  }
  
  // Joi validation errors
  if (error.isJoi || error.name === 'ValidationError' && error.details) {
    return mapJoiError(error);
  }
  
  // Multer errors
  if (error.code && error.code.startsWith('LIMIT_')) {
    return mapMulterError(error);
  }
  
  // Syntax errors
  if (error instanceof SyntaxError) {
    return {
      statusCode: HTTP_STATUS.BAD_REQUEST,
      code: ERROR_CODES.INVALID_INPUT,
      message: 'Invalid JSON format',
      details: { reason: 'Request body contains invalid JSON' },
      type: ERROR_TYPES.VALIDATION
    };
  }
  
  // Network/timeout errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return {
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.NETWORK_ERROR,
      message: 'Network connection error',
      details: { reason: 'Unable to connect to external service' },
      type: ERROR_TYPES.NETWORK
    };
  }
  
  // Default to internal server error
  return {
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: ERROR_CODES.INTERNAL_ERROR,
    message: error.message || 'Internal server error',
    details: { 
      originalError: error.name,
      suggestion: 'Please try again or contact support if the problem persists'
    },
    type: ERROR_TYPES.SYSTEM
  };
};

/**
 * Log error with appropriate level and context
 * @param {Error} error - The error to log
 * @param {object} req - Express request object
 * @param {object} errorDetails - Processed error details
 */
const logError = (error, req, errorDetails) => {
  const logContext = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId || req.user?.guestId || 'anonymous',
    userType: req.user?.userType || 'anonymous',
    errorType: errorDetails.type,
    statusCode: errorDetails.statusCode,
    errorCode: errorDetails.code
  };
  
  // Log level based on error type and status code
  if (errorDetails.statusCode >= 500) {
    console.error('🚨 SERVER ERROR:', {
      message: errorDetails.message,
      stack: error.stack,
      context: logContext,
      details: errorDetails.details
    });
  } else if (errorDetails.statusCode >= 400) {
    console.warn('⚠️  CLIENT ERROR:', {
      message: errorDetails.message,
      context: logContext,
      details: errorDetails.details
    });
  } else {
    console.info('ℹ️  INFO:', {
      message: errorDetails.message,
      context: logContext
    });
  }
  
  // Additional logging for specific error types
  if (errorDetails.type === ERROR_TYPES.DATABASE) {
    console.error('💾 DATABASE ERROR DETAILS:', {
      originalError: error.message,
      stack: error.stack
    });
  }
  
  if (errorDetails.type === ERROR_TYPES.AUTHENTICATION) {
    console.warn('🔐 AUTH ERROR:', {
      userId: logContext.userId,
      ip: logContext.ip,
      userAgent: logContext.userAgent
    });
  }
};

/**
 * Send error response with consistent format
 * @param {object} res - Express response object
 * @param {object} errorDetails - Processed error details
 */
const sendErrorResponse = (res, errorDetails) => {
  const response = {
    success: false,
    error: {
      code: errorDetails.code,
      message: errorDetails.message,
      type: errorDetails.type,
      ...(errorDetails.details && { details: errorDetails.details })
    },
    timestamp: new Date().toISOString()
  };
  
  // Add development-specific information
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      statusCode: errorDetails.statusCode,
      errorType: errorDetails.type
    };
  }
  
  res.status(errorDetails.statusCode).json(response);
};

/**
 * Main error handling middleware
 * @param {Error} error - The error object
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
 */
const errorHandler = (error, req, res, next) => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }
  
  // Determine error details
  const errorDetails = determineErrorDetails(error);
  
  // Log the error
  logError(error, req, errorDetails);
  
  // Send error response
  sendErrorResponse(res, errorDetails);
};

/**
 * Handle async errors in route handlers
 * @param {function} fn - Async function to wrap
 * @returns {function} - Wrapped function that catches async errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create application error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @param {object} details - Additional error details
 * @returns {AppError} - Application error instance
 */
const createError = (message, statusCode, code, details = {}) => {
  return new AppError(message, statusCode, code, details);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED PROMISE REJECTION:', {
      reason: reason.message || reason,
      stack: reason.stack,
      promise: promise
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', {
      message: error.message,
      stack: error.stack
    });
    
    // Graceful shutdown
    process.exit(1);
  });
};

/**
 * Initialize error handling
 */
const initializeErrorHandling = () => {
  handleUnhandledRejection();
  handleUncaughtException();
};

module.exports = {
  AppError,
  ERROR_TYPES,
  errorHandler,
  asyncHandler,
  createError,
  initializeErrorHandling,
  
  // Utility functions for testing
  determineErrorDetails,
  mapMongoError,
  mapJWTError,
  mapJoiError
};