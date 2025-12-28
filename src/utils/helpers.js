/**
 * Helper Utilities
 * Common helper functions used across the application
 */

const { HTTP_STATUS, ERROR_CODES } = require('../config/constants');

/**
 * Create standardized success response
 * @param {object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {object} - Standardized response object
 */
const createSuccessResponse = (data = null, message = 'Success', statusCode = HTTP_STATUS.OK) => {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Create standardized error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {object} details - Additional error details
 * @param {number} statusCode - HTTP status code
 * @returns {object} - Standardized error object
 */
const createErrorResponse = (
  code = ERROR_CODES.INTERNAL_ERROR,
  message = 'Internal server error',
  details = null,
  statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR
) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

/**
 * Create validation error
 * @param {string} message - Validation error message
 * @param {object} details - Validation details
 * @returns {Error} - Validation error object
 */
const createValidationError = (message, details = null) => {
  return createErrorResponse(
    ERROR_CODES.VALIDATION_ERROR,
    message,
    details,
    HTTP_STATUS.BAD_REQUEST
  );
};

/**
 * Create authentication error
 * @param {string} message - Auth error message
 * @returns {Error} - Authentication error object
 */
const createAuthError = (message = 'Authentication required') => {
  return createErrorResponse(
    ERROR_CODES.UNAUTHORIZED_ACCESS,
    message,
    null,
    HTTP_STATUS.UNAUTHORIZED
  );
};

/**
 * Create authorization error
 * @param {string} message - Authorization error message
 * @returns {Error} - Authorization error object
 */
const createAuthorizationError = (message = 'Insufficient permissions') => {
  return createErrorResponse(
    ERROR_CODES.INSUFFICIENT_PERMISSIONS,
    message,
    null,
    HTTP_STATUS.FORBIDDEN
  );
};

/**
 * Create not found error
 * @param {string} resource - Resource that was not found
 * @returns {Error} - Not found error object
 */
const createNotFoundError = (resource = 'Resource') => {
  return createErrorResponse(
    ERROR_CODES.USER_NOT_FOUND,
    `${resource} not found`,
    null,
    HTTP_STATUS.NOT_FOUND
  );
};

/**
 * Create conflict error
 * @param {string} message - Conflict error message
 * @param {string} code - Specific conflict error code
 * @returns {Error} - Conflict error object
 */
const createConflictError = (message, code = ERROR_CODES.EMAIL_ALREADY_EXISTS) => {
  return createErrorResponse(
    code,
    message,
    null,
    HTTP_STATUS.CONFLICT
  );
};

/**
 * Async wrapper for route handlers to catch errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Wrapped function with error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Format coordinates for display
 * @param {array} coordinates - [longitude, latitude]
 * @returns {string} - Formatted coordinates string
 */
const formatCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return 'Invalid coordinates';
  }
  
  const [longitude, latitude] = coordinates;
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
};

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} - Pagination metadata
 */
const generatePaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  };
};

/**
 * Clean object by removing null/undefined values
 * @param {object} obj - Object to clean
 * @returns {object} - Cleaned object
 */
const cleanObject = (obj) => {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanObject(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
};

/**
 * Generate unique filename for media uploads
 * @param {string} originalName - Original filename
 * @param {string} prefix - Filename prefix
 * @returns {string} - Unique filename
 */
const generateUniqueFilename = (originalName, prefix = 'file') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  
  return `${prefix}_${timestamp}_${random}.${extension}`;
};

/**
 * Validate and parse JSON safely
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} - Parsed JSON or default value
 */
const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
};

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Convert string to title case
 * @param {string} str - String to convert
 * @returns {string} - Title case string
 */
const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createConflictError,
  asyncHandler,
  calculateDistance,
  formatCoordinates,
  generatePaginationMeta,
  cleanObject,
  generateUniqueFilename,
  safeJsonParse,
  debounce,
  toTitleCase,
};