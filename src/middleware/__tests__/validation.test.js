/**
 * Validation Middleware Tests
 * Tests for Joi schemas and input sanitization
 */

const request = require('supertest');
const express = require('express');
const { 
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validators,
  schemas,
  sanitize,
  customJoi
} = require('../validation');
const { ERROR_CODES } = require('../../config/constants');

describe('Validation Middleware', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Sanitization functions', () => {
    describe('sanitize.string', () => {
      test('should remove HTML tags', () => {
        const input = '<script>alert("xss")</script>Hello World';
        const result = sanitize.string(input);
        expect(result).toBe('Hello World');
      });

      test('should remove JavaScript injections', () => {
        const input = 'javascript:alert("xss")';
        const result = sanitize.string(input);
        expect(result).toBe('alert("xss")');
      });

      test('should remove SQL injection patterns', () => {
        const input = "'; DROP TABLE users; --";
        const result = sanitize.string(input);
        expect(result).toBe(' DROP TABLE users --');
      });

      test('should trim whitespace', () => {
        const input = '  Hello World  ';
        const result = sanitize.string(input);
        expect(result).toBe('Hello World');
      });

      test('should limit string length', () => {
        const input = 'a'.repeat(20000);
        const result = sanitize.string(input);
        expect(result.length).toBe(10000);
      });

      test('should handle non-string input', () => {
        expect(sanitize.string(123)).toBe('');
        expect(sanitize.string(null)).toBe('');
        expect(sanitize.string(undefined)).toBe('');
      });
    });

    describe('sanitize.email', () => {
      test('should convert to lowercase', () => {
        const input = 'TEST@EXAMPLE.COM';
        const result = sanitize.email(input);
        expect(result).toBe('test@example.com');
      });

      test('should remove dangerous characters', () => {
        const input = 'test<script>@example.com';
        const result = sanitize.email(input);
        expect(result).toBe('testscript@example.com');
      });

      test('should limit length', () => {
        const input = 'a'.repeat(300) + '@example.com';
        const result = sanitize.email(input);
        expect(result.length).toBe(254);
      });
    });

    describe('sanitize.phone', () => {
      test('should keep only valid phone characters', () => {
        const input = '+1 (555) 123-4567 ext 123';
        const result = sanitize.phone(input);
        expect(result).toBe('+1 555 123-4567  123');
      });

      test('should remove invalid characters', () => {
        const input = '+1<script>555</script>1234567';
        const result = sanitize.phone(input);
        expect(result).toBe('+15551234567');
      });
    });

    describe('sanitize.url', () => {
      test('should accept valid HTTPS URLs', () => {
        const input = 'https://example.com/path';
        const result = sanitize.url(input);
        expect(result).toBe('https://example.com/path');
      });

      test('should accept valid HTTP URLs', () => {
        const input = 'http://example.com/path';
        const result = sanitize.url(input);
        expect(result).toBe('http://example.com/path');
      });

      test('should reject invalid protocols', () => {
        const input = 'ftp://example.com/path';
        const result = sanitize.url(input);
        expect(result).toBe('');
      });

      test('should reject malformed URLs', () => {
        const input = 'not-a-url';
        const result = sanitize.url(input);
        expect(result).toBe('');
      });
    });
  });

  describe('Custom Joi extensions', () => {
    describe('geoCoordinates', () => {
      test('should validate correct coordinates', () => {
        const schema = customJoi.geoCoordinates();
        const { error } = schema.validate([-122.4194, 37.7749]); // San Francisco
        expect(error).toBeUndefined();
      });

      test('should reject invalid longitude', () => {
        const schema = customJoi.geoCoordinates();
        const { error } = schema.validate([-200, 37.7749]);
        expect(error).toBeDefined();
        expect(error.message).toContain('Longitude must be between -180 and 180');
      });

      test('should reject invalid latitude', () => {
        const schema = customJoi.geoCoordinates();
        const { error } = schema.validate([-122.4194, 100]);
        expect(error).toBeDefined();
        expect(error.message).toContain('Latitude must be between -90 and 90');
      });

      test('should reject non-array input', () => {
        const schema = customJoi.geoCoordinates();
        const { error } = schema.validate('not-an-array');
        expect(error).toBeDefined();
        expect(error.message).toContain('Invalid coordinates format');
      });

      test('should reject wrong array length', () => {
        const schema = customJoi.geoCoordinates();
        const { error } = schema.validate([1, 2, 3]);
        expect(error).toBeDefined();
        expect(error.message).toContain('Invalid coordinates format');
      });
    });
  });

  describe('User validation schemas', () => {
    describe('User registration', () => {
      const validUserData = {
        fullName: 'John Doe',
        dob: '1990-01-01',
        gender: 'male',
        phone: '+1234567890',
        email: 'john@example.com',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'California',
          pincode: '94102'
        }
      };

      test('should validate correct user registration data', async () => {
        app.post('/test-user-register', validators.user.register, (req, res) => {
          res.json({ success: true, data: req.body });
        });

        const response = await request(app)
          .post('/test-user-register')
          .send(validUserData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.fullName).toBe('John Doe');
      });

      test('should reject missing required fields', async () => {
        app.post('/test-user-register', validators.user.register, (req, res) => {
          res.json({ success: true });
        });

        const invalidData = { ...validUserData };
        delete invalidData.email;

        const response = await request(app)
          .post('/test-user-register')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
        expect(response.body.error.details.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('required')
            })
          ])
        );
      });

      test('should sanitize input data', async () => {
        app.post('/test-user-register', validators.user.register, (req, res) => {
          res.json({ success: true, data: req.body });
        });

        const dataWithXSS = {
          ...validUserData,
          fullName: '<script>alert("xss")</script>John Doe',
          address: {
            ...validUserData.address,
            street: '<img src=x onerror=alert("xss")>123 Main St'
          }
        };

        const response = await request(app)
          .post('/test-user-register')
          .send(dataWithXSS);

        expect(response.status).toBe(200);
        expect(response.body.data.fullName).toBe('John Doe');
        expect(response.body.data.address.street).toBe('123 Main St');
      });

      test('should validate email format', async () => {
        app.post('/test-user-register', validators.user.register, (req, res) => {
          res.json({ success: true });
        });

        const invalidData = {
          ...validUserData,
          email: 'invalid-email'
        };

        const response = await request(app)
          .post('/test-user-register')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error.details.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('valid email')
            })
          ])
        );
      });

      test('should validate phone format', async () => {
        app.post('/test-user-register', validators.user.register, (req, res) => {
          res.json({ success: true });
        });

        const invalidData = {
          ...validUserData,
          phone: '123-456-7890' // Missing country code
        };

        const response = await request(app)
          .post('/test-user-register')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error.details.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'phone',
              message: expect.stringContaining('international format')
            })
          ])
        );
      });

      test('should validate optional arrays', async () => {
        app.post('/test-user-register', validators.user.register, (req, res) => {
          res.json({ success: true, data: req.body });
        });

        const dataWithArrays = {
          ...validUserData,
          medicalConditions: ['Diabetes', 'Hypertension'],
          allergies: ['Peanuts', 'Shellfish'],
          emergencyContacts: [{
            name: 'Jane Doe',
            relation: 'Spouse',
            phone: '+1234567891'
          }],
          vehicles: [{
            vehicleNumber: 'ABC123',
            type: 'Car',
            model: 'Toyota Camry'
          }]
        };

        const response = await request(app)
          .post('/test-user-register')
          .send(dataWithArrays);

        expect(response.status).toBe(200);
        expect(response.body.data.medicalConditions).toEqual(['Diabetes', 'Hypertension']);
        expect(response.body.data.emergencyContacts).toHaveLength(1);
        expect(response.body.data.vehicles).toHaveLength(1);
      });
    });
  });

  describe('Incident validation schemas', () => {
    describe('Incident creation', () => {
      const validIncidentData = {
        title: 'Emergency Incident',
        description: 'This is a test emergency incident with sufficient detail',
        type: 'Medical',
        geoLocation: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749]
        },
        reportedBy: {
          userType: 'user',
          userId: '507f1f77bcf86cd799439011'
        }
      };

      test('should validate correct incident data', async () => {
        app.post('/test-incident-create', validators.incident.create, (req, res) => {
          res.json({ success: true, data: req.body });
        });

        const response = await request(app)
          .post('/test-incident-create')
          .send(validIncidentData);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe('Emergency Incident');
      });

      test('should validate geolocation coordinates', async () => {
        app.post('/test-incident-create', validators.incident.create, (req, res) => {
          res.json({ success: true });
        });

        const invalidData = {
          ...validIncidentData,
          geoLocation: {
            type: 'Point',
            coordinates: [-200, 37.7749] // Invalid longitude
          }
        };

        const response = await request(app)
          .post('/test-incident-create')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error.details.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'geoLocation.coordinates',
              message: expect.stringContaining('Longitude must be between -180 and 180')
            })
          ])
        );
      });

      test('should validate reporter information', async () => {
        app.post('/test-incident-create', validators.incident.create, (req, res) => {
          res.json({ success: true });
        });

        const invalidData = {
          ...validIncidentData,
          reportedBy: {
            userType: 'user'
            // Missing userId
          }
        };

        const response = await request(app)
          .post('/test-incident-create')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error.details.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              field: 'reportedBy.userId',
              message: expect.stringContaining('required')
            })
          ])
        );
      });

      test('should validate media array', async () => {
        app.post('/test-incident-create', validators.incident.create, (req, res) => {
          res.json({ success: true, data: req.body });
        });

        const dataWithMedia = {
          ...validIncidentData,
          media: [{
            type: 'image',
            url: 'https://example.com/image.jpg'
          }]
        };

        const response = await request(app)
          .post('/test-incident-create')
          .send(dataWithMedia);

        expect(response.status).toBe(200);
        expect(response.body.data.media).toHaveLength(1);
        expect(response.body.data.media[0].type).toBe('image');
      });

      test('should sanitize title and description', async () => {
        app.post('/test-incident-create', validators.incident.create, (req, res) => {
          res.json({ success: true, data: req.body });
        });

        const dataWithXSS = {
          ...validIncidentData,
          title: '<script>alert("xss")</script>Emergency Incident',
          description: '<img src=x onerror=alert("xss")>This is a test emergency incident'
        };

        const response = await request(app)
          .post('/test-incident-create')
          .send(dataWithXSS);

        expect(response.status).toBe(200);
        expect(response.body.data.title).toBe('Emergency Incident');
        expect(response.body.data.description).toBe('This is a test emergency incident');
      });
    });

    describe('Incident query', () => {
      test('should validate query parameters', async () => {
        app.get('/test-incident-query', validators.incident.query, (req, res) => {
          res.json({ success: true, query: req.query });
        });

        const response = await request(app)
          .get('/test-incident-query')
          .query({
            page: '2',
            limit: '10',
            type: 'Medical',
            status: 'reported',
            lat: '37.7749',
            lng: '-122.4194',
            radius: '5000'
          });

        expect(response.status).toBe(200);
        expect(response.body.query.page).toBe(2);
        expect(response.body.query.limit).toBe(10);
        expect(response.body.query.type).toBe('Medical');
      });

      test('should apply default values', async () => {
        app.get('/test-incident-query', validators.incident.query, (req, res) => {
          res.json({ success: true, query: req.query });
        });

        const response = await request(app)
          .get('/test-incident-query');

        expect(response.status).toBe(200);
        expect(response.body.query.page).toBe(1);
        expect(response.body.query.limit).toBe(20);
        expect(response.body.query.sortBy).toBe('createdAt');
        expect(response.body.query.sortOrder).toBe('desc');
      });
    });
  });

  describe('Validation middleware functions', () => {
    describe('validateBody', () => {
      test('should validate request body', async () => {
        const schema = schemas.common.objectId;
        
        app.post('/test-validate-body', validateBody(schema), (req, res) => {
          res.json({ success: true });
        });

        const response = await request(app)
          .post('/test-validate-body')
          .send('invalid-object-id');

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('validateQuery', () => {
      test('should validate query parameters', async () => {
        const schema = schemas.common.pagination;
        
        app.get('/test-validate-query', validateQuery(schema), (req, res) => {
          res.json({ success: true, query: req.query });
        });

        const response = await request(app)
          .get('/test-validate-query')
          .query({ page: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      });
    });

    describe('validateParams', () => {
      test('should validate URL parameters', async () => {
        const schema = schemas.common.objectId;
        
        app.get('/test-validate-params/:id', validateParams(schema), (req, res) => {
          res.json({ success: true, params: req.params });
        });

        const response = await request(app)
          .get('/test-validate-params/invalid-id');

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      });
    });
  });

  describe('Error response format', () => {
    test('should return structured validation errors', async () => {
      app.post('/test-error-format', validators.user.register, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-error-format')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', ERROR_CODES.VALIDATION_ERROR);
      expect(response.body.error).toHaveProperty('message', 'Validation failed');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body.error.details).toHaveProperty('errors');
      expect(response.body.error.details).toHaveProperty('errorCount');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should include field-specific error information', async () => {
      app.post('/test-field-errors', validators.user.register, (req, res) => {
        res.json({ success: true });
      });

      const response = await request(app)
        .post('/test-field-errors')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
      expect(response.body.error.details.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ])
      );
    });
  });
});