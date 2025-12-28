/**
 * Cloudinary Configuration
 * 
 * Configuration settings and validation for Cloudinary integration
 */

/**
 * Cloudinary configuration validation
 */
const validateCloudinaryConfig = () => {
  const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY', 
    'CLOUDINARY_API_SECRET'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required Cloudinary environment variables: ${missingVars.join(', ')}`);
  }
  
  console.log('✅ Cloudinary configuration validated');
  return true;
};

/**
 * Cloudinary upload presets and transformations
 */
const UPLOAD_PRESETS = {
  INCIDENT_IMAGE: {
    folder: 'incidents/images',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 1200, height: 1200, crop: 'limit' }
    ],
    tags: ['incident', 'image']
  },
  
  INCIDENT_VIDEO: {
    folder: 'incidents/videos',
    transformation: [
      { quality: 'auto' },
      { width: 1280, height: 720, crop: 'limit' }
    ],
    tags: ['incident', 'video']
  },
  
  PROFILE_IMAGE: {
    folder: 'profiles',
    transformation: [
      { quality: 'auto', fetch_format: 'auto' },
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }
    ],
    tags: ['profile', 'image']
  }
};

/**
 * File validation rules
 */
const FILE_VALIDATION = {
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png', 
    'image/gif',
    'image/webp'
  ],
  
  ALLOWED_VIDEO_TYPES: [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/quicktime'
  ],
  
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_REQUEST: 5,
  
  // File size limits by type
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,  // 5MB for images
  MAX_VIDEO_SIZE: 10 * 1024 * 1024  // 10MB for videos
};

/**
 * Get file validation rules based on file type
 */
const getValidationRules = (fileType) => {
  const isImage = FILE_VALIDATION.ALLOWED_IMAGE_TYPES.includes(fileType);
  const isVideo = FILE_VALIDATION.ALLOWED_VIDEO_TYPES.includes(fileType);
  
  if (isImage) {
    return {
      maxSize: FILE_VALIDATION.MAX_IMAGE_SIZE,
      allowedTypes: FILE_VALIDATION.ALLOWED_IMAGE_TYPES,
      preset: UPLOAD_PRESETS.INCIDENT_IMAGE
    };
  }
  
  if (isVideo) {
    return {
      maxSize: FILE_VALIDATION.MAX_VIDEO_SIZE,
      allowedTypes: FILE_VALIDATION.ALLOWED_VIDEO_TYPES,
      preset: UPLOAD_PRESETS.INCIDENT_VIDEO
    };
  }
  
  return null;
};

/**
 * Cloudinary error codes and messages
 */
const ERROR_CODES = {
  INVALID_FILE_TYPE: 'CLOUDINARY_INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'CLOUDINARY_FILE_TOO_LARGE',
  UPLOAD_FAILED: 'CLOUDINARY_UPLOAD_FAILED',
  DELETE_FAILED: 'CLOUDINARY_DELETE_FAILED',
  INVALID_PUBLIC_ID: 'CLOUDINARY_INVALID_PUBLIC_ID',
  QUOTA_EXCEEDED: 'CLOUDINARY_QUOTA_EXCEEDED',
  NETWORK_ERROR: 'CLOUDINARY_NETWORK_ERROR'
};

/**
 * Get user-friendly error message
 */
const getErrorMessage = (errorCode, details = {}) => {
  const messages = {
    [ERROR_CODES.INVALID_FILE_TYPE]: `File type not allowed. Supported types: images (JPEG, PNG, GIF, WebP) and videos (MP4, AVI, MOV, WMV)`,
    [ERROR_CODES.FILE_TOO_LARGE]: `File size exceeds limit. Maximum allowed: ${details.maxSize ? Math.round(details.maxSize / 1024 / 1024) : 10}MB`,
    [ERROR_CODES.UPLOAD_FAILED]: `Upload failed: ${details.reason || 'Unknown error'}`,
    [ERROR_CODES.DELETE_FAILED]: `Delete failed: ${details.reason || 'Unknown error'}`,
    [ERROR_CODES.INVALID_PUBLIC_ID]: `Invalid media ID: ${details.publicId || 'Unknown'}`,
    [ERROR_CODES.QUOTA_EXCEEDED]: `Upload quota exceeded. Please try again later.`,
    [ERROR_CODES.NETWORK_ERROR]: `Network error occurred. Please check your connection and try again.`
  };
  
  return messages[errorCode] || 'An unknown error occurred';
};

module.exports = {
  validateCloudinaryConfig,
  UPLOAD_PRESETS,
  FILE_VALIDATION,
  getValidationRules,
  ERROR_CODES,
  getErrorMessage
};