/**
 * Incident Model GeoJSON Property-Based Tests
 * 
 * Property-based tests for Incident model GeoJSON format compliance
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const Incident = require('../../src/models/Incident');
const User = require('../../src/models/User');
const Guest = require('../../src/models/Guest');
const { GEO_CONSTANTS, INCIDENT_TYPES, USER_TYPES } = require('../../src/config/constants');
const { clearTestData } = require('../utils/testHelpers');

describe('Incident Model GeoJSON Property Tests', () => {
  afterEach(async () => {
    await clearTestData();
  });

  /**
   * Feature: emergency-incident-platform, Property 10: GeoJSON format compliance
   * 
   * Property 10: GeoJSON format compliance
   * For any incident with location data, the geoLocation field should strictly
   * comply with GeoJSON Point format specification, including proper type,
   * coordinate array structure, and valid coordinate ranges
   * 
   * Validates: Requirements 3.3
   */
  test('Property 10: GeoJSON format compliance', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid GeoJSON coordinates
        fc.record({
          longitude: fc.float({ min: -180, max: 180, noNaN: true }),
          latitude: fc.float({ min: -90, max: 90, noNaN: true }),
          title: fc.string({ minLength: 3, maxLength: 50 })
            .map(s => s.replace(/[^a-zA-Z0-9\s]/g, 'A').trim() || 'Test Incident')
            .map(s => s.length >= 3 ? s : 'Test Incident'),
          description: fc.string({ minLength: 10, maxLength: 100 })
            .map(s => s.replace(/[^a-zA-Z0-9\s.,!?]/g, 'A').trim() || 'Test incident description for testing')
            .map(s => s.length >= 10 ? s : 'Test incident description for testing'),
          type: fc.constantFrom(...Object.values(INCIDENT_TYPES))
        }),
        
        async (incidentData) => {
          try {
            // Create a test user for reporter
            const testUser = new User({
              fullName: 'Test User',
              email: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
              phone: '+15551234567',
              dob: new Date('1990-01-01'),
              gender: 'male',
              address: {
                street: '123 Test Street',
                city: 'Test City',
                state: 'TS',
                pincode: '123456'
              }
            });
            const savedUser = await testUser.save();
            
            // Create incident with GeoJSON location
            const incident = new Incident({
              title: incidentData.title,
              description: incidentData.description,
              type: incidentData.type,
              geoLocation: {
                type: 'Point',
                coordinates: [incidentData.longitude, incidentData.latitude]
              },
              reportedBy: {
                userType: USER_TYPES.USER,
                userId: savedUser._id
              }
            });
            
            const savedIncident = await incident.save();
            
            // Verify GeoJSON format compliance
            const geoLocation = savedIncident.geoLocation;
            
            // 1. Verify type is exactly "Point"
            expect(geoLocation.type).toBe('Point');
            expect(geoLocation.type).toBe(GEO_CONSTANTS.GEOJSON_TYPE);
            
            // 2. Verify coordinates is an array with exactly 2 elements
            expect(Array.isArray(geoLocation.coordinates)).toBe(true);
            expect(geoLocation.coordinates).toHaveLength(2);
            
            // 3. Verify coordinate order is [longitude, latitude]
            const [storedLongitude, storedLatitude] = geoLocation.coordinates;
            expect(storedLongitude).toBeCloseTo(incidentData.longitude, 10);
            expect(storedLatitude).toBeCloseTo(incidentData.latitude, 10);
            
            // 4. Verify coordinates are numbers
            expect(typeof storedLongitude).toBe('number');
            expect(typeof storedLatitude).toBe('number');
            
            // 5. Verify coordinate ranges are valid
            expect(storedLongitude).toBeGreaterThanOrEqual(-180);
            expect(storedLongitude).toBeLessThanOrEqual(180);
            expect(storedLatitude).toBeGreaterThanOrEqual(-90);
            expect(storedLatitude).toBeLessThanOrEqual(90);
            
            // 6. Verify no additional properties in geoLocation
            const geoKeys = Object.keys(geoLocation.toObject());
            expect(geoKeys.sort()).toEqual(['coordinates', 'type']);
            
            // 7. Verify MongoDB geospatial index compatibility
            // The document should be retrievable via geospatial queries
            const nearbyIncidents = await Incident.find({
              geoLocation: {
                $near: {
                  $geometry: {
                    type: 'Point',
                    coordinates: [incidentData.longitude, incidentData.latitude]
                  },
                  $maxDistance: 1000 // 1km radius
                }
              }
            });
            
            expect(nearbyIncidents.length).toBeGreaterThan(0);
            expect(nearbyIncidents.some(inc => inc._id.equals(savedIncident._id))).toBe(true);
            
            // 8. Verify virtual coordinates property works correctly
            const virtualCoords = savedIncident.coordinates;
            expect(virtualCoords).toBeTruthy();
            expect(virtualCoords.longitude).toBeCloseTo(incidentData.longitude, 10);
            expect(virtualCoords.latitude).toBeCloseTo(incidentData.latitude, 10);
            
            return true;
          } catch (error) {
            console.error('GeoJSON compliance test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 15, // Reduced for faster testing while ensuring good coverage
        timeout: 20000,
        verbose: false
      }
    );
  }, 25000);

  /**
   * Property: GeoJSON coordinate boundary validation
   * For any coordinates outside valid ranges, the system should reject them
   */
  test('Property: GeoJSON coordinate boundary validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid coordinates using simpler approach
        fc.constantFrom(
          // Invalid longitude cases
          { longitude: -181, latitude: 0, invalidType: 'longitude' },
          { longitude: 181, latitude: 0, invalidType: 'longitude' },
          { longitude: -200, latitude: 45, invalidType: 'longitude' },
          { longitude: 200, latitude: -45, invalidType: 'longitude' },
          // Invalid latitude cases
          { longitude: 0, latitude: -91, invalidType: 'latitude' },
          { longitude: 0, latitude: 91, invalidType: 'latitude' },
          { longitude: 100, latitude: -100, invalidType: 'latitude' },
          { longitude: -100, latitude: 100, invalidType: 'latitude' },
          // Invalid array structure
          { coordinates: [0], invalidType: 'array_length' },
          { coordinates: [0, 0, 0], invalidType: 'array_length' },
          { coordinates: [], invalidType: 'array_length' },
          // Non-numeric coordinates
          { longitude: 'invalid', latitude: 0, invalidType: 'non_numeric' },
          { longitude: 0, latitude: null, invalidType: 'non_numeric' }
        ),
        
        async (invalidData) => {
          try {
            // Create a test user for reporter
            const testUser = new User({
              fullName: 'Test User',
              email: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
              phone: '+15551234567',
              dob: new Date('1990-01-01'),
              gender: 'male',
              address: {
                street: '123 Test Street',
                city: 'Test City',
                state: 'TS',
                pincode: '123456'
              }
            });
            const savedUser = await testUser.save();
            
            let geoLocation;
            
            if (invalidData.invalidType === 'array_length') {
              geoLocation = {
                type: 'Point',
                coordinates: invalidData.coordinates
              };
            } else {
              geoLocation = {
                type: 'Point',
                coordinates: [invalidData.longitude, invalidData.latitude]
              };
            }
            
            // Try to create incident with invalid coordinates
            const incident = new Incident({
              title: 'Test Invalid Coordinates',
              description: 'Testing invalid coordinate validation',
              type: INCIDENT_TYPES.OTHER,
              geoLocation: geoLocation,
              reportedBy: {
                userType: USER_TYPES.USER,
                userId: savedUser._id
              }
            });
            
            let validationError = null;
            try {
              await incident.save();
            } catch (error) {
              validationError = error;
            }
            
            // Should fail validation
            expect(validationError).toBeTruthy();
            expect(validationError.name).toBe('ValidationError');
            
            // Verify the error is related to coordinates
            const errorMessage = validationError.message.toLowerCase();
            expect(
              errorMessage.includes('coordinates') || 
              errorMessage.includes('geolocation') ||
              errorMessage.includes('invalid')
            ).toBe(true);
            
            return true;
          } catch (error) {
            console.error('Coordinate boundary validation test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 20,
        timeout: 15000
      }
    );
  }, 20000);

  /**
   * Property: GeoJSON type validation
   * For any geoLocation with invalid type, the system should reject it
   */
  test('Property: GeoJSON type validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid GeoJSON types
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'Point'),
          fc.constantFrom('LineString', 'Polygon', 'MultiPoint', 'point', 'POINT', '', null, undefined),
          fc.integer(),
          fc.boolean()
        ),
        
        async (invalidType) => {
          try {
            // Create a test user for reporter
            const testUser = new User({
              fullName: 'Test User',
              email: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
              phone: '+15551234567',
              dob: new Date('1990-01-01'),
              gender: 'male',
              address: {
                street: '123 Test Street',
                city: 'Test City',
                state: 'TS',
                pincode: '123456'
              }
            });
            const savedUser = await testUser.save();
            
            // Try to create incident with invalid GeoJSON type
            const incident = new Incident({
              title: 'Test Invalid GeoJSON Type',
              description: 'Testing invalid GeoJSON type validation',
              type: INCIDENT_TYPES.OTHER,
              geoLocation: {
                type: invalidType,
                coordinates: [0, 0] // Valid coordinates
              },
              reportedBy: {
                userType: USER_TYPES.USER,
                userId: savedUser._id
              }
            });
            
            let validationError = null;
            try {
              await incident.save();
            } catch (error) {
              validationError = error;
            }
            
            // Should fail validation for non-"Point" types
            expect(validationError).toBeTruthy();
            expect(validationError.name).toBe('ValidationError');
            
            // Verify the error is related to GeoJSON type
            const errorMessage = validationError.message.toLowerCase();
            expect(
              errorMessage.includes('type') || 
              errorMessage.includes('geojson') ||
              errorMessage.includes('point')
            ).toBe(true);
            
            return true;
          } catch (error) {
            console.error('GeoJSON type validation test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 15,
        timeout: 15000
      }
    );
  }, 20000);

  /**
   * Property: GeoJSON structure immutability
   * For any saved incident, the GeoJSON structure should remain consistent
   */
  test('Property: GeoJSON structure immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          longitude: fc.float({ min: -180, max: 180, noNaN: true }),
          latitude: fc.float({ min: -90, max: 90, noNaN: true })
        }),
        
        async (coords) => {
          try {
            // Create a test user for reporter
            const testUser = new User({
              fullName: 'Test User',
              email: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
              phone: '+15551234567',
              dob: new Date('1990-01-01'),
              gender: 'male',
              address: {
                street: '123 Test Street',
                city: 'Test City',
                state: 'TS',
                pincode: '123456'
              }
            });
            const savedUser = await testUser.save();
            
            // Create incident
            const incident = new Incident({
              title: 'Test GeoJSON Structure',
              description: 'Testing GeoJSON structure consistency',
              type: INCIDENT_TYPES.OTHER,
              geoLocation: {
                type: 'Point',
                coordinates: [coords.longitude, coords.latitude]
              },
              reportedBy: {
                userType: USER_TYPES.USER,
                userId: savedUser._id
              }
            });
            
            const savedIncident = await incident.save();
            
            // Retrieve from database multiple times
            const retrieved1 = await Incident.findById(savedIncident._id);
            const retrieved2 = await Incident.findById(savedIncident._id).lean();
            
            // Verify structure consistency across retrievals
            expect(retrieved1.geoLocation.type).toBe('Point');
            expect(retrieved2.geoLocation.type).toBe('Point');
            
            expect(retrieved1.geoLocation.coordinates).toHaveLength(2);
            expect(retrieved2.geoLocation.coordinates).toHaveLength(2);
            
            expect(retrieved1.geoLocation.coordinates[0]).toBeCloseTo(coords.longitude, 10);
            expect(retrieved1.geoLocation.coordinates[1]).toBeCloseTo(coords.latitude, 10);
            
            expect(retrieved2.geoLocation.coordinates[0]).toBeCloseTo(coords.longitude, 10);
            expect(retrieved2.geoLocation.coordinates[1]).toBeCloseTo(coords.latitude, 10);
            
            // Verify JSON serialization maintains structure
            const jsonString = JSON.stringify(retrieved1.geoLocation);
            const parsedGeoLocation = JSON.parse(jsonString);
            
            expect(parsedGeoLocation.type).toBe('Point');
            expect(Array.isArray(parsedGeoLocation.coordinates)).toBe(true);
            expect(parsedGeoLocation.coordinates).toHaveLength(2);
            
            return true;
          } catch (error) {
            console.error('GeoJSON structure immutability test error:', error.message);
            return false;
          }
        }
      ),
      { 
        numRuns: 10,
        timeout: 15000
      }
    );
  }, 20000);
});