/**
 * Incident Test Factory
 * 
 * Factory functions for creating test incident data
 */

const { faker } = require('@faker-js/faker');
const mongoose = require('mongoose');

/**
 * Generate a valid incident object for testing
 */
const createIncidentData = (overrides = {}) => {
  const incidentData = {
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraphs(2),
    type: faker.helpers.arrayElement(['Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other']),
    severity: faker.helpers.arrayElement(['Low', 'Medium', 'High', 'Critical']),
    location: {
      type: 'Point',
      coordinates: [
        parseFloat(faker.location.longitude()), // longitude first in GeoJSON
        parseFloat(faker.location.latitude())   // latitude second
      ]
    },
    address: faker.location.streetAddress({ useFullAddress: true }),
    media: faker.helpers.arrayElements([
      faker.image.url(),
      faker.image.url(),
      faker.image.url()
    ], { min: 0, max: 3 }),
    status: faker.helpers.arrayElement(['Reported', 'Verified', 'Resolved']),
    reportedBy: {
      type: faker.helpers.arrayElement(['User', 'Guest']),
      id: new mongoose.Types.ObjectId()
    },
    upvotes: [],
    upvoteCount: 0,
    ...overrides
  };

  return incidentData;
};

/**
 * Create incident with specific location
 */
const createIncidentAtLocation = (longitude, latitude, overrides = {}) => {
  return createIncidentData({
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    ...overrides
  });
};

/**
 * Create incident with specific type
 */
const createIncidentOfType = (type, overrides = {}) => {
  return createIncidentData({
    type,
    ...overrides
  });
};

/**
 * Create incident with specific severity
 */
const createIncidentWithSeverity = (severity, overrides = {}) => {
  return createIncidentData({
    severity,
    ...overrides
  });
};

/**
 * Create incident with upvotes
 */
const createIncidentWithUpvotes = (upvoteCount = 5, overrides = {}) => {
  const upvotes = Array.from({ length: upvoteCount }, () => ({
    type: faker.helpers.arrayElement(['User', 'Guest']),
    id: new mongoose.Types.ObjectId(),
    upvotedAt: faker.date.recent()
  }));

  return createIncidentData({
    upvotes,
    upvoteCount,
    ...overrides
  });
};

/**
 * Create incident reported by user
 */
const createIncidentByUser = (userId, overrides = {}) => {
  return createIncidentData({
    reportedBy: {
      type: 'User',
      id: userId || new mongoose.Types.ObjectId()
    },
    ...overrides
  });
};

/**
 * Create incident reported by guest
 */
const createIncidentByGuest = (guestId, overrides = {}) => {
  return createIncidentData({
    reportedBy: {
      type: 'Guest',
      id: guestId || new mongoose.Types.ObjectId()
    },
    ...overrides
  });
};

/**
 * Create multiple incidents
 */
const createMultipleIncidents = (count = 3, overrides = {}) => {
  return Array.from({ length: count }, () => createIncidentData(overrides));
};

/**
 * Create incidents in a geographic area (for geospatial testing)
 */
const createIncidentsInArea = (centerLng, centerLat, radiusKm = 1, count = 5) => {
  return Array.from({ length: count }, () => {
    // Generate random point within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusKm;
    
    // Convert to approximate lat/lng offset
    const lngOffset = (distance * Math.cos(angle)) / 111.32; // Rough conversion
    const latOffset = (distance * Math.sin(angle)) / 110.54; // Rough conversion
    
    return createIncidentAtLocation(
      centerLng + lngOffset,
      centerLat + latOffset
    );
  });
};

/**
 * Create invalid incident data for testing validation
 */
const createInvalidIncidentData = (invalidField) => {
  const baseData = createIncidentData();
  
  switch (invalidField) {
    case 'type':
      baseData.type = 'InvalidType';
      break;
    case 'severity':
      baseData.severity = 'InvalidSeverity';
      break;
    case 'location':
      baseData.location = { invalid: 'location' };
      break;
    case 'coordinates':
      baseData.location.coordinates = [200, 100]; // Invalid coordinates
      break;
    default:
      delete baseData[invalidField];
  }
  
  return baseData;
};

module.exports = {
  createIncidentData,
  createIncidentAtLocation,
  createIncidentOfType,
  createIncidentWithSeverity,
  createIncidentWithUpvotes,
  createIncidentByUser,
  createIncidentByGuest,
  createMultipleIncidents,
  createIncidentsInArea,
  createInvalidIncidentData
};