/**
 * Validation Utilities
 * Common validation functions and helpers
 */

const { 
  INCIDENT_TYPES, 
  INCIDENT_STATUS, 
  GENDER_OPTIONS, 
  BLOOD_GROUPS,
  USER_ROLES,
  MEDIA_TYPES 
} = require('../config/constants');

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - Validation result
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (international format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - Validation result
 */
const isValidPhone = (phone) => {
  // Accepts formats: +1234567890, +12 345 678 9012, +12-345-678-9012
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  const cleanPhone = phone.replace(/[\s-]/g, '');
  return phoneRegex.test(cleanPhone);
};

/**
 * Validate pincode format (flexible for international use)
 * @param {string} pincode - Pincode to validate
 * @returns {boolean} - Validation result
 */
const isValidPincode = (pincode) => {
  // Accepts 4-10 digit postcodes/zip codes
  const pincodeRegex = /^\d{4,10}$/;
  return pincodeRegex.test(pincode);
};

/**
 * Validate GeoJSON coordinates
 * @param {array} coordinates - [longitude, latitude]
 * @returns {boolean} - Validation result
 */
const isValidCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }
  
  const [longitude, latitude] = coordinates;
  
  // Longitude: -180 to 180, Latitude: -90 to 90
  return (
    typeof longitude === 'number' &&
    typeof latitude === 'number' &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} - Validation result
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate incident type
 * @param {string} type - Incident type to validate
 * @returns {boolean} - Validation result
 */
const isValidIncidentType = (type) => {
  return Object.values(INCIDENT_TYPES).includes(type);
};

/**
 * Validate incident status
 * @param {string} status - Incident status to validate
 * @returns {boolean} - Validation result
 */
const isValidIncidentStatus = (status) => {
  return Object.values(INCIDENT_STATUS).includes(status);
};

/**
 * Validate gender option
 * @param {string} gender - Gender to validate
 * @returns {boolean} - Validation result
 */
const isValidGender = (gender) => {
  return Object.values(GENDER_OPTIONS).includes(gender);
};

/**
 * Validate blood group
 * @param {string} bloodGroup - Blood group to validate
 * @returns {boolean} - Validation result
 */
const isValidBloodGroup = (bloodGroup) => {
  return Object.values(BLOOD_GROUPS).includes(bloodGroup);
};

/**
 * Validate user role
 * @param {string} role - User role to validate
 * @returns {boolean} - Validation result
 */
const isValidUserRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

/**
 * Validate media type
 * @param {string} type - Media type to validate
 * @returns {boolean} - Validation result
 */
const isValidMediaType = (type) => {
  return Object.values(MEDIA_TYPES).includes(type);
};

/**
 * Validate date format and ensure it's not in the future
 * @param {string|Date} date - Date to validate
 * @param {boolean} allowFuture - Whether to allow future dates
 * @returns {boolean} - Validation result
 */
const isValidDate = (date, allowFuture = false) => {
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return false;
  }
  
  if (!allowFuture && dateObj > new Date()) {
    return false;
  }
  
  return true;
};

/**
 * Validate age (must be reasonable for emergency services)
 * @param {string|Date} dob - Date of birth
 * @returns {boolean} - Validation result
 */
const isValidAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Age should be between 0 and 150 years
  return age >= 0 && age <= 150;
};

/**
 * Sanitize string input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break queries
    .substring(0, 1000); // Limit length to prevent DoS
};

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {object} - Validated pagination parameters
 */
const validatePagination = (page, limit) => {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  
  return {
    page: validatedPage,
    limit: validatedLimit,
    skip: (validatedPage - 1) * validatedLimit,
  };
};

/**
 * Validate search radius for geospatial queries
 * @param {number} radius - Search radius in meters
 * @returns {number} - Validated radius
 */
const validateSearchRadius = (radius) => {
  const numRadius = parseInt(radius) || 5000; // Default 5km
  return Math.min(50000, Math.max(100, numRadius)); // Between 100m and 50km
};

/**
 * Validate incident title
 * @param {string} title - Title to validate
 * @returns {boolean} - Validation result
 */
const isValidTitle = (title) => {
  if (typeof title !== 'string') {
    return false;
  }
  
  const trimmedTitle = title.trim();
  
  // Check length
  if (trimmedTitle.length < 3 || trimmedTitle.length > 200) {
    return false;
  }
  
  // Check for basic content (not just special characters)
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmedTitle);
  
  return hasAlphanumeric;
};

/**
 * Validate incident description
 * @param {string} description - Description to validate
 * @returns {boolean} - Validation result
 */
const isValidDescription = (description) => {
  if (typeof description !== 'string') {
    return false;
  }
  
  const trimmedDescription = description.trim();
  
  // Check length
  if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
    return false;
  }
  
  // Check for basic content (not just special characters)
  const hasAlphanumeric = /[a-zA-Z0-9]/.test(trimmedDescription);
  
  return hasAlphanumeric;
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidPincode,
  isValidCoordinates,
  isValidUrl,
  isValidIncidentType,
  isValidIncidentStatus,
  isValidGender,
  isValidBloodGroup,
  isValidUserRole,
  isValidMediaType,
  isValidDate,
  isValidAge,
  isValidTitle,
  isValidDescription,
  sanitizeString,
  validatePagination,
  validateSearchRadius,
};