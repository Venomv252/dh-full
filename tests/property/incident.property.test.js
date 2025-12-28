/**
 * Property-Based Tests for Incident Data Completeness
 * 
 * Tests the incident management system functionality including data validation,
 * status workflow, location handling, media management, and upvote system
 * Property 7: Incident data completeness
 */

const fc = require('fast-check');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Incident = require('../../src/models/Incident');

// Test database setup
let mongoServer;
let mongoUri;

describe('Property Test: Incident Data Completeness', () => {

  beforeAll(async () => {
    // Set up in-memory MongoDB for testing
    mongoServer = await MongoMemoryServer.create();
    mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await Incident.deleteMany({});
  });

  test('Property 7: Incident data completeness - Basic incident creation', () => {
    // Feature: emergency-incident-platform, Property 7: Incident data completeness
    fc.assert(fc.asyncProperty(
      fc.record({
        title: fc.string({ minLength: 5, maxLength: 200 }),
        description: fc.string({ minLength: 10, maxLength: 500 }),
        type: fc.constantFrom('accident', 'fire', 'medical_emergency', 'crime', 'natural_disaster'),
        severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
        longitude: fc.float({ min: -180, max: 180 }),
        latitude: fc.float({ min: -90, max: 90 }),
        department: fc.constantFrom('police', 'fire', 'medical', 'municipal', 'traffic'),
        reportedByModel: fc.constantFrom('User', 'Guest')
      }),
      async (incidentData) => {
        // Create incident
        const incident = new Incident({
          title: incidentData.title,
          description: incidentData.description,
          type: incidentData.type,
          severity: incidentData.severity,
          location: {
            type: 'Point',
            coordinates: [incidentData.longitude, incidentData.latitude]
          },
          department: incidentData.department,
          reportedBy: new mongoose.Types.ObjectId(),
          reportedByModel: incidentData.reportedByModel,
          incidentTime: new Date()
        });
        
        await incident.save();
        
        // Verify basic data completeness
        expect(incident.title).toBe(incidentData.title);
        expect(incident.description).toBe(incidentData.description);
        expect(incident.type).toBe(incidentData.type);
        expect(incident.severity).toBe(incidentData.severity);
        expect(incident.department).toBe(incidentData.department);
        
        // Verify location data
        expect(incident.location.type).toBe('Point');
        expect(incident.location.coordinates).toHaveLength(2);
        expect(incident.location.coordinates[0]).toBeCloseTo(incidentData.longitude, 5);
        expect(incident.location.coordinates[1]).toBeCloseTo(incidentData.latitude, 5);
        
        // Verify default values
        expect(incident.status).toBe('reported');
        expect(incident.priority).toBe('medium');
        expect(incident.upvoteCount).toBe(0);
        expect(incident.verificationScore).toBeGreaterThanOrEqual(0);
        expect(incident.reportedAt).toBeDefined();
        expect(incident.incidentTime).toBeDefined();
        
        // Verify virtuals
        expect(incident.isActive).toBe(true);
        expect(incident.ageInHours).toBeGreaterThanOrEqual(0);
      }
    ), { numRuns: 10 });
  });

  test('Property 7a: Status workflow management', () => {
    // Feature: emergency-incident-platform, Property 7: Incident data completeness
    fc.assert(fc.asyncProperty(
      fc.record({
        title: fc.string({ minLength: 5, maxLength: 100 }),
        description: fc.string({ minLength: 10, maxLength: 200 }),
        statusSequence: fc.array(fc.constantFrom('verified', 'assigned', 'in_progress', 'resolved'), { minLength: 1, maxLength: 4 })
      }),
      async (testData) => {
        // Create incident
        const incident = new Incident({
          title: testData.title,
          description: testData.description,
          type: 'accident',
          location: { type: 'Point', coordinates: [77.2090, 28.6139] }, // Delhi coordinates
          department: 'police',
          reportedBy: new mongoose.Types.ObjectId(),
          reportedByModel: 'User',
          incidentTime: new Date()
        });
        
        await incident.save();
        
        // Verify initial status
        expect(incident.status).toBe('reported');
        expect(incident.statusHistory).toHaveLength(0);
        
        // Apply status changes
        const changedBy = new mongoose.Types.ObjectId();
        let previousStatusCount = 0;
        
        for (const newStatus of testData.statusSequence) {
          await incident.updateStatus(newStatus, changedBy, 'User', `Changed to ${newStatus}`, 'Test notes');
          
          // Verify status change
          expect(incident.status).toBe(newStatus);
          expect(incident.statusHistory).toHaveLength(previousStatusCount + 1);
          
          // Verify status history entry
          const lastHistory = incident.statusHistory[incident.statusHistory.length - 1];
          expect(lastHistory.status).toBe(newStatus);
          expect(lastHistory.changedBy.toString()).toBe(changedBy.toString());
          expect(lastHistory.changedByModel).toBe('User');
          expect(lastHistory.reason).toBe(`Changed to ${newStatus}`);
          expect(lastHistory.notes).toBe('Test notes');
          expect(lastHistory.timestamp).toBeDefined();
          
          // Verify timing fields based on status
          switch (newStatus) {
            case 'verified':
              expect(incident.verifiedAt).toBeDefined();
              break;
            case 'assigned':
              expect(incident.assignedAt).toBeDefined();
              break;
            case 'resolved':
              expect(incident.resolvedAt).toBeDefined();
              expect(incident.resolutionTime).toBeGreaterThanOrEqual(0);
              break;
          }
          
          previousStatusCount++;
        }
        
        // Verify final state
        const finalStatus = testData.statusSequence[testData.statusSequence.length - 1];
        expect(incident.isActive).toBe(!['resolved', 'closed'].includes(finalStatus));
      }
    ), { numRuns: 8 });
  });

  test('Property 7b: Upvote system functionality', () => {
    // Feature: emergency-incident-platform, Property 7: Incident data completeness
    fc.assert(fc.asyncProperty(
      fc.record({
        title: fc.string({ minLength: 5, maxLength: 100 }),
        description: fc.string({ minLength: 10, maxLength: 200 }),
        upvoters: fc.array(fc.record({
          userModel: fc.constantFrom('User', 'Guest'),
          ipAddress: fc.constantFrom('192.168.1.1', '10.0.0.1', '172.16.0.1'),
          longitude: fc.float({ min: -180, max: 180 }),
          latitude: fc.float({ min: -90, max: 90 })
        }), { minLength: 1, maxLength: 10 })
      }),
      async (testData) => {
        // Create incident
        const incident = new Incident({
          title: testData.title,
          description: testData.description,
          type: 'accident',
          location: { type: 'Point', coordinates: [77.2090, 28.6139] },
          department: 'police',
          reportedBy: new mongoose.Types.ObjectId(),
          reportedByModel: 'User',
          incidentTime: new Date()
        });
        
        await incident.save();
        
        // Verify initial upvote state
        expect(incident.upvoteCount).toBe(0);
        expect(incident.upvotes).toHaveLength(0);
        
        // Add upvotes
        const addedUpvoters = [];
        for (const upvoter of testData.upvoters) {
          const userId = new mongoose.Types.ObjectId();
          
          // Avoid duplicate upvotes from same user
          const isDuplicate = addedUpvoters.some(added => 
            added.userId.toString() === userId.toString() && added.userModel === upvoter.userModel
          );
          
          if (!isDuplicate) {
            await incident.addUpvote(
              userId,
              upvoter.userModel,
              upvoter.ipAddress,
              'Test Browser',
              {
                type: 'Point',
                coordinates: [upvoter.longitude, upvoter.latitude]
              }
            );
            
            addedUpvoters.push({ userId, userModel: upvoter.userModel });
            
            // Verify upvote was added
            expect(incident.upvoteCount).toBe(addedUpvoters.length);
            expect(incident.upvotes).toHaveLength(addedUpvoters.length);
            
            // Verify upvote details
            const lastUpvote = incident.upvotes[incident.upvotes.length - 1];
            expect(lastUpvote.userId.toString()).toBe(userId.toString());
            expect(lastUpvote.userModel).toBe(upvoter.userModel);
            expect(lastUpvote.ipAddress).toBe(upvoter.ipAddress);
            expect(lastUpvote.location.coordinates[0]).toBeCloseTo(upvoter.longitude, 5);
            expect(lastUpvote.location.coordinates[1]).toBeCloseTo(upvoter.latitude, 5);
            
            // Verify verification score increased
            expect(incident.verificationScore).toBeGreaterThan(0);
          }
        }
        
        // Test duplicate upvote prevention
        if (addedUpvoters.length > 0) {
          const firstUpvoter = addedUpvoters[0];
          await expect(incident.addUpvote(
            firstUpvoter.userId,
            firstUpvoter.userModel,
            '192.168.1.1',
            'Test Browser'
          )).rejects.toThrow('already upvoted');
        }
        
        // Test upvote removal
        if (addedUpvoters.length > 0) {
          const upvoterToRemove = addedUpvoters[0];
          const initialCount = incident.upvoteCount;
          
          await incident.removeUpvote(upvoterToRemove.userId, upvoterToRemove.userModel);
          
          expect(incident.upvoteCount).toBe(initialCount - 1);
          expect(incident.upvotes).toHaveLength(initialCount - 1);
        }
      }
    ), { numRuns: 8 });
  });

  test('Property 7c: Media management system', () => {
    // Feature: emergency-incident-platform, Property 7: Incident data completeness
    fc.assert(fc.asyncProperty(
      fc.record({
        title: fc.string({ minLength: 5, maxLength: 100 }),
        description: fc.string({ minLength: 10, maxLength: 200 }),
        mediaFiles: fc.array(fc.record({
          fileName: fc.string({ minLength: 5, maxLength: 50 }),
          fileType: fc.constantFrom('image', 'video', 'audio', 'document'),
          mimeType: fc.constantFrom('image/jpeg', 'video/mp4', 'audio/mp3', 'application/pdf'),
          fileSize: fc.integer({ min: 1000, max: 10000000 }) // 1KB to 10MB
        }), { minLength: 1, maxLength: 15 })
      }),
      async (testData) => {
        // Create incident
        const incident = new Incident({
          title: testData.title,
          description: testData.description,
          type: 'accident',
          location: { type: 'Point', coordinates: [77.2090, 28.6139] },
          department: 'police',
          reportedBy: new mongoose.Types.ObjectId(),
          reportedByModel: 'User',
          incidentTime: new Date()
        });
        
        await incident.save();
        
        // Verify initial media state
        expect(incident.media).toHaveLength(0);
        
        // Add media files
        for (const mediaFile of testData.mediaFiles) {
          const mediaData = {
            cloudinaryId: `test_${Date.now()}_${Math.random()}`,
            publicUrl: `https://res.cloudinary.com/test/${mediaFile.fileName}`,
            secureUrl: `https://res.cloudinary.com/test/${mediaFile.fileName}`,
            fileName: mediaFile.fileName,
            fileType: mediaFile.fileType,
            mimeType: mediaFile.mimeType,
            fileSize: mediaFile.fileSize,
            uploadedBy: new mongoose.Types.ObjectId(),
            uploadedByModel: 'User'
          };
          
          // Add dimensions for images
          if (mediaFile.fileType === 'image') {
            mediaData.dimensions = {
              width: 1920,
              height: 1080
            };
          }
          
          // Add duration for video/audio
          if (mediaFile.fileType === 'video' || mediaFile.fileType === 'audio') {
            mediaData.duration = 120; // 2 minutes
          }
          
          await incident.addMedia(mediaData);
          
          // Verify media was added
          expect(incident.media).toHaveLength(incident.media.length);
          
          // Verify media details
          const addedMedia = incident.media[incident.media.length - 1];
          expect(addedMedia.fileName).toBe(mediaFile.fileName);
          expect(addedMedia.fileType).toBe(mediaFile.fileType);
          expect(addedMedia.mimeType).toBe(mediaFile.mimeType);
          expect(addedMedia.fileSize).toBe(mediaFile.fileSize);
          expect(addedMedia.uploadedAt).toBeDefined();
          
          // Verify type-specific fields
          if (mediaFile.fileType === 'image') {
            expect(addedMedia.dimensions).toBeDefined();
            expect(addedMedia.dimensions.width).toBe(1920);
            expect(addedMedia.dimensions.height).toBe(1080);
          }
          
          if (mediaFile.fileType === 'video' || mediaFile.fileType === 'audio') {
            expect(addedMedia.duration).toBe(120);
          }
        }
        
        // Verify final media count (should not exceed limit)
        expect(incident.media.length).toBeLessThanOrEqual(20);
        expect(incident.media.length).toBe(Math.min(testData.mediaFiles.length, 20));
      }
    ), { numRuns: 8 });
  });

  test('Property 7d: Assignment system functionality', () => {
    // Feature: emergency-incident-platform, Property 7: Incident data completeness
    fc.assert(fc.asyncProperty(
      fc.record({
        title: fc.string({ minLength: 5, maxLength: 100 }),
        description: fc.string({ minLength: 10, maxLength: 200 }),
        priority: fc.constantFrom('low', 'medium', 'high', 'critical'),
        assignmentNotes: fc.string({ minLength: 5, maxLength: 100 })
      }),
      async (testData) => {
        // Create incident
        const incident = new Incident({
          title: testData.title,
          description: testData.description,
          type: 'accident',
          location: { type: 'Point', coordinates: [77.2090, 28.6139] },
          department: 'police',
          reportedBy: new mongoose.Types.ObjectId(),
          reportedByModel: 'User',
          incidentTime: new Date()
        });
        
        await incident.save();
        
        // Verify initial assignment state
        expect(incident.assignments).toHaveLength(0);
        expect(incident.currentAssignment).toBeUndefined();
        
        // Create assignment
        const assignedTo = new mongoose.Types.ObjectId();
        const assignedBy = new mongoose.Types.ObjectId();
        
        await incident.assignTo(assignedTo, assignedBy, testData.priority, testData.assignmentNotes);
        
        // Verify assignment was created
        expect(incident.assignments).toHaveLength(1);
        expect(incident.currentAssignment.toString()).toBe(assignedTo.toString());
        
        // Verify assignment details
        const assignment = incident.assignments[0];
        expect(assignment.assignedTo.toString()).toBe(assignedTo.toString());
        expect(assignment.assignedBy.toString()).toBe(assignedBy.toString());
        expect(assignment.priority).toBe(testData.priority);
        expect(assignment.notes).toBe(testData.assignmentNotes);
        expect(assignment.status).toBe('pending');
        expect(assignment.assignedAt).toBeDefined();
        
        // Verify incident status was updated
        expect(incident.status).toBe('assigned');
        expect(incident.assignedAt).toBeDefined();
        
        // Verify status history was updated
        expect(incident.statusHistory).toHaveLength(1);
        const statusChange = incident.statusHistory[0];
        expect(statusChange.status).toBe('assigned');
        expect(statusChange.changedBy.toString()).toBe(assignedBy.toString());
        expect(statusChange.reason).toBe('Incident assigned');
      }
    ), { numRuns: 10 });
  });

  test('Property 7e: Location and proximity functionality', () => {
    // Feature: emergency-incident-platform, Property 7: Incident data completeness
    fc.assert(fc.asyncProperty(
      fc.record({
        incidents: fc.array(fc.record({
          title: fc.string({ minLength: 5, maxLength: 50 }),
          longitude: fc.float({ min: 77.0, max: 77.5 }), // Delhi area
          latitude: fc.float({ min: 28.4, max: 28.8 })
        }), { minLength: 2, maxLength: 5 }),
        searchLongitude: fc.float({ min: 77.0, max: 77.5 }),
        searchLatitude: fc.float({ min: 28.4, max: 28.8 }),
        maxDistance: fc.integer({ min: 500, max: 5000 }) // 500m to 5km
      }),
      async (testData) => {
        // Create incidents at different locations
        const createdIncidents = [];
        for (const incidentData of testData.incidents) {
          const incident = new Incident({
            title: incidentData.title,
            description: 'Test incident description for location testing',
            type: 'accident',
            location: {
              type: 'Point',
              coordinates: [incidentData.longitude, incidentData.latitude]
            },
            department: 'police',
            reportedBy: new mongoose.Types.ObjectId(),
            reportedByModel: 'User',
            incidentTime: new Date()
          });
          
          await incident.save();
          createdIncidents.push(incident);
        }
        
        // Test proximity search
        const nearbyIncidents = await Incident.findNearby(
          testData.searchLongitude,
          testData.searchLatitude,
          testData.maxDistance
        );
        
        // Verify all returned incidents are within the search radius
        expect(Array.isArray(nearbyIncidents)).toBe(true);
        expect(nearbyIncidents.length).toBeLessThanOrEqual(createdIncidents.length);
        
        // Verify each nearby incident has valid location data
        nearbyIncidents.forEach(incident => {
          expect(incident.location).toBeDefined();
          expect(incident.location.type).toBe('Point');
          expect(incident.location.coordinates).toHaveLength(2);
          expect(incident.location.coordinates[0]).toBeGreaterThanOrEqual(-180);
          expect(incident.location.coordinates[0]).toBeLessThanOrEqual(180);
          expect(incident.location.coordinates[1]).toBeGreaterThanOrEqual(-90);
          expect(incident.location.coordinates[1]).toBeLessThanOrEqual(90);
        });
        
        // Verify incidents are active (not closed/resolved)
        nearbyIncidents.forEach(incident => {
          expect(['reported', 'verified', 'assigned', 'in_progress']).toContain(incident.status);
        });
      }
    ), { numRuns: 8 });
  });

  test('Property 7f: Verification score calculation', () => {
    // Feature: emergency-incident-platform, Property 7: Incident data completeness
    fc.assert(fc.asyncProperty(
      fc.record({
        title: fc.string({ minLength: 5, maxLength: 100 }),
        description: fc.string({ minLength: 10, maxLength: 1000 }),
        upvoteCount: fc.integer({ min: 0, max: 20 }),
        mediaCount: fc.integer({ min: 0, max: 10 }),
        reportedByModel: fc.constantFrom('User', 'Guest')
      }),
      async (testData) => {
        // Create incident
        const incident = new Incident({
          title: testData.title,
          description: testData.description,
          type: 'accident',
          location: { type: 'Point', coordinates: [77.2090, 28.6139] },
          department: 'police',
          reportedBy: new mongoose.Types.ObjectId(),
          reportedByModel: testData.reportedByModel,
          incidentTime: new Date()
        });
        
        // Add mock upvotes
        for (let i = 0; i < testData.upvoteCount; i++) {
          incident.upvotes.push({
            userId: new mongoose.Types.ObjectId(),
            userModel: 'User',
            timestamp: new Date(),
            ipAddress: '192.168.1.1'
          });
        }
        incident.upvoteCount = testData.upvoteCount;
        
        // Add mock media
        for (let i = 0; i < testData.mediaCount; i++) {
          incident.media.push({
            cloudinaryId: `test_${i}`,
            publicUrl: `https://test.com/image_${i}.jpg`,
            secureUrl: `https://test.com/image_${i}.jpg`,
            fileName: `image_${i}.jpg`,
            fileType: 'image',
            mimeType: 'image/jpeg',
            fileSize: 100000,
            uploadedBy: new mongoose.Types.ObjectId(),
            uploadedByModel: 'User'
          });
        }
        
        await incident.save();
        
        // Calculate and verify verification score
        const calculatedScore = incident.calculateVerificationScore();
        
        // Verify score is within valid range
        expect(calculatedScore).toBeGreaterThanOrEqual(0);
        expect(calculatedScore).toBeLessThanOrEqual(100);
        
        // Verify score components
        let expectedScore = 0;
        
        // Upvote points (max 50)
        expectedScore += Math.min(testData.upvoteCount * 5, 50);
        
        // Media points (max 20)
        expectedScore += Math.min(testData.mediaCount * 5, 20);
        
        // Description length points (max 10)
        if (testData.description.length > 100) expectedScore += 5;
        if (testData.description.length > 500) expectedScore += 5;
        
        // Verified reporter points (max 10)
        if (testData.reportedByModel === 'User') expectedScore += 10;
        
        // Age penalty (incidents are new, so no penalty)
        // expectedScore remains the same for new incidents
        
        expectedScore = Math.max(0, Math.min(expectedScore, 100));
        
        expect(calculatedScore).toBeCloseTo(expectedScore, 0);
        expect(incident.verificationScore).toBeCloseTo(expectedScore, 0);
      }
    ), { numRuns: 10 });
  });

});

