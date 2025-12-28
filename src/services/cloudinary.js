/**
 * Cloudinary Service
 * 
 * Handles media upload, optimization, and management using Cloudinary
 * Provides secure image and video upload capabilities for incident reporting
 */

const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { Readable } = require('stream');

/**
 * Configure Cloudinary with environment variables
 */
const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('✅ Cloudinary configured successfully');
};

/**
 * Multer configuration for handling file uploads
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed. Only images and videos are permitted.`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  }
});

/**
 * Upload media file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result with URL and metadata
 */
const uploadMedia = async (fileBuffer, options = {}) => {
  try {
    const {
      folder = 'emergency-incidents',
      resourceType = 'auto',
      transformation = [],
      tags = ['emergency', 'incident']
    } = options;
    
    // Create upload stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `emergency-platform/${folder}`,
          resource_type: resourceType,
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1200, height: 1200, crop: 'limit' },
            ...transformation
          ],
          tags: tags,
          overwrite: false,
          unique_filename: true,
          use_filename: false
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error(`Media upload failed: ${error.message}`));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              resourceType: result.resource_type,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
              createdAt: result.created_at
            });
          }
        }
      );
      
      // Convert buffer to stream and pipe to Cloudinary
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
    
  } catch (error) {
    console.error('Upload media error:', error);
    throw new Error(`Media upload failed: ${error.message}`);
  }
};

/**
 * Upload multiple media files
 * @param {Array} files - Array of file objects from multer
 * @param {Object} options - Upload options
 * @returns {Promise<Array>} Array of upload results
 */
const uploadMultipleMedia = async (files, options = {}) => {
  try {
    const uploadPromises = files.map(file => 
      uploadMedia(file.buffer, {
        ...options,
        folder: `${options.folder || 'emergency-incidents'}/${Date.now()}`
      })
    );
    
    const results = await Promise.all(uploadPromises);
    
    console.log(`✅ Successfully uploaded ${results.length} media files`);
    return results;
    
  } catch (error) {
    console.error('Multiple upload error:', error);
    throw new Error(`Multiple media upload failed: ${error.message}`);
  }
};

/**
 * Delete media from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image/video)
 * @returns {Promise<Object>} Deletion result
 */
const deleteMedia = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    
    if (result.result === 'ok') {
      console.log(`✅ Media deleted successfully: ${publicId}`);
      return { success: true, publicId, result: result.result };
    } else {
      throw new Error(`Failed to delete media: ${result.result}`);
    }
    
  } catch (error) {
    console.error('Delete media error:', error);
    throw new Error(`Media deletion failed: ${error.message}`);
  }
};

/**
 * Get optimized URL for existing media
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformation - Transformation options
 * @returns {string} Optimized URL
 */
const getOptimizedUrl = (publicId, transformation = {}) => {
  try {
    const {
      width = 800,
      height = 600,
      crop = 'fill',
      quality = 'auto',
      format = 'auto'
    } = transformation;
    
    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: format,
      secure: true
    });
    
  } catch (error) {
    console.error('Get optimized URL error:', error);
    throw new Error(`Failed to generate optimized URL: ${error.message}`);
  }
};

/**
 * Generate signed upload URL for direct client uploads
 * @param {Object} options - Upload options
 * @returns {Object} Signed upload data
 */
const generateSignedUploadUrl = (options = {}) => {
  try {
    const {
      folder = 'emergency-incidents',
      tags = ['emergency', 'incident'],
      transformation = []
    } = options;
    
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const params = {
      timestamp,
      folder: `emergency-platform/${folder}`,
      tags: tags.join(','),
      transformation: transformation.length > 0 ? transformation : undefined
    };
    
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
    
    return {
      url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
      params: {
        ...params,
        signature,
        api_key: process.env.CLOUDINARY_API_KEY
      }
    };
    
  } catch (error) {
    console.error('Generate signed URL error:', error);
    throw new Error(`Failed to generate signed upload URL: ${error.message}`);
  }
};

/**
 * Validate file type and size
 * @param {Object} file - File object from multer
 * @returns {Object} Validation result
 */
const validateFile = (file) => {
  const errors = [];
  
  // Check file type
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv'
  ];
  
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }
  
  // Check file size based on type
  const { FILE_VALIDATION } = require('../config/cloudinary');
  let maxSize = FILE_VALIDATION.MAX_FILE_SIZE; // Default 10MB
  
  // Use type-specific limits
  if (FILE_VALIDATION.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    maxSize = FILE_VALIDATION.MAX_IMAGE_SIZE; // 5MB for images
  } else if (FILE_VALIDATION.ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    maxSize = FILE_VALIDATION.MAX_VIDEO_SIZE; // 10MB for videos
  }
  
  if (file.size > maxSize) {
    errors.push(`File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`);
  }
  
  // Check if file has content
  if (!file.buffer || file.buffer.length === 0) {
    errors.push('File appears to be empty');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get media metadata from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} Media metadata
 */
const getMediaMetadata = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'auto'
    });
    
    return {
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      url: result.secure_url,
      createdAt: result.created_at,
      tags: result.tags
    };
    
  } catch (error) {
    console.error('Get media metadata error:', error);
    throw new Error(`Failed to get media metadata: ${error.message}`);
  }
};

// Initialize Cloudinary configuration
configureCloudinary();

module.exports = {
  upload,
  uploadMedia,
  uploadMultipleMedia,
  deleteMedia,
  getOptimizedUrl,
  generateSignedUploadUrl,
  validateFile,
  getMediaMetadata,
  configureCloudinary
};