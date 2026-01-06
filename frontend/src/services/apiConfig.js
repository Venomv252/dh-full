// API Configuration and Constants

// Environment configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  TIMEOUT: 15000,
  RETRY_ATTEMPTS: 1,
  RETRY_DELAY: 1000,
};

// API Endpoints
export const ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_EMAIL: '/auth/verify-email',
  },

  // Users
  USERS: {
    PROFILE: '/users/profile',
    INCIDENTS: '/users/incidents',
    PASSWORD: '/users/password',
    ACCOUNT: '/users/account',
  },

  // Guests
  GUESTS: {
    CREATE: '/guests/create',
    STATUS: (guestId) => `/guests/${guestId}/status`,
    CONVERT: (guestId) => `/guests/${guestId}/convert`,
  },

  // Incidents
  INCIDENTS: {
    BASE: '/incidents',
    BY_ID: (id) => `/incidents/${id}`,
    UPVOTE: (id) => `/incidents/${id}/upvote`,
    MEDIA: (id) => `/incidents/${id}/media`,
    CHECK_PROXIMITY: '/incidents/check-proximity',
    BY_LOCATION: '/incidents/by-location',
  },

  // Police
  POLICE: {
    DASHBOARD: '/police/dashboard',
    INCIDENTS: {
      CLAIM: (id) => `/police/incidents/${id}/claim`,
      STATUS: (id) => `/police/incidents/${id}/status`,
      NOTES: (id) => `/police/incidents/${id}/notes`,
      BACKUP: (id) => `/police/incidents/${id}/backup`,
      ASSIGNED: '/police/incidents/assigned',
      BY_JURISDICTION: (id) => `/police/incidents/jurisdiction/${id}`,
    },
  },

  // Hospital
  HOSPITAL: {
    DASHBOARD: '/hospital/dashboard',
    PATIENTS: {
      SEARCH: '/hospital/patients/search',
      BY_ID: (id) => `/hospital/patients/${id}`,
      ADMIT: '/hospital/patients/admit',
      STATUS: (id) => `/hospital/patients/${id}/status`,
      HISTORY: (id) => `/hospital/patients/${id}/history`,
      DISCHARGE: (id) => `/hospital/patients/${id}/discharge`,
    },
  },

  // Admin
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    USER_BY_ID: (id) => `/admin/users/${id}`,
    USER_BAN: (id) => `/admin/users/${id}/ban`,
    USER_UNBAN: (id) => `/admin/users/${id}/unban`,
    STATS: '/admin/stats',
    EXPORT: (type) => `/admin/export/${type}`,
    AUDIT_LOGS: '/admin/audit-logs',
    CONFIG: '/admin/config',
    HEALTH: '/admin/health',
    MANAGE_INCIDENT: (id, action) => `/admin/incidents/${id}/${action}`,
  },

  // System
  HEALTH: '/health',
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  TIMEOUT_ERROR: 'Request timeout. Please try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  RATE_LIMIT: 'Too many requests. Please wait before trying again.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
};

// Request Headers
export const HEADERS = {
  CONTENT_TYPE_JSON: 'application/json',
  CONTENT_TYPE_FORM: 'multipart/form-data',
  AUTHORIZATION: 'Authorization',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  THEME: 'theme_preference',
  LANGUAGE: 'language_preference',
};

// API Response Status
export const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading',
  IDLE: 'idle',
};

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_AUDIO_TYPES: ['audio/mp3', 'audio/wav', 'audio/ogg'],
  MAX_FILES_PER_INCIDENT: 5,
};

// Pagination Configuration
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
};

// Cache Configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  USER_PROFILE_TTL: 15 * 60 * 1000, // 15 minutes
  INCIDENTS_TTL: 2 * 60 * 1000, // 2 minutes
  DASHBOARD_TTL: 1 * 60 * 1000, // 1 minute
};

export default {
  API_CONFIG,
  ENDPOINTS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  HEADERS,
  STORAGE_KEYS,
  API_STATUS,
  UPLOAD_CONFIG,
  PAGINATION,
  CACHE_CONFIG,
};