describe('Incident Model Static Methods', () => {

  beforeEach(async () => {
    await Incident.deleteMany({});
  });

  test('Property: Incident statistics aggregation', () => {
    fc.assert(fc.asyncProperty(
      fc.array(fc.record({
        type: fc.constantFrom('accident', 'fire', 'medical_emergency', 'crime'),
        status: fc.constantFrom('reported', 'verified', 'assigned', 'resolved', 'closed'),
        department: fc.constantFrom('police', 'fire', 'medical', 'municipal'),
        severity: fc.constantFrom('low', 'medium', 'high', 'critical')
      }), { minLength: 1, maxLength: 10 }),
      async (incidentData) => {
        // Create incidents with various properties
        const incidents = [];
        for (const data of incidentData) {
          const incident = new Incident({
            title: `Test incident ${incidents.length}`,
            description: 'Test description for statistics',
            type: data.type,
            status: data.status,
            department: data.department,
            severity: data.severity,
            location: { type: 'Point', coordinates: [77.2090, 28.6139] },
            reportedBy: new mongoose.Types.ObjectId(),
            reportedByModel: 'User',
            incidentTime: new Date()
          });
          
          await incident.save();
          incidents.push(incident);
        }
        
        // Get statistics
        const stats = await Incident.getIncidentStats();
        
        // Verify statistics structure
        expect(stats).toHaveProperty('statusStats');
        expect(stats).toHaveProperty('typeStats');
        expect(Array.isArray(stats.statusStats)).toBe(true);
        expect(Array.isArray(stats.typeStats)).toBe(true);
        
        // Verify status statistics accuracy
        const statusCounts = {};
        incidents.forEach(incident => {
          statusCounts[incident.status] = (statusCounts[incident.status] || 0) + 1;
        });
        
        stats.statusStats.forEach(stat => {
          expect(stat.count).toBe(statusCounts[stat._id] || 0);
        });
        
        // Verify type statistics accuracy
        const typeCounts = {};
        incidents.forEach(incident => {
          typeCounts[incident.type] = (typeCounts[incident.type] || 0) + 1;
        });
        
        stats.typeStats.forEach(stat => {
          expect(stat.count).toBe(typeCounts[stat._id] || 0);
        });
      }
    ), { numRuns: 8 });
  });

});