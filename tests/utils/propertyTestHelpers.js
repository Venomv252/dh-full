/**
 * Property-Based Testing Helpers
 * 
 * Utilities and generators for property-based testing with fast-check
 */

const fc = require('fast-check');
const mongoose = require('mongoose');

/**
 * Generators for common data types
 */
const generators = {
  // Email generator
  email: () => fc.emailAddress(),
  
  // Phone number generator (US format)
  phone: () => fc.string({ minLength: 10, maxLength: 15 }).map(s => 
    `+1${s.replace(/\D/g, '').padEnd(10, '0').slice(0, 10)}`
  ),
  
  // Password generator (meets requirements)
  password: () => fc.string({ minLength: 8, maxLength: 50 }).filter(s => 
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(s)
  ),
  
  // Name generator
  name: () => fc.string({ minLength: 2, maxLength: 50 }).filter(s => 
    /^[a-zA-Z\s'-]+$/.test(s.trim())
  ),
  
  // Address generator
  address: () => fc.record({
    street: fc.string({ minLength: 5, maxLength: 100 }),
    city: fc.string({ minLength: 2, maxLength: 50 }),
    state: fc.string({ minLength: 2, maxLength: 50 }),
    zipCode: fc.string({ minLength: 5, maxLength: 10 }),
    country: fc.constant('USA')
  }),
  
  // Coordinates generator (valid longitude/latitude)
  coordinates: () => fc.tuple(
    fc.float({ min: -180, max: 180 }), // longitude
    fc.float({ min: -90, max: 90 })    // latitude
  ),
  
  // GeoJSON Point generator
  geoJSONPoint: () => generators.coordinates().map(([lng, lat]) => ({
    type: 'Point',
    coordinates: [lng, lat]
  })),
  
  // Incident type generator
  incidentType: () => fc.constantFrom('Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other'),
  
  // Severity generator
  severity: () => fc.constantFrom('Low', 'Medium', 'High', 'Critical'),
  
  // Status generator
  status: () => fc.constantFrom('Reported', 'Verified', 'Resolved'),
  
  // Role generator
  role: () => fc.constantFrom('user', 'hospital', 'admin'),
  
  // Blood type generator
  bloodType: () => fc.constantFrom('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  
  // MongoDB ObjectId generator
  objectId: () => fc.string({ minLength: 24, maxLength: 24 }).map(() => 
    new mongoose.Types.ObjectId()
  ),
  
  // URL generator
  url: () => fc.webUrl(),
  
  // Media array generator
  mediaArray: () => fc.array(generators.url(), { minLength: 0, maxLength: 5 }),
  
  // Medical info generator
  medicalInfo: () => fc.record({
    bloodType: generators.bloodType(),
    allergies: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { maxLength: 5 }),
    medications: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { maxLength: 5 }),
    conditions: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { maxLength: 5 })
  }),
  
  // Emergency contact generator
  emergencyContact: () => fc.record({
    name: generators.name(),
    relationship: fc.constantFrom('spouse', 'parent', 'sibling', 'friend', 'other'),
    phone: generators.phone()
  }),
  
  // User generator
  user: () => fc.record({
    email: generators.email(),
    password: generators.password(),
    fullName: generators.name(),
    phone: generators.phone(),
    dateOfBirth: fc.date({ min: new Date('1940-01-01'), max: new Date('2005-01-01') }),
    address: generators.address(),
    emergencyContact: generators.emergencyContact(),
    medicalInfo: generators.medicalInfo(),
    role: generators.role()
  }),
  
  // Guest generator
  guest: () => fc.record({
    guestId: fc.uuid(),
    actionCount: fc.integer({ min: 0, max: 20 }),
    lastActiveAt: fc.date({ min: new Date('2023-01-01'), max: new Date() })
  }),
  
  // Incident generator
  incident: () => fc.record({
    title: fc.string({ minLength: 5, maxLength: 100 }),
    description: fc.string({ minLength: 10, maxLength: 1000 }),
    type: generators.incidentType(),
    severity: generators.severity(),
    location: generators.geoJSONPoint(),
    address: fc.string({ minLength: 10, maxLength: 200 }),
    media: generators.mediaArray(),
    status: generators.status(),
    reportedBy: fc.record({
      type: fc.constantFrom('User', 'Guest'),
      id: generators.objectId()
    })
  }),
  
  // Whitespace string generator (for testing empty validation)
  whitespaceString: () => fc.string().filter(s => s.trim().length === 0),
  
  // Invalid email generator
  invalidEmail: () => fc.string().filter(s => 
    !s.includes('@') || s.length < 3 || s.startsWith('@') || s.endsWith('@')
  ),
  
  // Invalid coordinates generator
  invalidCoordinates: () => fc.oneof(
    fc.tuple(fc.float({ min: -200, max: -181 }), fc.float({ min: -90, max: 90 })), // Invalid longitude
    fc.tuple(fc.float({ min: 181, max: 200 }), fc.float({ min: -90, max: 90 })),   // Invalid longitude
    fc.tuple(fc.float({ min: -180, max: 180 }), fc.float({ min: -100, max: -91 })), // Invalid latitude
    fc.tuple(fc.float({ min: -180, max: 180 }), fc.float({ min: 91, max: 100 }))    // Invalid latitude
  )
};

/**
 * Property test configuration
 */
const propertyTestConfig = {
  // Number of test cases to run
  numRuns: 100,
  
  // Timeout for each property test
  timeout: 10000,
  
  // Seed for reproducible tests (optional)
  seed: undefined,
  
  // Verbose output
  verbose: false
};

/**
 * Helper to run property tests with consistent configuration
 */
const runPropertyTest = (name, property, config = {}) => {
  const testConfig = { ...propertyTestConfig, ...config };
  
  test(name, async () => {
    await fc.assert(property, testConfig);
  }, testConfig.timeout);
};

/**
 * Helper to create async property tests
 */
const asyncProperty = (generators, predicate) => {
  return fc.asyncProperty(...generators, predicate);
};

/**
 * Helper to create property tests with pre/post conditions
 */
const propertyWithConditions = (generators, precondition, predicate) => {
  return fc.property(...generators, (...args) => {
    fc.pre(precondition(...args));
    return predicate(...args);
  });
};

/**
 * Validation helpers for property tests
 */
const validators = {
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidPhone: (phone) => {
    const phoneRegex = /^\+1\d{10}$/;
    return phoneRegex.test(phone);
  },
  
  isValidGeoJSON: (location) => {
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
  },
  
  isValidIncidentType: (type) => {
    const validTypes = ['Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other'];
    return validTypes.includes(type);
  },
  
  isValidSeverity: (severity) => {
    const validSeverities = ['Low', 'Medium', 'High', 'Critical'];
    return validSeverities.includes(severity);
  },
  
  isValidRole: (role) => {
    const validRoles = ['user', 'hospital', 'admin'];
    return validRoles.includes(role);
  }
};

module.exports = {
  generators,
  propertyTestConfig,
  runPropertyTest,
  asyncProperty,
  propertyWithConditions,
  validators,
  fc // Export fast-check for direct use
};