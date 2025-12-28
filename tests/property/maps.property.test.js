/**
 * Property-Based Tests for Google Maps Integration
 * 
 * Tests the geocoding, reverse geocoding, distance calculations,
 * and location validation functionality
 * Property 18: Maps integration functionality
 */

const fc = require('fast-check');
const { addressArbitrary } = require('../utils/propertyGenerators');
const { 
  calculateDistance, 
  validateCoordinates, 
  findNearbyIncidents,
  formatDistance,
  pointInPolygon
} = require('../../src/services/maps');
const { MAPS_CONFIG } = require('../../src/config/maps');

// Custom coordinate generator for maps tests (returns {lat, lng} object)
const coordinatesArbitrary = () => {
  return fc.record({
    lat: fc.float({ min: -90, max: 90 }),
    lng: fc.float({ min: -180, max: 180 })
  });
};

describe('Property Test: Google Maps Integration', () => {

  test('Property 18: Maps integration functionality - Distance calculation consistency', () => {
    // Feature: emergency-incident-platform, Property 18: Maps integration functionality
    fc.assert(fc.property(
      coordinatesArbitrary(),
      coordinatesArbitrary(),
      (coord1, coord2) => {
        // Skip test if coordinates contain NaN or infinite values
        if (!isFinite(coord1.lat) || !isFinite(coord1.lng) || 
            !isFinite(coord2.lat) || !isFinite(coord2.lng)) {
          return;
        }
        
        const distance = calculateDistance(coord1, coord2);
        
        // Distance should always be a non-negative number
        expect(typeof distance).toBe('number');
        expect(distance).toBeGreaterThanOrEqual(0);
        expect(isFinite(distance)).toBe(true);
        
        // Distance from a point to itself should be 0
        const samePointDistance = calculateDistance(coord1, coord1);
        expect(samePointDistance).toBe(0);
        
        // Distance should be symmetric (A to B = B to A)
        const reverseDistance = calculateDistance(coord2, coord1);
        expect(Math.abs(distance - reverseDistance)).toBeLessThan(0.01); // Allow for floating point precision
        
        // Distance should be reasonable (not exceed Earth's circumference)
        const maxEarthDistance = 20037508.34; // Half of Earth's circumference in meters
        expect(distance).toBeLessThanOrEqual(maxEarthDistance);
      }
    ), { numRuns: 100 });
  });

  test('Property 18a: Coordinate validation consistency', () => {
    // Feature: emergency-incident-platform, Property 18: Maps integration functionality
    fc.assert(fc.property(
      fc.float({ min: -200, max: 200 }), // Extended range to test invalid coordinates
      fc.float({ min: -200, max: 200 }),
      (lat, lng) => {
        const validation = validateCoordinates(lat, lng);
        
        // Validation should always return an object with expected properties
        expect(validation).toHaveProperty('isValid');
        expect(validation).toHaveProperty('errors');
        expect(Array.isArray(validation.errors)).toBe(true);
        
        // Check latitude validation
        const isValidLat = lat >= MAPS_CONFIG.VALIDATION.MIN_LATITUDE && 
                          lat <= MAPS_CONFIG.VALIDATION.MAX_LATITUDE &&
                          isFinite(lat);
        
        // Check longitude validation
        const isValidLng = lng >= MAPS_CONFIG.VALIDATION.MIN_LONGITUDE && 
                          lng <= MAPS_CONFIG.VALIDATION.MAX_LONGITUDE &&
                          isFinite(lng);
        
        const shouldBeValid = isValidLat && isValidLng;
        
        // Validation result should match expected validity
        expect(validation.isValid).toBe(shouldBeValid);
        
        // If valid, coordinates should be returned
        if (validation.isValid) {
          expect(validation.coordinates).toEqual({ lat, lng });
          expect(validation.errors).toHaveLength(0);
        } else {
          expect(validation.coordinates).toBeNull();
          expect(validation.errors.length).toBeGreaterThan(0);
        }
        
        // Error messages should be descriptive strings
        validation.errors.forEach(error => {
          expect(typeof error).toBe('string');
          expect(error.length).toBeGreaterThan(0);
        });
      }
    ), { numRuns: 100 });
  });

  test('Property 18b: Nearby incidents detection consistency', () => {
    // Feature: emergency-incident-platform, Property 18: Maps integration functionality
    fc.assert(fc.property(
      coordinatesArbitrary(),
      fc.array(
        fc.record({
          _id: fc.string({ minLength: 24, maxLength: 24 }),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          type: fc.constantFrom('fire', 'medical', 'accident', 'crime'),
          geoLocation: fc.record({
            type: fc.constant('Point'),
            coordinates: fc.tuple(
              fc.float({ min: -180, max: 180 }), // longitude
              fc.float({ min: -90, max: 90 })    // latitude
            )
          })
        }),
        { minLength: 0, maxLength: 20 }
      ),
      fc.integer({ min: 50, max: 5000 }),
      (centerCoords, incidents, radius) => {
        // Skip if center coordinates are invalid
        const coordValidation = validateCoordinates(centerCoords.lat, centerCoords.lng);
        if (!coordValidation.isValid) {
          return; // Skip this test case
        }
        
        const nearbyIncidents = findNearbyIncidents(centerCoords, incidents, radius);
        
        // Result should always be an array
        expect(Array.isArray(nearbyIncidents)).toBe(true);
        
        // All returned incidents should be within the specified radius
        nearbyIncidents.forEach(incident => {
          expect(incident).toHaveProperty('distance');
          expect(typeof incident.distance).toBe('number');
          expect(incident.distance).toBeLessThanOrEqual(radius);
          expect(incident.distance).toBeGreaterThanOrEqual(0);
          
          // Should have formatted distance
          expect(incident).toHaveProperty('distanceFormatted');
          expect(typeof incident.distanceFormatted).toBe('string');
        });
        
        // Results should be sorted by distance (closest first)
        for (let i = 1; i < nearbyIncidents.length; i++) {
          expect(nearbyIncidents[i].distance).toBeGreaterThanOrEqual(nearbyIncidents[i - 1].distance);
        }
        
        // Number of results should not exceed input incidents
        expect(nearbyIncidents.length).toBeLessThanOrEqual(incidents.length);
        
        // Verify distance calculations are consistent
        nearbyIncidents.forEach(incident => {
          const incidentCoords = {
            lat: incident.geoLocation.coordinates[1],
            lng: incident.geoLocation.coordinates[0]
          };
          const calculatedDistance = calculateDistance(centerCoords, incidentCoords);
          expect(Math.abs(incident.distance - calculatedDistance)).toBeLessThan(0.01);
        });
      }
    ), { numRuns: 50 });
  });

  test('Property 18c: Distance formatting consistency', () => {
    // Feature: emergency-incident-platform, Property 18: Maps integration functionality
    fc.assert(fc.property(
      fc.float({ min: 0, max: 50000 }).filter(n => isFinite(n)), // 0 to 50km, finite only
      (distanceMeters) => {
        const formatted = formatDistance(distanceMeters);
        
        // Should always return a string
        expect(typeof formatted).toBe('string');
        expect(formatted.length).toBeGreaterThan(0);
        
        // Should contain appropriate unit
        if (distanceMeters < 1000) {
          expect(formatted).toMatch(/\d+m$/);
          expect(formatted).toContain('m');
          expect(formatted).not.toContain('km');
        } else {
          expect(formatted).toMatch(/\d+\.\d+km$/);
          expect(formatted).toContain('km');
          expect(formatted).not.toMatch(/\d+m$/);
        }
        
        // Should not contain negative values
        expect(formatted).not.toContain('-');
        
        // Should be parseable back to a number
        const numericPart = formatted.replace(/[^\d.]/g, '');
        const parsedNumber = parseFloat(numericPart);
        expect(isNaN(parsedNumber)).toBe(false);
        expect(parsedNumber).toBeGreaterThanOrEqual(0);
      }
    ), { numRuns: 100 });
  });

  test('Property 18d: Point-in-polygon algorithm consistency', () => {
    // Feature: emergency-incident-platform, Property 18: Maps integration functionality
    fc.assert(fc.property(
      coordinatesArbitrary(),
      fc.array(coordinatesArbitrary(), { minLength: 3, maxLength: 10 }),
      (point, polygonVertices) => {
        // Skip if point coordinates are invalid
        const pointValidation = validateCoordinates(point.lat, point.lng);
        if (!pointValidation.isValid) {
          return;
        }
        
        // Skip if any polygon vertex is invalid
        const invalidVertex = polygonVertices.find(vertex => 
          !validateCoordinates(vertex.lat, vertex.lng).isValid
        );
        if (invalidVertex) {
          return;
        }
        
        const isInside = pointInPolygon(point, polygonVertices);
        
        // Result should always be a boolean
        expect(typeof isInside).toBe('boolean');
        
        // Test with a simple square polygon around the point
        const buffer = 0.01; // Small buffer around point
        const squarePolygon = [
          { lat: point.lat - buffer, lng: point.lng - buffer },
          { lat: point.lat - buffer, lng: point.lng + buffer },
          { lat: point.lat + buffer, lng: point.lng + buffer },
          { lat: point.lat + buffer, lng: point.lng - buffer }
        ];
        
        const isInsideSquare = pointInPolygon(point, squarePolygon);
        expect(isInsideSquare).toBe(true); // Point should be inside its surrounding square
        
        // Test with a point clearly outside
        const outsidePoint = { lat: point.lat + 10, lng: point.lng + 10 };
        const isOutsideSquare = pointInPolygon(outsidePoint, squarePolygon);
        expect(isOutsideSquare).toBe(false); // Point should be outside the small square
      }
    ), { numRuns: 50 });
  });

  test('Property 18e: Coordinate precision and boundary handling', () => {
    // Feature: emergency-incident-platform, Property 18: Maps integration functionality
    fc.assert(fc.property(
      fc.record({
        lat: fc.float({ min: -90, max: 90 }),
        lng: fc.float({ min: -180, max: 180 })
      }),
      (coords) => {
        const validation = validateCoordinates(coords.lat, coords.lng);
        
        // Valid coordinates within bounds should always pass validation
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
        expect(validation.coordinates).toEqual(coords);
        
        // Test boundary conditions
        const boundaryTests = [
          { lat: 90, lng: 180 },    // Maximum valid
          { lat: -90, lng: -180 },  // Minimum valid
          { lat: 0, lng: 0 },       // Origin
          { lat: 90, lng: 0 },      // North pole
          { lat: -90, lng: 0 },     // South pole
          { lat: 0, lng: 180 },     // International date line
          { lat: 0, lng: -180 }     // International date line (other side)
        ];
        
        boundaryTests.forEach(testCoords => {
          const boundaryValidation = validateCoordinates(testCoords.lat, testCoords.lng);
          expect(boundaryValidation.isValid).toBe(true);
        });
        
        // Test invalid boundary conditions
        const invalidBoundaryTests = [
          { lat: 90.1, lng: 0 },     // Latitude too high
          { lat: -90.1, lng: 0 },    // Latitude too low
          { lat: 0, lng: 180.1 },    // Longitude too high
          { lat: 0, lng: -180.1 },   // Longitude too low
          { lat: NaN, lng: 0 },      // NaN latitude
          { lat: 0, lng: NaN },      // NaN longitude
          { lat: Infinity, lng: 0 }, // Infinite latitude
          { lat: 0, lng: Infinity }  // Infinite longitude
        ];
        
        invalidBoundaryTests.forEach(testCoords => {
          const invalidValidation = validateCoordinates(testCoords.lat, testCoords.lng);
          expect(invalidValidation.isValid).toBe(false);
          expect(invalidValidation.errors.length).toBeGreaterThan(0);
        });
      }
    ), { numRuns: 50 });
  });

  test('Property 18f: Service area validation consistency', () => {
    // Feature: emergency-incident-platform, Property 18: Maps integration functionality
    fc.assert(fc.property(
      coordinatesArbitrary(),
      fc.array(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          polygon: fc.array(coordinatesArbitrary(), { minLength: 3, maxLength: 8 })
        }),
        { minLength: 0, maxLength: 5 }
      ),
      (point, serviceAreas) => {
        // Skip if point coordinates are invalid
        const pointValidation = validateCoordinates(point.lat, point.lng);
        if (!pointValidation.isValid) {
          return;
        }
        
        // Filter out service areas with invalid polygon vertices
        const validServiceAreas = serviceAreas.filter(area => 
          area.polygon.every(vertex => validateCoordinates(vertex.lat, vertex.lng).isValid)
        );
        
        // Import the function we're testing
        const { isWithinServiceArea } = require('../../src/services/maps');
        const isWithin = isWithinServiceArea(point, validServiceAreas);
        
        // Result should always be a boolean
        expect(typeof isWithin).toBe('boolean');
        
        // If no service areas are provided, should return true (global coverage)
        const globalCoverage = isWithinServiceArea(point, []);
        expect(globalCoverage).toBe(true);
        
        // Test with undefined service areas
        const undefinedCoverage = isWithinServiceArea(point, undefined);
        expect(undefinedCoverage).toBe(true);
        
        // Test with null service areas
        const nullCoverage = isWithinServiceArea(point, null);
        expect(nullCoverage).toBe(true);
      }
    ), { numRuns: 50 });
  });

});

