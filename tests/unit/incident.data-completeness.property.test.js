/**
 * Property Test: Incident Data Completeness
 * 
 * Tests Property 8: Incident data completeness
 * Validates Requirements 3.1, 3.7
 * 
 * This test ensures that:
 * - All provided incident fields are stored correctly and completely (Requirement 3.1)
 * - Proper timestamps are automatically set (Requirement 3.7)
 * - Default status is set correctly (Requirement 3.7)
 * - Reporter information is stored accurately
 * - Media data is stored with proper structure
 * - GeoJSON location data is stored correctly
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const Incident = require('../../src/models/Incident');
const User = require('../../src/models/User');
const Guest = require('../../src/models/Guest');
const { 
  INCIDENT_TYPES, 
  INCIDENT_STATUS, 
  MEDIA_TYPES, 
  USER_TYPES 
} = require('../../src/config/constants');

describe('Property Test: Incident Data Completeness', () => {

  /**
   * Helper function to generate valid coordinates (avoiding NaN and extreme values)
   */
  const generateValidCoordinates = () => fc.tuple(
    fc.float({ min: Math.fround(-179.9), max: Math.fround(179.9), noNaN: true }), // longitude
    fc.float({ min: Math.fround(-89.9), max: Math.fround(89.9), noNaN: true })    // latitude
  );

  /**
   * Helper function to generate valid media data
   */
  const generateValidMedia = () => fc.array(
    fc.record({
      type: fc.constantFrom(...Object.values(MEDIA_TYPES)),
      url: fc.webUrl()
    }),
    { minLength: 0, maxLength: 5 }
  );

  /**
   * Helper function to generate valid reporter data
   */
  const generateValidReporter = () => fc.oneof(
    // User reporter
    fc.record({
      userType: fc.constant(USER_TYPES.USER),
      userId: fc.constant(new mongoose.Types.ObjectId()),
      guestId: fc.constant(undefined)
    }),
    // Guest reporter
    fc.record({
      userType: fc.constant(USER_TYPES.GUEST),
      userId: fc.constant(undefined),
      guestId: fc.constant(new mongoose.Types.ObjectId())
    })
  );

  /**
   * Helper function to generate valid title (must contain alphanumeric characters)
   */
  const generateValidTitle = () => fc.string({ minLength: 3, maxLength: 200 })
    .filter(s => s.trim().length >= 3 && /[a-zA-Z0-9]/.test(s.trim()));

  /**
   * Helper function to generate valid description (must contain alphanumeric characters)
   */
  const generateValidDescription = () => fc.string({ minLength: 10, maxLength: 2000 })
    .filter(s => s.trim().length >= 10 && /[a-zA-Z0-9]/.test(s.trim()));

  /**
   * Helper function to generate complete incident data
   */
  const generateCompleteIncidentData = () => fc.record({
    title: generateValidTitle(),
    description: generateValidDescription(),
    type: fc.constantFrom(...Object.values(INCIDENT_TYPES)),
    geoLocation: fc.record({
      type: fc.constant('Point'),
      coordinates: generateValidCoordinates()
    }),
    media: generateValidMedia(),
    reportedBy: generateValidReporter()
  });

  /**
   * Main Property Test: Incident data completeness
   * 
   * This test validates that all provided incident fields are stored correctly
   * with proper timestamps and default values.
   */
  test('Property 8: Incident data completeness is maintained', async () => {
    await fc.assert(
      fc.asyncProperty(
        generateCompleteIncidentData(),
        
        async (incidentData) => {
          const beforeCreation = Date.now();
          
          // Create incident
          const savedIncident = await Incident.create(incidentData);
          
          const afterCreation = Date.now();
          
          // Verify all basic fields are stored correctly (accounting for trimming)
          expect(savedIncident.title.trim()).toBe(incidentData.title.trim());
          expect(savedIncident.description.trim()).toBe(incidentData.description.trim());
          expect(savedIncident.type).toBe(incidentData.type);
          
          // Verify GeoJSON location is stored correctly
          expect(savedIncident.geoLocation).toBeTruthy();
          expect(savedIncident.geoLocation.type).toBe('Point');
          expect(savedIncident.geoLocation.coordinates).toHaveLength(2);
          expect(savedIncident.geoLocation.coordinates[0]).toBeCloseTo(incidentData.geoLocation.coordinates[0], 5);
          expect(savedIncident.geoLocation.coordinates[1]).toBeCloseTo(incidentData.geoLocation.coordinates[1], 5);
          
          // Verify media data is stored correctly
          expect(savedIncident.media).toHaveLength(incidentData.media.length);
          incidentData.media.forEach((mediaItem, index) => {
            expect(savedIncident.media[index].type).toBe(mediaItem.type);
            expect(savedIncident.media[index].url).toBe(mediaItem.url);
            expect(savedIncident.media[index].uploadedAt).toBeInstanceOf(Date);
            expect(savedIncident.media[index].uploadedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation);
            expect(savedIncident.media[index].uploadedAt.getTime()).toBeLessThanOrEqual(afterCreation);
          });
          
          // Verify reporter information is stored correctly
          expect(savedIncident.reportedBy).toBeTruthy();
          expect(savedIncident.reportedBy.userType).toBe(incidentData.reportedBy.userType);
          
          if (incidentData.reportedBy.userType === USER_TYPES.USER) {
            expect(savedIncident.reportedBy.userId).toBeTruthy();
            expect(savedIncident.reportedBy.userId.toString()).toBe(incidentData.reportedBy.userId.toString());
            expect(savedIncident.reportedBy.guestId).toBeUndefined();
          } else {
            expect(savedIncident.reportedBy.guestId).toBeTruthy();
            expect(savedIncident.reportedBy.guestId.toString()).toBe(incidentData.reportedBy.guestId.toString());
            expect(savedIncident.reportedBy.userId).toBeUndefined();
          }
          
          // Verify default status is set correctly (Requirement 3.7)
          expect(savedIncident.status).toBe(INCIDENT_STATUS.REPORTED);
          
          // Verify default upvote values
          expect(savedIncident.upvotes).toBe(0);
          expect(savedIncident.upvotedBy).toHaveLength(0);
          
          // Verify timestamps are set properly (Requirement 3.7)
          expect(savedIncident.createdAt).toBeInstanceOf(Date);
          expect(savedIncident.updatedAt).toBeInstanceOf(Date);
          expect(savedIncident.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation);
          expect(savedIncident.createdAt.getTime()).toBeLessThanOrEqual(afterCreation);
          expect(savedIncident.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation);
          expect(savedIncident.updatedAt.getTime()).toBeLessThanOrEqual(afterCreation);
          
          // Verify MongoDB ObjectId is generated
          expect(savedIncident._id).toBeInstanceOf(mongoose.Types.ObjectId);
          
          // Verify the incident can be retrieved with all data intact (accounting for trimming)
          const retrievedIncident = await Incident.findById(savedIncident._id);
          expect(retrievedIncident).toBeTruthy();
          expect(retrievedIncident.title.trim()).toBe(incidentData.title.trim());
          expect(retrievedIncident.description.trim()).toBe(incidentData.description.trim());
          expect(retrievedIncident.type).toBe(incidentData.type);
          expect(retrievedIncident.status).toBe(INCIDENT_STATUS.REPORTED);
          expect(retrievedIncident.geoLocation.coordinates).toEqual(savedIncident.geoLocation.coordinates);
          expect(retrievedIncident.media).toHaveLength(incidentData.media.length);
          expect(retrievedIncident.reportedBy.userType).toBe(incidentData.reportedBy.userType);
        }
      ),
      { 
        numRuns: 100,
        timeout: 20000,
        verbose: process.env.NODE_ENV === 'test'
      }
    );
  });

  /**
   * Property Test: Incident data completeness with minimal required fields
   * 
   * Tests that incidents can be created with only required fields and
   * optional fields are handled correctly.
   */
  test('Property 8a: Incident data completeness with minimal required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generateValidTitle(),
          description: generateValidDescription(),
          type: fc.constantFrom(...Object.values(INCIDENT_TYPES)),
          geoLocation: fc.record({
            type: fc.constant('Point'),
            coordinates: generateValidCoordinates()
          }),
          reportedBy: generateValidReporter()
        }),
        
        async (minimalIncidentData) => {
          const beforeCreation = Date.now();
          
          // Create incident with minimal data (no media)
          const savedIncident = await Incident.create(minimalIncidentData);
          
          const afterCreation = Date.now();
          
          // Verify all required fields are stored (accounting for trimming)
          expect(savedIncident.title.trim()).toBe(minimalIncidentData.title.trim());
          expect(savedIncident.description.trim()).toBe(minimalIncidentData.description.trim());
          expect(savedIncident.type).toBe(minimalIncidentData.type);
          expect(savedIncident.geoLocation.type).toBe('Point');
          expect(savedIncident.geoLocation.coordinates).toHaveLength(2);
          
          // Verify optional fields have correct defaults
          expect(savedIncident.media).toHaveLength(0);
          expect(savedIncident.status).toBe(INCIDENT_STATUS.REPORTED);
          expect(savedIncident.upvotes).toBe(0);
          expect(savedIncident.upvotedBy).toHaveLength(0);
          
          // Verify timestamps
          expect(savedIncident.createdAt).toBeInstanceOf(Date);
          expect(savedIncident.updatedAt).toBeInstanceOf(Date);
          expect(savedIncident.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation);
          expect(savedIncident.createdAt.getTime()).toBeLessThanOrEqual(afterCreation);
          
          // Verify reporter data
          expect(savedIncident.reportedBy.userType).toBe(minimalIncidentData.reportedBy.userType);
          
          if (minimalIncidentData.reportedBy.userType === USER_TYPES.USER) {
            expect(savedIncident.reportedBy.userId).toBeTruthy();
            expect(savedIncident.reportedBy.guestId).toBeUndefined();
          } else {
            expect(savedIncident.reportedBy.guestId).toBeTruthy();
            expect(savedIncident.reportedBy.userId).toBeUndefined();
          }
        }
      ),
      { 
        numRuns: 50,
        timeout: 15000
      }
    );
  });

  /**
   * Property Test: Incident data completeness with multiple media files
   * 
   * Tests that incidents can store multiple media files correctly
   * and all media metadata is preserved.
   */
  test('Property 8b: Incident data completeness with multiple media files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generateValidTitle(),
          description: generateValidDescription(),
          type: fc.constantFrom(...Object.values(INCIDENT_TYPES)),
          geoLocation: fc.record({
            type: fc.constant('Point'),
            coordinates: generateValidCoordinates()
          }),
          media: fc.array(
            fc.record({
              type: fc.constantFrom(...Object.values(MEDIA_TYPES)),
              url: fc.webUrl()
            }),
            { minLength: 1, maxLength: 10 } // Test with 1-10 media files
          ),
          reportedBy: generateValidReporter()
        }),
        
        async (incidentWithMedia) => {
          const beforeCreation = Date.now();
          
          // Create incident with media
          const savedIncident = await Incident.create(incidentWithMedia);
          
          const afterCreation = Date.now();
          
          // Verify basic fields (accounting for trimming)
          expect(savedIncident.title.trim()).toBe(incidentWithMedia.title.trim());
          expect(savedIncident.description.trim()).toBe(incidentWithMedia.description.trim());
          expect(savedIncident.type).toBe(incidentWithMedia.type);
          
          // Verify all media files are stored correctly
          expect(savedIncident.media).toHaveLength(incidentWithMedia.media.length);
          
          incidentWithMedia.media.forEach((originalMedia, index) => {
            const savedMedia = savedIncident.media[index];
            
            // Verify media data completeness
            expect(savedMedia.type).toBe(originalMedia.type);
            expect(savedMedia.url).toBe(originalMedia.url);
            expect(savedMedia.uploadedAt).toBeInstanceOf(Date);
            expect(savedMedia.uploadedAt.getTime()).toBeGreaterThanOrEqual(beforeCreation);
            expect(savedMedia.uploadedAt.getTime()).toBeLessThanOrEqual(afterCreation);
            expect(savedMedia._id).toBeInstanceOf(mongoose.Types.ObjectId);
          });
          
          // Verify media types are preserved correctly
          const imageCount = incidentWithMedia.media.filter(m => m.type === MEDIA_TYPES.IMAGE).length;
          const videoCount = incidentWithMedia.media.filter(m => m.type === MEDIA_TYPES.VIDEO).length;
          const savedImageCount = savedIncident.media.filter(m => m.type === MEDIA_TYPES.IMAGE).length;
          const savedVideoCount = savedIncident.media.filter(m => m.type === MEDIA_TYPES.VIDEO).length;
          
          expect(savedImageCount).toBe(imageCount);
          expect(savedVideoCount).toBe(videoCount);
          
          // Verify other fields are still correct
          expect(savedIncident.status).toBe(INCIDENT_STATUS.REPORTED);
          expect(savedIncident.upvotes).toBe(0);
          expect(savedIncident.reportedBy.userType).toBe(incidentWithMedia.reportedBy.userType);
        }
      ),
      { 
        numRuns: 30,
        timeout: 15000
      }
    );
  });

  /**
   * Property Test: Incident data completeness with different reporter types
   * 
   * Tests that both user and guest reporters are handled correctly
   * and all reporter data is preserved.
   */
  test('Property 8c: Incident data completeness with different reporter types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generateValidTitle(),
          description: generateValidDescription(),
          geoLocation: fc.record({
            type: fc.constant('Point'),
            coordinates: generateValidCoordinates()
          }),
          reporterType: fc.constantFrom(USER_TYPES.USER, USER_TYPES.GUEST)
        }),
        
        async ({ title, description, geoLocation, reporterType }) => {
          // Create appropriate reporter data based on type
          const reportedBy = {
            userType: reporterType
          };
          
          if (reporterType === USER_TYPES.USER) {
            reportedBy.userId = new mongoose.Types.ObjectId();
          } else {
            reportedBy.guestId = new mongoose.Types.ObjectId();
          }
          
          const incidentData = {
            title,
            description,
            type: fc.sample(fc.constantFrom(...Object.values(INCIDENT_TYPES)), 1)[0], // Generate a random type
            geoLocation,
            reportedBy
          };
          
          const beforeCreation = Date.now();
          
          // Create incident
          const savedIncident = await Incident.create(incidentData);
          
          const afterCreation = Date.now();
          
          // Verify basic incident data (accounting for trimming)
          expect(savedIncident.title.trim()).toBe(title.trim());
          expect(savedIncident.description.trim()).toBe(description.trim());
          expect(savedIncident.type).toBe(incidentData.type);
          expect(savedIncident.status).toBe(INCIDENT_STATUS.REPORTED);
          
          // Verify reporter data completeness based on type
          expect(savedIncident.reportedBy.userType).toBe(reporterType);
          
          if (reporterType === USER_TYPES.USER) {
            expect(savedIncident.reportedBy.userId).toBeTruthy();
            expect(savedIncident.reportedBy.userId.toString()).toBe(reportedBy.userId.toString());
            expect(savedIncident.reportedBy.guestId).toBeUndefined();
          } else {
            expect(savedIncident.reportedBy.guestId).toBeTruthy();
            expect(savedIncident.reportedBy.guestId.toString()).toBe(reportedBy.guestId.toString());
            expect(savedIncident.reportedBy.userId).toBeUndefined();
          }
          
          // Verify timestamps are set correctly
          expect(savedIncident.createdAt).toBeInstanceOf(Date);
          expect(savedIncident.updatedAt).toBeInstanceOf(Date);
          expect(savedIncident.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation);
          expect(savedIncident.createdAt.getTime()).toBeLessThanOrEqual(afterCreation);
          
          // Verify GeoJSON data is complete
          expect(savedIncident.geoLocation.type).toBe('Point');
          expect(savedIncident.geoLocation.coordinates).toHaveLength(2);
          expect(savedIncident.geoLocation.coordinates[0]).toBeCloseTo(geoLocation.coordinates[0], 5);
          expect(savedIncident.geoLocation.coordinates[1]).toBeCloseTo(geoLocation.coordinates[1], 5);
        }
      ),
      { 
        numRuns: 40,
        timeout: 15000
      }
    );
  });

  /**
   * Property Test: Incident data completeness with all incident types
   * 
   * Tests that all valid incident types are handled correctly
   * and type-specific data is preserved.
   */
  test('Property 8d: Incident data completeness across all incident types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: generateValidTitle(),
          description: generateValidDescription(),
          geoLocation: fc.record({
            type: fc.constant('Point'),
            coordinates: generateValidCoordinates()
          }),
          reportedBy: generateValidReporter(),
          incidentType: fc.constantFrom(...Object.values(INCIDENT_TYPES))
        }),
        
        async ({ title, description, geoLocation, reportedBy, incidentType }) => {
          const incidentData = {
            title,
            description,
            type: incidentType,
            geoLocation,
            reportedBy
          };
          
          const beforeCreation = Date.now();
          
          // Create incident with specific type
          const savedIncident = await Incident.create(incidentData);
          
          const afterCreation = Date.now();
          
          // Verify incident type is stored correctly
          expect(savedIncident.type).toBe(incidentType);
          expect(Object.values(INCIDENT_TYPES)).toContain(savedIncident.type);
          
          // Verify all other data is complete regardless of type (accounting for trimming)
          expect(savedIncident.title.trim()).toBe(title.trim());
          expect(savedIncident.description.trim()).toBe(description.trim());
          expect(savedIncident.status).toBe(INCIDENT_STATUS.REPORTED);
          expect(savedIncident.upvotes).toBe(0);
          expect(savedIncident.upvotedBy).toHaveLength(0);
          expect(savedIncident.media).toHaveLength(0);
          
          // Verify timestamps
          expect(savedIncident.createdAt).toBeInstanceOf(Date);
          expect(savedIncident.updatedAt).toBeInstanceOf(Date);
          expect(savedIncident.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation);
          expect(savedIncident.createdAt.getTime()).toBeLessThanOrEqual(afterCreation);
          
          // Verify GeoJSON location
          expect(savedIncident.geoLocation.type).toBe('Point');
          expect(savedIncident.geoLocation.coordinates).toHaveLength(2);
          
          // Verify reporter data
          expect(savedIncident.reportedBy.userType).toBe(reportedBy.userType);
          
          if (reportedBy.userType === USER_TYPES.USER) {
            expect(savedIncident.reportedBy.userId).toBeTruthy();
            expect(savedIncident.reportedBy.guestId).toBeUndefined();
          } else {
            expect(savedIncident.reportedBy.guestId).toBeTruthy();
            expect(savedIncident.reportedBy.userId).toBeUndefined();
          }
          
          // Verify the incident can be queried by type
          const incidentsByType = await Incident.find({ type: incidentType });
          expect(incidentsByType.length).toBeGreaterThan(0);
          expect(incidentsByType.some(inc => inc._id.toString() === savedIncident._id.toString())).toBe(true);
        }
      ),
      { 
        numRuns: 60,
        timeout: 20000
      }
    );
  });

});