/**
 * Property-Based Tests for Geospatial Query Efficiency
 * 
 * Tests the geospatial query functionality including proximity detection,
 * 2dsphere indexing, location-based searches, and coordinate validation
 * Property 19: Geospatial query efficiency
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const Incident = require('../../src/models/Incident');
const { calculateDistance } = require('../../src/utils/helpers');
const { coordinatesArbitrary } = require('../utils/propertyGenerators');

describe('Property Test: Geospatial Query Efficiency', () => {

  beforeAll(async () => {
    // Ensure geospatial indexes are created on the existing connection
    try {
      await Incident.collection.createIndex({ location: '2dsphere' });
    } catch (error) {
      // Index might already exist, ignore error
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await Incident.deleteMany({});
  });

  // Helper function to generate valid strings
  const validString = (minLength, maxLength) => 
    fc.string({ minLength, maxLength })
      .filter(s => s.trim().length >= minLength)
      .map(s => s.trim().length >= minLength ? s : 'A'.repeat(minLength));

  test('Property 19: Geospatial query efficiency - Basic proximity detection', () => {
    // Feature: emergency-incident-platform, Property 19: Geospatial query efficiency
    fc.assert(fc.asyncProperty(
      fc.record({
        centerLongitude: fc.float({ min: -179, max: 179 }),
        centerLatitude: fc.float({ min: -89, max: 89 }),
        searchRadius: fc.integer({ min: 1000, max: 5000 }), // 1km to 5km
        incidents: fc.array(fc.record({
          title: validString(5, 30),
          description: validString(10, 50),
          longitude: fc.float({ min: -179, max: 179 }),
          latitude: fc.float({ min: -89, max: 89 }),
          type: fc.constantFrom('accident', 'fire', 'medical_emergency', 'crime')
        }), { minLength: 2, maxLength: 8 })
      }),
      async (testData) => {
        // Create incidents at various locations
        const createdIncidents = [];
        for (const incidentData of testData.incidents) {
          const incident = new Incident({
            title: incidentData.title,
            description: incidentData.description,
            type: incidentData.type,
            location: {
              type: 'Point',
              coordinates: [incidentData.longitude, incidentData.latitude]
            },
            department: 'police',
            reportedBy: new mongoose.Types.ObjectId(),
            reportedByModel: 'User',
            incidentTime: new Date(),
            status: 'reported'
          });
          
          await incident.save();
          createdIncidents.push(incident);
        }
        
        // Perform proximity search using MongoDB's geospatial query
        const nearbyResults = await Incident.find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [testData.centerLongitude, testData.centerLatitude]
              },
              $maxDistance: testData.searchRadius
            }
          }
        });
        
        // Verify all returned incidents are within the search radius
        expect(Array.isArray(nearbyResults)).toBe(true);
        
        for (const result of nearbyResults) {
          const actualDistance = calculateDistance(
            testData.centerLatitude,
            testData.centerLongitude,
            result.location.coordinates[1], // latitude
            result.location.coordinates[0]  // longitude
          );
          
          // Verify distance is within search radius (with tolerance for floating point)
          expect(actualDistance).toBeLessThanOrEqual(testData.searchRadius + 100);
          
          // Verify incident has valid location data
          expect(result.location.type).toBe('Point');
          expect(result.location.coordinates).toHaveLength(2);
          expect(result.location.coordinates[0]).toBeGreaterThanOrEqual(-180);
          expect(result.location.coordinates[0]).toBeLessThanOrEqual(180);
          expect(result.location.coordinates[1]).toBeGreaterThanOrEqual(-90);
          expect(result.location.coordinates[1]).toBeLessThanOrEqual(90);
        }
        
        // Verify that all incidents outside the radius are not included
        const foundIds = new Set(nearbyResults.map(r => r._id.toString()));
        
        for (const incident of createdIncidents) {
          const distance = calculateDistance(
            testData.centerLatitude,
            testData.centerLongitude,
            incident.location.coordinates[1],
            incident.location.coordinates[0]
          );
          
          const isFound = foundIds.has(incident._id.toString());
          
          if (distance <= testData.searchRadius) {
            // Should be found if within radius
            expect(isFound).toBe(true);
          } else {
            // Should not be found if outside radius (with tolerance)
            if (distance > testData.searchRadius + 100) {
              expect(isFound).toBe(false);
            }
          }
        }
      }
    ), { numRuns: 5 });
  });

  test('Property 19a: Geospatial index performance validation', () => {
    // Feature: emergency-incident-platform, Property 19: Geospatial query efficiency
    fc.assert(fc.asyncProperty(
      fc.record({
        incidents: fc.array(fc.record({
          title: validString(5, 30),
          description: validString(10, 50),
          longitude: fc.float({ min: -179, max: 179 }),
          latitude: fc.float({ min: -89, max: 89 }),
          type: fc.constantFrom('accident', 'fire', 'medical_emergency', 'crime')
        }), { minLength: 3, maxLength: 10 }),
        queryLongitude: fc.float({ min: -179, max: 179 }),
        queryLatitude: fc.float({ min: -89, max: 89 }),
        radius: fc.integer({ min: 1000, max: 10000 })
      }),
      async (testData) => {
        // Create incidents with various locations
        for (const incidentData of testData.incidents) {
          const incident = new Incident({
            title: incidentData.title,
            description: incidentData.description,
            type: incidentData.type,
            location: {
              type: 'Point',
              coordinates: [incidentData.longitude, incidentData.latitude]
            },
            department: 'police',
            reportedBy: new mongoose.Types.ObjectId(),
            reportedByModel: 'User',
            incidentTime: new Date(),
            status: 'reported'
          });
          
          await incident.save();
        }
        
        const startTime = Date.now();
        
        // Perform geospatial query
        const results = await Incident.find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [testData.queryLongitude, testData.queryLatitude]
              },
              $maxDistance: testData.radius
            }
          }
        }).limit(10);
        
        const queryTime = Date.now() - startTime;
        
        // Verify query performance (should be fast with proper indexing)
        expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds
        
        // Verify all results are within the specified radius
        for (const result of results) {
          const distance = calculateDistance(
            testData.queryLatitude,
            testData.queryLongitude,
            result.location.coordinates[1], // latitude
            result.location.coordinates[0]  // longitude
          );
          
          expect(distance).toBeLessThanOrEqual(testData.radius + 100); // Small tolerance
          
          // Verify coordinate validity
          expect(result.location.coordinates[0]).toBeGreaterThanOrEqual(-180);
          expect(result.location.coordinates[0]).toBeLessThanOrEqual(180);
          expect(result.location.coordinates[1]).toBeGreaterThanOrEqual(-90);
          expect(result.location.coordinates[1]).toBeLessThanOrEqual(90);
        }
      }
    ), { numRuns: 5 });
  });

  test('Property 19b: Coordinate boundary validation', () => {
    // Feature: emergency-incident-platform, Property 19: Geospatial query efficiency
    fc.assert(fc.asyncProperty(
      fc.record({
        validIncidents: fc.array(fc.record({
          title: validString(5, 30),
          description: validString(10, 50),
          longitude: fc.constantFrom(-180, -90, 0, 90, 180),
          latitude: fc.constantFrom(-90, -45, 0, 45, 90),
          type: fc.constantFrom('accident', 'fire', 'medical_emergency')
        }), { minLength: 2, maxLength: 5 }),
        queryLongitude: fc.constantFrom(-180, -90, 0, 90, 180),
        queryLatitude: fc.constantFrom(-90, -45, 0, 45, 90),
        radius: fc.integer({ min: 5000, max: 20000 })
      }),
      async (testData) => {
        // Create incidents at boundary coordinates
        for (const incidentData of testData.validIncidents) {
          const incident = new Incident({
            title: incidentData.title,
            description: incidentData.description,
            type: incidentData.type,
            location: {
              type: 'Point',
              coordinates: [incidentData.longitude, incidentData.latitude]
            },
            department: 'police',
            reportedBy: new mongoose.Types.ObjectId(),
            reportedByModel: 'User',
            incidentTime: new Date(),
            status: 'reported'
          });
          
          await incident.save();
        }
        
        // Test queries from boundary points
        const results = await Incident.find({
          location: {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: [testData.queryLongitude, testData.queryLatitude]
              },
              $maxDistance: testData.radius
            }
          }
        });
        
        // Verify all results have valid coordinates
        for (const result of results) {
          expect(result.location.coordinates[0]).toBeGreaterThanOrEqual(-180);
          expect(result.location.coordinates[0]).toBeLessThanOrEqual(180);
          expect(result.location.coordinates[1]).toBeGreaterThanOrEqual(-90);
          expect(result.location.coordinates[1]).toBeLessThanOrEqual(90);
          
          // Verify distance calculation works at boundaries
          const distance = calculateDistance(
            testData.queryLatitude,
            testData.queryLongitude,
            result.location.coordinates[1],
            result.location.coordinates[0]
          );
          
          expect(distance).toBeGreaterThanOrEqual(0);
          expect(distance).toBeLessThanOrEqual(testData.radius + 100);
        }
        
        // Test coordinate validation during creation
        const invalidCoordinates = [
          [-181, 0], [181, 0], [0, -91], [0, 91]
        ];
        
        for (const [lng, lat] of invalidCoordinates) {
          const invalidIncident = new Incident({
            title: 'Invalid coordinate test',
            description: 'Testing invalid coordinates',
            type: 'accident',
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            department: 'police',
            reportedBy: new mongoose.Types.ObjectId(),
            reportedByModel: 'User',
            incidentTime: new Date()
          });
          
          // Should fail validation for invalid coordinates
          await expect(invalidIncident.save()).rejects.toThrow();
        }
      }
    ), { numRuns: 3 });
  });

});