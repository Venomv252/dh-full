/**
 * Application Constants
 * Centralized constants and enums for the application
 */

/**
 * User roles enum
 */
const USER_ROLES = {
  GUEST: 'guest',
  USER: 'user',
  ADMIN: 'admin',
  HOSPITAL: 'hospital',
};

/**
 * Incident types enum
 */
const INCIDENT_TYPES = {
  ACCIDENT: 'Accident',
  FIRE: 'Fire',
  MEDICAL: 'Medical',
  NATURAL_DISASTER: 'Natural Disaster',
  CRIME: 'Crime',
  OTHER: 'Other',
};

/**
 * Incident status enum
 */
const INCIDENT_STATUS = {
  REPORTED: 'reported',
  VERIFIED: 'verified',
  RESOLVED: 'resolved',
};

/**
 * Gender options enum
 */
const GENDER_OPTIONS = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
};

/**
 * Blood group options enum
 */
const BLOOD_GROUPS = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
};

/**
 * Media types enum
 */
const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
};

/**
 * User type enum for incident reporting
 */
const USER_TYPES = {
  USER: 'user',
  GUEST: 'guest',
};

/**
 * Guest user limits
 */
const GUEST_LIMITS = {
  MAX_ACTIONS: 10,
  ACTION_WINDOW_HOURS: 24,
};

/**
 * Pagination defaults
 */
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

/**
 * Geospatial constants
 */
const GEO_CONSTANTS = {
  DEFAULT_RADIUS_METERS: 5000, // 5km default search radius
  MAX_RADIUS_METERS: 50000, // 50km maximum search radius
  GEOJSON_TYPE: 'Point',
};

/**
 * HTTP Status codes
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Error codes for consistent error handling
 */
const ERROR_CODES = {
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Authentication errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  
  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  GUEST_ACTION_LIMIT_EXCEEDED: 'GUEST_ACTION_LIMIT_EXCEEDED',
  
  // Resource errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INCIDENT_NOT_FOUND: 'INCIDENT_NOT_FOUND',
  GUEST_NOT_FOUND: 'GUEST_NOT_FOUND',
  
  // Conflict errors
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  DUPLICATE_UPVOTE: 'DUPLICATE_UPVOTE',
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',
  GUEST_ID_EXISTS: 'GUEST_ID_EXISTS',
  
  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  TOO_MANY_FILES: 'TOO_MANY_FILES',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
};

module.exports = {
  USER_ROLES,
  INCIDENT_TYPES,
  INCIDENT_STATUS,
  GENDER_OPTIONS,
  BLOOD_GROUPS,
  MEDIA_TYPES,
  USER_TYPES,
  GUEST_LIMITS,
  PAGINATION,
  GEO_CONSTANTS,
  HTTP_STATUS,
  ERROR_CODES,
};