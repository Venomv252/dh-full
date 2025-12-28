/**
 * Property-Based Test Generators
 * 
 * Custom arbitraries for property-based testing using fast-check
 * These generators create random test data for comprehensive testing
 */

const fc = require('fast-check');

/**
 * User registration data generator
 * Generates complete user profile data for testing
 */
const userRegistrationDataArbitrary = () => fc.record({
  fullName: fc.string({ minLength: 2, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.string({ minLength: 10, maxLength: 15 }).map(s => s.replace(/[^0-9]/g, '')),
  password: fc.string({ minLength: 8, maxLength: 50 }),
  dob: fc.date({ min: new Date('1920-01-01'), max: new Date('2010-01-01') }),
  gender: fc.constantFrom('male', 'female', 'other'),
  address: fc.record({
    street: fc.string({ minLength: 5, maxLength: 200 }),
    city: fc.string({ minLength: 2, maxLength: 50 }),
    state: fc.string({ minLength: 2, maxLength: 50 }),
    pincode: fc.string({ minLength: 5, maxLength: 10 })
  }),
  bloodGroup: fc.constantFrom('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  medicalConditions: fc.array(fc.string({ minLength: 3, maxLength: 100 }), { maxLength: 5 }),
  allergies: fc.array(fc.string({ minLength: 3, maxLength: 100 }), { maxLength: 5 }),
  emergencyContacts: fc.array(fc.record({
    name: fc.string({ minLength: 2, maxLength: 100 }),
    relation: fc.constantFrom('spouse', 'parent', 'sibling', 'friend', 'colleague'),
    phone: fc.string({ minLength: 10, maxLength: 15 }).map(s => s.replace(/[^0-9]/g, ''))
  }), { minLength: 1, maxLength: 5 }),
  vehicles: fc.array(fc.record({
    vehicleNumber: fc.string({ minLength: 6, maxLength: 15 }),
    type: fc.constantFrom('car', 'motorcycle', 'truck', 'bicycle'),
    model: fc.string({ minLength: 2, maxLength: 50 })
  }), { maxLength: 3 }),
  insurance: fc.record({
    provider: fc.string({ minLength: 3, maxLength: 100 }),
    policyNumber: fc.string({ minLength: 8, maxLength: 20 }),
    validTill: fc.date({ min: new Date(), max: new Date('2030-12-31') })
  }),
  role: fc.constantFrom('user', 'police', 'hospital', 'admin'),
  department: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
  jurisdiction: fc.option(fc.string({ minLength: 3, maxLength: 100 })),
  licenseNumber: fc.option(fc.string({ minLength: 5, maxLength: 20 }))
});

/**
 * Incident data generator
 * Generates incident report data with location and media
 */
const incidentDataArbitrary = () => fc.record({
  title: fc.string({ minLength: 5, maxLength: 200 }),
  description: fc.string({ minLength: 10, maxLength: 2000 }),
  type: fc.constantFrom('Fire', 'Accident', 'Medical', 'Crime'),
  geoLocation: fc.record({
    type: fc.constant('Point'),
    coordinates: fc.tuple(
      fc.float({ min: -180, max: 180 }), // longitude
      fc.float({ min: -90, max: 90 })    // latitude
    )
  }),
  address: fc.string({ minLength: 10, maxLength: 200 }),
  media: fc.array(fc.record({
    type: fc.constantFrom('image', 'video'),
    url: fc.webUrl(),
    publicId: fc.string({ minLength: 10, maxLength: 50 })
  }), { maxLength: 5 }),
  priority: fc.constantFrom('low', 'medium', 'high', 'critical'),
  status: fc.constantFrom('reported', 'dispatched', 'arrived', 'resolved')
});

/**
 * Guest user data generator
 * Generates guest user data for testing action limits
 */
const guestDataArbitrary = () => fc.record({
  guestId: fc.uuid(),
  actionCount: fc.integer({ min: 0, max: 15 }),
  maxActions: fc.constant(10),
  ipAddress: fc.ipV4(),
  lastActiveAt: fc.date({ min: new Date(Date.now() - 24 * 60 * 60 * 1000), max: new Date() })
});

/**
 * Geospatial coordinate generator
 * Generates valid longitude/latitude pairs
 */
const coordinatesArbitrary = () => fc.tuple(
  fc.float({ min: -180, max: 180 }), // longitude
  fc.float({ min: -90, max: 90 })    // latitude
);

/**
 * Address string generator
 * Generates realistic address strings for geocoding tests
 */
const addressArbitrary = () => {
  return fc.record({
    street: fc.string({ minLength: 5, maxLength: 50 }),
    city: fc.string({ minLength: 2, maxLength: 30 }),
    state: fc.string({ minLength: 2, maxLength: 20 }),
    zipCode: fc.string({ minLength: 5, maxLength: 10 }),
    country: fc.constantFrom('US', 'CA', 'UK', 'AU', 'DE', 'FR')
  }).map(parts => `${parts.street}, ${parts.city}, ${parts.state} ${parts.zipCode}, ${parts.country}`);
};

/**
 * JWT token payload generator
 * Generates JWT payload data for authentication testing
 */
const jwtPayloadArbitrary = () => fc.record({
  userId: fc.string({ minLength: 24, maxLength: 24 }),
  email: fc.emailAddress(),
  role: fc.constantFrom('user', 'police', 'hospital', 'admin'),
  department: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
  iat: fc.integer({ min: Math.floor(Date.now() / 1000) - 3600, max: Math.floor(Date.now() / 1000) }),
  exp: fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 86400 })
});

/**
 * Media upload data generator
 * Generates media file data for Cloudinary testing
 */
const mediaUploadArbitrary = () => fc.record({
  originalname: fc.string({ minLength: 5, maxLength: 100 }),
  mimetype: fc.constantFrom('image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/avi'),
  size: fc.integer({ min: 1024, max: 10 * 1024 * 1024 }), // 1KB to 10MB
  buffer: fc.uint8Array({ minLength: 100, maxLength: 1000 })
});

/**
 * API request data generator
 * Generates HTTP request data for API testing
 */
const apiRequestArbitrary = () => fc.record({
  method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
  path: fc.string({ minLength: 1, maxLength: 100 }),
  headers: fc.record({
    'content-type': fc.constantFrom('application/json', 'multipart/form-data'),
    'authorization': fc.option(fc.string({ minLength: 20, maxLength: 200 }))
  }),
  body: fc.option(fc.object()),
  query: fc.option(fc.record({
    page: fc.option(fc.integer({ min: 1, max: 100 })),
    limit: fc.option(fc.integer({ min: 1, max: 100 })),
    type: fc.option(fc.constantFrom('Fire', 'Accident', 'Medical', 'Crime'))
  }))
});

/**
 * Audit log data generator
 * Generates audit log entries for testing
 */
const auditLogArbitrary = () => fc.record({
  action: fc.constantFrom('create', 'update', 'delete', 'view', 'login', 'logout'),
  resource: fc.constantFrom('incident', 'user', 'patient', 'system'),
  resourceId: fc.string({ minLength: 24, maxLength: 24 }),
  performedBy: fc.record({
    userType: fc.constantFrom('user', 'guest', 'system'),
    userId: fc.option(fc.string({ minLength: 24, maxLength: 24 })),
    guestId: fc.option(fc.string({ minLength: 24, maxLength: 24 }))
  }),
  ipAddress: fc.ipV4(),
  userAgent: fc.string({ minLength: 10, maxLength: 200 }),
  details: fc.object()
});

module.exports = {
  userRegistrationDataArbitrary,
  incidentDataArbitrary,
  guestDataArbitrary,
  coordinatesArbitrary,
  addressArbitrary,
  jwtPayloadArbitrary,
  mediaUploadArbitrary,
  apiRequestArbitrary,
  auditLogArbitrary
};