/**
 * Media Upload Routes
 * 
 * Handles media upload, deletion, and management via Cloudinary
 */

const express = require('express');
const { 
  upload, 
  uploadMedia, 
  uploadMultipleMedia, 
  deleteMedia, 
  generateSignedUploadUrl,
  validateFile,
  getMediaMetadata
} = require('../services/cloudinary');
const { ERROR_CODES, getErrorMessage } = require('../config/cloudinary');
const { HTTP_STATUS } = require('../config/constants');

const router = express.Router();

/**
 * Upload single media file
 * POST /api/media/upload
 */
router.post('/upload', upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_FILE_TYPE,
          message: 'No file provided',
          type: 'validation'
        }
      });
    }
    
    // Validate file
    const validation = validateFile(req.file);
    if (!validation.isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_FILE_TYPE,
          message: validation.errors.join(', '),
          type: 'validation',
          details: { errors: validation.errors }
        }
      });
    }
    
    // Upload to Cloudinary
    const uploadResult = await uploadMedia(req.file.buffer, {
      folder: req.body.folder || 'incidents',
      tags: req.body.tags ? req.body.tags.split(',') : ['emergency', 'incident']
    });
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        media: uploadResult,
        message: 'Media uploaded successfully'
      }
    });
    
  } catch (error) {
    console.error('Media upload error:', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.UPLOAD_FAILED,
        message: getErrorMessage(ERROR_CODES.UPLOAD_FAILED, { reason: error.message }),
        type: 'upload'
      }
    });
  }
});

/**
 * Upload multiple media files
 * POST /api/media/upload-multiple
 */
router.post('/upload-multiple', upload.array('media', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_FILE_TYPE,
          message: 'No files provided',
          type: 'validation'
        }
      });
    }
    
    // Validate all files
    const validationErrors = [];
    req.files.forEach((file, index) => {
      const validation = validateFile(file);
      if (!validation.isValid) {
        validationErrors.push(`File ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });
    
    if (validationErrors.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_FILE_TYPE,
          message: validationErrors.join('; '),
          type: 'validation',
          details: { errors: validationErrors }
        }
      });
    }
    
    // Upload all files to Cloudinary
    const uploadResults = await uploadMultipleMedia(req.files, {
      folder: req.body.folder || 'incidents',
      tags: req.body.tags ? req.body.tags.split(',') : ['emergency', 'incident']
    });
    
    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        media: uploadResults,
        count: uploadResults.length,
        message: `${uploadResults.length} media files uploaded successfully`
      }
    });
    
  } catch (error) {
    console.error('Multiple media upload error:', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.UPLOAD_FAILED,
        message: getErrorMessage(ERROR_CODES.UPLOAD_FAILED, { reason: error.message }),
        type: 'upload'
      }
    });
  }
});

/**
 * Delete media file
 * DELETE /api/media/:publicId
 */
router.delete('/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;
    
    if (!publicId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_PUBLIC_ID,
          message: 'Public ID is required',
          type: 'validation'
        }
      });
    }
    
    // Delete from Cloudinary
    const deleteResult = await deleteMedia(publicId, resourceType);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        result: deleteResult,
        message: 'Media deleted successfully'
      }
    });
    
  } catch (error) {
    console.error('Media delete error:', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.DELETE_FAILED,
        message: getErrorMessage(ERROR_CODES.DELETE_FAILED, { reason: error.message }),
        type: 'delete'
      }
    });
  }
});

/**
 * Get signed upload URL for direct client uploads
 * GET /api/media/signed-upload-url
 */
router.get('/signed-upload-url', (req, res) => {
  try {
    const { folder, tags } = req.query;
    
    const signedUpload = generateSignedUploadUrl({
      folder: folder || 'incidents',
      tags: tags ? tags.split(',') : ['emergency', 'incident']
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        upload: signedUpload,
        message: 'Signed upload URL generated successfully'
      }
    });
    
  } catch (error) {
    console.error('Signed URL generation error:', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: ERROR_CODES.UPLOAD_FAILED,
        message: getErrorMessage(ERROR_CODES.UPLOAD_FAILED, { reason: error.message }),
        type: 'signed_url'
      }
    });
  }
});

/**
 * Get media metadata
 * GET /api/media/:publicId/metadata
 */
router.get('/:publicId/metadata', async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: {
          code: ERROR_CODES.INVALID_PUBLIC_ID,
          message: 'Public ID is required',
          type: 'validation'
        }
      });
    }
    
    // Get metadata from Cloudinary
    const metadata = await getMediaMetadata(publicId);
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        metadata,
        message: 'Media metadata retrieved successfully'
      }
    });
    
  } catch (error) {
    console.error('Get metadata error:', error);
    
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: {
        code: ERROR_CODES.INVALID_PUBLIC_ID,
        message: getErrorMessage(ERROR_CODES.INVALID_PUBLIC_ID, { publicId: req.params.publicId }),
        type: 'not_found'
      }
    });
  }
});

/**
 * Health check for Cloudinary service
 * GET /api/media/health
 */
router.get('/health', (req, res) => {
  try {
    const cloudinaryConfig = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Configured' : '❌ Missing',
      apiKey: process.env.CLOUDINARY_API_KEY ? '✅ Configured' : '❌ Missing',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '✅ Configured' : '❌ Missing'
    };
    
    const isHealthy = Object.values(cloudinaryConfig).every(status => status.includes('✅'));
    
    res.status(isHealthy ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE).json({
      success: isHealthy,
      data: {
        service: 'Cloudinary Media Service',
        status: isHealthy ? 'healthy' : 'unhealthy',
        configuration: cloudinaryConfig,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        type: 'system'
      }
    });
  }
});

module.exports = router;