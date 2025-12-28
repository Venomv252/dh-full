/**
 * Google Maps Configuration
 * 
 * Configuration settings for Google Maps API integration
 * Handles geocoding, reverse geocoding, and location validation
 */

const MAPS_CONFIG = {
  // Google Maps API configuration
  API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  
  // Geocoding settings
  GEOCODING: {
    BASE_URL: 'https://maps.googleapis.com/maps/api/geocode/json',
    LANGUAGE: 'en',
    REGION: 'US', // Default region for geocoding bias
    RESULT_TYPE: 'street_address|premise|subpremise',
    LOCATION_TYPE: 'ROOFTOP|RANGE_INTERPOLATED|GEOMETRIC_CENTER'
  },
  
  // Distance calculation settings
  DISTANCE: {
    PROXIMITY_THRESHOLD: 100, // meters for duplicate incident detection
    MAX_SEARCH_RADIUS: 5000, // 5km maximum search radius
    UNIT: 'metric' // metric or imperial
  },
  
  // Location validation rules
  VALIDATION: {
    MIN_LATITUDE: -90,
    MAX_LATITUDE: 90,
    MIN_LONGITUDE: -180,
    MAX_LONGITUDE: 180,
    COORDINATE_PRECISION: 6, // decimal places
    ADDRESS_MAX_LENGTH: 500,
    CITY_MAX_LENGTH: 100,
    STATE_MAX_LENGTH: 50,
    POSTAL_CODE_MAX_LENGTH: 20
  },
  
  // Rate limiting for API calls
  RATE_LIMITS: {
    REQUESTS_PER_SECOND: 50,
    REQUESTS_PER_DAY: 25000,
    BURST_LIMIT: 100
  },
  
  // Fallback settings
  FALLBACK: {
    ENABLE_FALLBACK: true,
    DEFAULT_COORDINATES: {
      lat: 40.7128, // New York City default
      lng: -74.0060
    },
    TIMEOUT_MS: 5000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000
  },
  
  // Supported location types
  LOCATION_TYPES: {
    GPS: 'gps',
    ADDRESS: 'address',
    PLACE_ID: 'place_id',
    COORDINATES: 'coordinates'
  },
  
  // Error codes
  ERROR_CODES: {
    INVALID_COORDINATES: 'INVALID_COORDINATES',
    GEOCODING_FAILED: 'GEOCODING_FAILED',
    REVERSE_GEOCODING_FAILED: 'REVERSE_GEOCODING_FAILED',
    API_KEY_MISSING: 'API_KEY_MISSING',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    INVALID_ADDRESS: 'INVALID_ADDRESS'
  }
};

/**
 * Validate Google Maps API configuration
 */
const validateMapsConfig = () => {
  const errors = [];
  
  if (!MAPS_CONFIG.API_KEY) {
    errors.push('GOOGLE_MAPS_API_KEY environment variable is required');
  }
  
  if (MAPS_CONFIG.API_KEY && MAPS_CONFIG.API_KEY.length < 20) {
    errors.push('GOOGLE_MAPS_API_KEY appears to be invalid (too short)');
  }
  
  if (errors.length > 0) {
    console.error('❌ Google Maps configuration errors:', errors);
    return { isValid: false, errors };
  }
  
  console.log('✅ Google Maps configuration validated successfully');
  return { isValid: true, errors: [] };
};

/**
 * Get configuration for specific feature
 * @param {string} feature - Feature name (geocoding, distance, validation, etc.)
 * @returns {Object} Feature configuration
 */
const getFeatureConfig = (feature) => {
  const configs = {
    geocoding: MAPS_CONFIG.GEOCODING,
    distance: MAPS_CONFIG.DISTANCE,
    validation: MAPS_CONFIG.VALIDATION,
    rateLimits: MAPS_CONFIG.RATE_LIMITS,
    fallback: MAPS_CONFIG.FALLBACK,
    locationTypes: MAPS_CONFIG.LOCATION_TYPES,
    errorCodes: MAPS_CONFIG.ERROR_CODES
  };
  
  return configs[feature] || null;
};

/**
 * Build Google Maps API URL
 * @param {string} endpoint - API endpoint (geocode, etc.)
 * @param {Object} params - Query parameters
 * @returns {string} Complete API URL
 */
const buildApiUrl = (endpoint, params = {}) => {
  const baseUrls = {
    geocode: MAPS_CONFIG.GEOCODING.BASE_URL,
    // Add other endpoints as needed
  };
  
  const baseUrl = baseUrls[endpoint];
  if (!baseUrl) {
    throw new Error(`Unknown Google Maps API endpoint: ${endpoint}`);
  }
  
  const queryParams = new URLSearchParams({
    key: MAPS_CONFIG.API_KEY,
    ...params
  });
  
  return `${baseUrl}?${queryParams.toString()}`;
};

module.exports = {
  MAPS_CONFIG,
  validateMapsConfig,
  getFeatureConfig,
  buildApiUrl
};