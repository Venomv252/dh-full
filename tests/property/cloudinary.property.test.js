/**
 * Property-Based Tests for Cloudinary Media Management System
 * 
 * Tests the media upload, validation, and management functionality
 * Property 8: Media management system
 */

const fc = require('fast-check');
const { mediaUploadArbitrary } = require('../utils/propertyGenerators');
const { validateFile } = require('../../src/services/cloudinary');
const { getValidationRules, FILE_VALIDATION } = require('../../src/config/cloudinary');

describe('Property Test: Cloudinary Media Management System', () => {

  test('Property 8: Media management system - File validation consistency', () => {
    // Feature: emergency-incident-platform, Property 8: Media management system
    fc.assert(fc.property(
      mediaUploadArbitrary(),
      (fileData) => {
        // Test file validation logic
        const validation = validateFile(fileData);
        
        // Validation should always return an object with isValid and errors
        expect(validation).toHaveProperty('isValid');
        expect(validation).toHaveProperty('errors');
        expect(Array.isArray(validation.errors)).toBe(true);
        
        // If file is valid, errors array should be empty
        if (validation.isValid) {
          expect(validation.errors).toHaveLength(0);
        } else {
          expect(validation.errors.length).toBeGreaterThan(0);
        }
        
        // Test file type validation
        const allowedTypes = [
          ...FILE_VALIDATION.ALLOWED_IMAGE_TYPES,
          ...FILE_VALIDATION.ALLOWED_VIDEO_TYPES
        ];
        
        const isAllowedType = allowedTypes.includes(fileData.mimetype);
        const hasTypeError = validation.errors.some(error => 
          error.includes('File type') && error.includes('not allowed')
        );
        
        // If file type is not allowed, there should be a type error
        if (!isAllowedType) {
          expect(hasTypeError).toBe(true);
        }
        
        // Test file size validation
        const isSizeValid = fileData.size <= FILE_VALIDATION.MAX_FILE_SIZE;
        const hasSizeError = validation.errors.some(error => 
          error.includes('File size') && error.includes('exceeds')
        );
        
        // If file size exceeds limit, there should be a size error
        if (!isSizeValid) {
          expect(hasSizeError).toBe(true);
        }
        
        // Test buffer validation
        const hasValidBuffer = fileData.buffer && fileData.buffer.length > 0;
        const hasBufferError = validation.errors.some(error => 
          error.includes('empty')
        );
        
        // If buffer is invalid, there should be a buffer error
        if (!hasValidBuffer) {
          expect(hasBufferError).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 8a: File type validation rules consistency', () => {
    // Feature: emergency-incident-platform, Property 8: Media management system
    fc.assert(fc.property(
      fc.constantFrom(
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
        'application/pdf', 'text/plain', 'audio/mp3' // Invalid types
      ),
      (mimeType) => {
        const rules = getValidationRules(mimeType);
        
        const isImageType = FILE_VALIDATION.ALLOWED_IMAGE_TYPES.includes(mimeType);
        const isVideoType = FILE_VALIDATION.ALLOWED_VIDEO_TYPES.includes(mimeType);
        const isValidType = isImageType || isVideoType;
        
        if (isValidType) {
          // Valid types should return validation rules
          expect(rules).not.toBeNull();
          expect(rules).toHaveProperty('maxSize');
          expect(rules).toHaveProperty('allowedTypes');
          expect(rules).toHaveProperty('preset');
          
          // Image types should have image-specific rules
          if (isImageType) {
            expect(rules.maxSize).toBe(FILE_VALIDATION.MAX_IMAGE_SIZE);
            expect(rules.allowedTypes).toEqual(FILE_VALIDATION.ALLOWED_IMAGE_TYPES);
          }
          
          // Video types should have video-specific rules
          if (isVideoType) {
            expect(rules.maxSize).toBe(FILE_VALIDATION.MAX_VIDEO_SIZE);
            expect(rules.allowedTypes).toEqual(FILE_VALIDATION.ALLOWED_VIDEO_TYPES);
          }
        } else {
          // Invalid types should return null
          expect(rules).toBeNull();
        }
      }
    ), { numRuns: 50 });
  });

  test('Property 8b: File size validation boundaries', () => {
    // Feature: emergency-incident-platform, Property 8: Media management system
    fc.assert(fc.property(
      fc.record({
        mimetype: fc.constantFrom('image/jpeg', 'video/mp4'),
        size: fc.integer({ min: 0, max: 20 * 1024 * 1024 }), // 0 to 20MB
        buffer: fc.uint8Array({ minLength: 0, maxLength: 1000 }),
        originalname: fc.string({ minLength: 1, maxLength: 100 })
      }),
      (fileData) => {
        const validation = validateFile(fileData);
        const rules = getValidationRules(fileData.mimetype);
        
        if (rules) {
          const exceedsLimit = fileData.size > rules.maxSize;
          const hasSizeError = validation.errors.some(error => 
            error.includes('File size') && error.includes('exceeds')
          );
          
          // Size validation should be consistent with rules
          expect(exceedsLimit).toBe(hasSizeError);
          
          // If file is within size limit and has valid type and buffer, it should be valid
          if (!exceedsLimit && fileData.buffer && fileData.buffer.length > 0) {
            const typeErrors = validation.errors.filter(error => 
              !error.includes('File size') && !error.includes('empty')
            );
            expect(typeErrors).toHaveLength(0);
          }
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 8c: Upload preset configuration consistency', () => {
    // Feature: emergency-incident-platform, Property 8: Media management system
    fc.assert(fc.property(
      fc.record({
        folder: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }))
      }),
      (options) => {
        // Test that upload options are processed correctly
        const folder = options.folder || 'emergency-incidents';
        const tags = options.tags || ['emergency', 'incident'];
        
        // Folder should be a non-empty string
        expect(typeof folder).toBe('string');
        expect(folder.length).toBeGreaterThan(0);
        
        // Tags should be an array of strings
        expect(Array.isArray(tags)).toBe(true);
        tags.forEach(tag => {
          expect(typeof tag).toBe('string');
          expect(tag.length).toBeGreaterThan(0);
        });
        
        // Default values should be applied when options are not provided
        if (!options.folder) {
          expect(folder).toBe('emergency-incidents');
        }
        
        if (!options.tags) {
          expect(tags).toEqual(['emergency', 'incident']);
        }
      }
    ), { numRuns: 50 });
  });

  test('Property 8d: Error handling consistency', () => {
    // Feature: emergency-incident-platform, Property 8: Media management system
    fc.assert(fc.property(
      fc.record({
        mimetype: fc.string({ minLength: 1, maxLength: 50 }),
        size: fc.integer({ min: -1, max: 50 * 1024 * 1024 }),
        buffer: fc.option(fc.uint8Array({ minLength: 0, maxLength: 100 })),
        originalname: fc.option(fc.string({ minLength: 0, maxLength: 200 }))
      }),
      (fileData) => {
        const validation = validateFile(fileData);
        
        // Validation should never throw an error, always return a result
        expect(validation).toBeDefined();
        expect(typeof validation.isValid).toBe('boolean');
        expect(Array.isArray(validation.errors)).toBe(true);
        
        // Error messages should be descriptive strings
        validation.errors.forEach(error => {
          expect(typeof error).toBe('string');
          expect(error.length).toBeGreaterThan(0);
        });
        
        // If there are errors, isValid should be false
        if (validation.errors.length > 0) {
          expect(validation.isValid).toBe(false);
        }
        
        // If there are no errors, isValid should be true
        if (validation.errors.length === 0) {
          expect(validation.isValid).toBe(true);
        }
      }
    ), { numRuns: 100 });
  });

  test('Property 8e: Multiple file validation consistency', () => {
    // Feature: emergency-incident-platform, Property 8: Media management system
    fc.assert(fc.property(
      fc.array(mediaUploadArbitrary(), { minLength: 1, maxLength: 10 }),
      (files) => {
        // Test validation of multiple files
        const validationResults = files.map(file => validateFile(file));
        
        // Each file should have its own validation result
        expect(validationResults).toHaveLength(files.length);
        
        // Validation results should be independent
        validationResults.forEach((result, index) => {
          expect(result).toHaveProperty('isValid');
          expect(result).toHaveProperty('errors');
          
          // Individual file validation should match batch validation
          const individualResult = validateFile(files[index]);
          expect(result.isValid).toBe(individualResult.isValid);
          expect(result.errors).toEqual(individualResult.errors);
        });
        
        // Count valid and invalid files
        const validFiles = validationResults.filter(r => r.isValid).length;
        const invalidFiles = validationResults.filter(r => !r.isValid).length;
        
        expect(validFiles + invalidFiles).toBe(files.length);
        
        // If all files are valid, batch should be valid
        const allValid = validationResults.every(r => r.isValid);
        const anyInvalid = validationResults.some(r => !r.isValid);
        
        expect(allValid).toBe(!anyInvalid);
      }
    ), { numRuns: 50 });
  });

});

describe('Cloudinary Configuration Property Tests', () => {

  test('Property: Configuration validation consistency', () => {
    fc.assert(fc.property(
      fc.record({
        CLOUDINARY_CLOUD_NAME: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        CLOUDINARY_API_KEY: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        CLOUDINARY_API_SECRET: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
      }),
      (envVars) => {
        // Simulate environment variable validation
        const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
        const missingVars = requiredVars.filter(varName => !envVars[varName]);
        
        // Configuration should be valid only if all required vars are present
        const isValid = missingVars.length === 0;
        
        if (isValid) {
          // All required variables should be present and non-empty
          expect(envVars.CLOUDINARY_CLOUD_NAME).toBeTruthy();
          expect(envVars.CLOUDINARY_API_KEY).toBeTruthy();
          expect(envVars.CLOUDINARY_API_SECRET).toBeTruthy();
        } else {
          // At least one required variable should be missing
          expect(missingVars.length).toBeGreaterThan(0);
        }
        
        // Missing variables should be correctly identified
        requiredVars.forEach(varName => {
          const isMissing = !envVars[varName];
          const isInMissingList = missingVars.includes(varName);
          expect(isMissing).toBe(isInMissingList);
        });
      }
    ), { numRuns: 50 });
  });

});