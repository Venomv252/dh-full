/**
 * Test Helper Utilities
 * 
 * Common utilities and helpers for testing
 */

const request = require('supertest');
const User = require('../../src/models/User');
const Guest = require('../../src/models/Guest');
const Incident = require('../../src/models/Incident');

// Import app without starting the server
const express = require('express');
const { securityMiddleware } = require('../../src/config/security');
const { HTTP_STATUS } = require('../../src/config/constants');
const { errorHandler } = require('../../src/middleware/errorHandler');

// Create test app without database connection
const createTestApp = () => {
  const app = express();
  
  // Security middleware (Helmet, CORS)
  app.use(securityMiddleware);
  
  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Emergency Incident Platform API is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'test',
      uptime: process.uptime()
    });
  });
  
  // Import route modules
  const guestRoutes = require('../../src/routes/guestRoutes');
  const userRoutes = require('../../src/routes/userRoutes');
  const incidentRoutes = require('../../src/routes/incidentRoutes');
  const adminRoutes = require('../../src/routes/adminRoutes');
  
  // API routes
  app.use('/api/guest', guestRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/admin', adminRoutes);
  
  // 404 handler for undefined routes
  app.use('*', (req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        type: 'resource',
        details: {
          method: req.method,
          path: req.originalUrl,
          suggestion: 'Please check the API documentation for valid endpoints'
        }
      },
      timestamp: new Date().toISOString(),
    });
  });
  
  // Error handling middleware
  app.use(errorHandler);
  
  return app;
};

/**
 * Create a test request agent
 */
const createTestAgent = () => {
  const app = createTestApp();
  return request(app);
};

/**
 * Create and save a user to the database
 */
const createTestUser = async (userData) => {
  const user = new User(userData);
  return await user.save();
};

/**
 * Create and save a guest to the database
 */
const createTestGuest = async (guestData) => {
  const guest = new Guest(guestData);
  return await guest.save();
};

/**
 * Create and save an incident to the database
 */
const createTestIncident = async (incidentData) => {
  const incident = new Incident(incidentData);
  return await incident.save();
};

/**
 * Clear all test data from database
 */
const clearTestData = async () => {
  await Promise.all([
    User.deleteMany({}),
    Guest.deleteMany({}),
    Incident.deleteMany({})
  ]);
};

/**
 * Wait for a specified amount of time (for async operations)
 */
const wait = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate random coordinates within bounds
 */
const generateRandomCoordinates = (bounds = { minLng: -180, maxLng: 180, minLat: -90, maxLat: 90 }) => {
  const lng = Math.random() * (bounds.maxLng - bounds.minLng) + bounds.minLng;
  const lat = Math.random() * (bounds.maxLat - bounds.minLat) + bounds.minLat;
  return [lng, lat];
};

/**
 * Calculate distance between two points (rough approximation for testing)
 */
const calculateDistance = (coord1, coord2) => {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Assert that response has correct error format
 */
const expectErrorResponse = (response, statusCode, errorCode) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toBeDefined();
  if (errorCode) {
    expect(response.body.error.code).toBe(errorCode);
  }
};

/**
 * Assert that response has correct success format
 */
const expectSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
};

/**
 * Create headers for guest requests
 */
const createGuestHeaders = (guestId) => {
  return {
    'X-Guest-ID': guestId,
    'Content-Type': 'application/json'
  };
};

/**
 * Create headers for user requests (when JWT is implemented)
 */
const createUserHeaders = (token) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

/**
 * Validate GeoJSON Point format
 */
const isValidGeoJSONPoint = (location) => {
  return (
    location &&
    location.type === 'Point' &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2 &&
    typeof location.coordinates[0] === 'number' &&
    typeof location.coordinates[1] === 'number' &&
    location.coordinates[0] >= -180 &&
    location.coordinates[0] <= 180 &&
    location.coordinates[1] >= -90 &&
    location.coordinates[1] <= 90
  );
};

/**
 * Generate test data that should pass validation
 */
const generateValidTestData = {
  email: () => `test${Date.now()}@example.com`,
  phone: () => `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
  coordinates: () => generateRandomCoordinates(),
  incidentType: () => ['Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other'][Math.floor(Math.random() * 6)],
  severity: () => ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)]
};

module.exports = {
  createTestAgent,
  createTestUser,
  createTestGuest,
  createTestIncident,
  clearTestData,
  wait,
  generateRandomCoordinates,
  calculateDistance,
  expectErrorResponse,
  expectSuccessResponse,
  createGuestHeaders,
  createUserHeaders,
  isValidGeoJSONPoint,
  generateValidTestData
};