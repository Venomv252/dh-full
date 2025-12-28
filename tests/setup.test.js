/**
 * Test Framework Setup Verification
 * 
 * Basic tests to verify the testing framework is working correctly
 */

const mongoose = require('mongoose');
const { createTestAgent, clearTestData } = require('./utils/testHelpers');
const { generators, validators } = require('./utils/propertyTestHelpers');
const fc = require('fast-check');

describe('Testing Framework Setup', () => {
  let agent;

  beforeAll(() => {
    agent = createTestAgent();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Database Connection', () => {
    test('should be connected to test database', () => {
      expect(mongoose.connection.readyState).toBe(1); // 1 = connected
      // The database name might be different in memory server, just check it exists
      expect(mongoose.connection.name).toBeTruthy();
    });

    test('should be able to clear test data', async () => {
      await clearTestData();
      // Test passes if no errors are thrown
      expect(true).toBe(true);
    });
  });

  describe('API Server', () => {
    test('should respond to health check', async () => {
      const response = await agent.get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Emergency Incident Platform API');
    });

    test('should return 404 for unknown routes', async () => {
      const response = await agent.get('/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
    });
  });

  describe('Test Factories and Generators', () => {
    test('should generate valid email addresses', () => {
      // Use fc.sample to generate a sample value
      const emails = fc.sample(generators.email(), 1);
      const email = emails[0];
      
      expect(typeof email).toBe('string');
      expect(validators.isValidEmail(email)).toBe(true);
    });

    test('should generate valid coordinates', () => {
      const coordinates = fc.sample(generators.coordinates(), 1);
      const [lng, lat] = coordinates[0];
      
      expect(typeof lng).toBe('number');
      expect(typeof lat).toBe('number');
      expect(lng).toBeGreaterThanOrEqual(-180);
      expect(lng).toBeLessThanOrEqual(180);
      expect(lat).toBeGreaterThanOrEqual(-90);
      expect(lat).toBeLessThanOrEqual(90);
    });

    test('should generate valid GeoJSON points', () => {
      const points = fc.sample(generators.geoJSONPoint(), 1);
      const point = points[0];
      
      expect(validators.isValidGeoJSON(point)).toBe(true);
    });

    test('should generate valid incident types', () => {
      const types = fc.sample(generators.incidentType(), 1);
      const type = types[0];
      
      expect(validators.isValidIncidentType(type)).toBe(true);
    });
  });

  describe('Property Test Helpers', () => {
    test('should validate email format correctly', () => {
      expect(validators.isValidEmail('test@example.com')).toBe(true);
      expect(validators.isValidEmail('invalid-email')).toBe(false);
      expect(validators.isValidEmail('@example.com')).toBe(false);
      expect(validators.isValidEmail('test@')).toBe(false);
    });

    test('should validate phone format correctly', () => {
      expect(validators.isValidPhone('+11234567890')).toBe(true);
      expect(validators.isValidPhone('1234567890')).toBe(false);
      expect(validators.isValidPhone('+1123456789')).toBe(false); // Too short
      expect(validators.isValidPhone('+112345678901')).toBe(false); // Too long
    });

    test('should validate GeoJSON format correctly', () => {
      const validPoint = {
        type: 'Point',
        coordinates: [-122.4194, 37.7749]
      };
      expect(validators.isValidGeoJSON(validPoint)).toBe(true);

      const invalidPoint1 = {
        type: 'Polygon',
        coordinates: [-122.4194, 37.7749]
      };
      expect(validators.isValidGeoJSON(invalidPoint1)).toBe(false);

      const invalidPoint2 = {
        type: 'Point',
        coordinates: [-200, 37.7749] // Invalid longitude
      };
      expect(validators.isValidGeoJSON(invalidPoint2)).toBe(false);
    });
  });
});

/**
 * Feature: emergency-incident-platform, Property Test Framework Verification
 * 
 * Simple property test to verify the framework is working
 */
describe('Property Test Framework Verification', () => {
  test('Property: Email generation produces valid emails', () => {
    fc.assert(
      fc.property(generators.email(), (email) => {
        return validators.isValidEmail(email);
      }),
      { numRuns: 50 } // Reduced runs for setup test
    );
  });

  test('Property: Coordinate generation produces valid coordinates', () => {
    fc.assert(
      fc.property(generators.coordinates(), ([lng, lat]) => {
        return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
      }),
      { numRuns: 50 }
    );
  });

  test('Property: GeoJSON generation produces valid GeoJSON', () => {
    fc.assert(
      fc.property(generators.geoJSONPoint(), (point) => {
        return validators.isValidGeoJSON(point);
      }),
      { numRuns: 50 }
    );
  });
});