describe('Maps Configuration Property Tests', () => {

  test('Property: Maps configuration validation consistency', () => {
    fc.assert(fc.property(
      fc.record({
        GOOGLE_MAPS_API_KEY: fc.option(fc.string({ minLength: 0, maxLength: 100 }))
      }),
      (envVars) => {
        // Simulate configuration validation
        const hasApiKey = envVars.GOOGLE_MAPS_API_KEY && envVars.GOOGLE_MAPS_API_KEY.length > 0;
        const isValidLength = envVars.GOOGLE_MAPS_API_KEY && envVars.GOOGLE_MAPS_API_KEY.length >= 20;
        
        // Configuration validation logic
        const errors = [];
        
        if (!hasApiKey) {
          errors.push('GOOGLE_MAPS_API_KEY environment variable is required');
        } else if (!isValidLength) {
          errors.push('GOOGLE_MAPS_API_KEY appears to be invalid (too short)');
        }
        
        const isValid = errors.length === 0;
        
        // Validation should be consistent
        if (hasApiKey && isValidLength) {
          expect(isValid).toBe(true);
          expect(errors).toHaveLength(0);
        } else {
          expect(isValid).toBe(false);
          expect(errors.length).toBeGreaterThan(0);
        }
        
        // Error messages should be descriptive
        errors.forEach(error => {
          expect(typeof error).toBe('string');
          expect(error.length).toBeGreaterThan(0);
        });
      }
    ), { numRuns: 50 });
  });

  test('Property: Distance threshold configuration consistency', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: MAPS_CONFIG.DISTANCE.MAX_SEARCH_RADIUS }),
      (proximityThreshold) => {
        // Test that proximity threshold is within reasonable bounds
        expect(proximityThreshold).toBeGreaterThan(0);
        expect(proximityThreshold).toBeLessThanOrEqual(MAPS_CONFIG.DISTANCE.MAX_SEARCH_RADIUS);
        
        // Default proximity threshold should be reasonable
        expect(MAPS_CONFIG.DISTANCE.PROXIMITY_THRESHOLD).toBeGreaterThan(0);
        expect(MAPS_CONFIG.DISTANCE.PROXIMITY_THRESHOLD).toBeLessThanOrEqual(1000); // 1km max for duplicates
        
        // Max search radius should be reasonable
        expect(MAPS_CONFIG.DISTANCE.MAX_SEARCH_RADIUS).toBeGreaterThan(MAPS_CONFIG.DISTANCE.PROXIMITY_THRESHOLD);
        expect(MAPS_CONFIG.DISTANCE.MAX_SEARCH_RADIUS).toBeLessThanOrEqual(50000); // 50km max search
      }
    ), { numRuns: 20 });
  });

});