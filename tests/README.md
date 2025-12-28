# Emergency Incident Platform - Testing Framework

## Overview

This testing framework provides comprehensive testing capabilities for the Emergency Incident Platform using Jest, MongoDB Memory Server, and fast-check for property-based testing.

## Testing Stack

- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertion library for API testing
- **MongoDB Memory Server**: In-memory MongoDB for isolated testing
- **fast-check**: Property-based testing library
- **@faker-js/faker**: Test data generation

## Test Structure

```
tests/
├── setup.js                    # Global test configuration
├── setup.test.js              # Framework verification tests
├── factories/                 # Test data factories
│   ├── userFactory.js         # User test data generation
│   ├── guestFactory.js        # Guest test data generation
│   └── incidentFactory.js     # Incident test data generation
└── utils/                     # Testing utilities
    ├── testHelpers.js         # Common test utilities
    └── propertyTestHelpers.js # Property-based testing helpers
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
npm run test:unit        # Unit tests only
npm run test:property    # Property-based tests only
npm run test:integration # Integration tests only
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Types

### 1. Unit Tests
Test individual functions and components in isolation.

```javascript
describe('User Controller', () => {
  test('should create user with valid data', async () => {
    const userData = createUserData();
    const user = await createTestUser(userData);
    expect(user.email).toBe(userData.email);
  });
});
```

### 2. Property-Based Tests
Test universal properties across many generated inputs.

```javascript
test('Property: Email validation consistency', () => {
  fc.assert(
    fc.property(generators.email(), (email) => {
      return validators.isValidEmail(email);
    }),
    { numRuns: 100 }
  );
});
```

### 3. Integration Tests
Test complete workflows and API endpoints.

```javascript
test('should create incident and allow upvoting', async () => {
  const guest = await createTestGuest();
  const incidentData = createIncidentData();
  
  const createResponse = await agent
    .post('/api/incidents')
    .set(createGuestHeaders(guest.guestId))
    .send(incidentData);
    
  expect(createResponse.status).toBe(201);
});
```

## Test Data Factories

### User Factory
```javascript
const { createUserData, createHospitalUser, createAdminUser } = require('./factories/userFactory');

const user = createUserData({ role: 'user' });
const hospital = createHospitalUser();
const admin = createAdminUser();
```

### Guest Factory
```javascript
const { createGuestData, createGuestAtLimit } = require('./factories/guestFactory');

const guest = createGuestData();
const limitedGuest = createGuestAtLimit(); // At 10 action limit
```

### Incident Factory
```javascript
const { createIncidentData, createIncidentAtLocation } = require('./factories/incidentFactory');

const incident = createIncidentData();
const locationIncident = createIncidentAtLocation(-122.4194, 37.7749);
```

## Property-Based Testing

### Generators
The framework provides generators for all major data types:

```javascript
const { generators } = require('./utils/propertyTestHelpers');

// Basic generators
generators.email()           // Valid email addresses
generators.phone()           // US phone numbers
generators.coordinates()     // Valid lat/lng pairs
generators.geoJSONPoint()    // GeoJSON Point objects

// Complex generators
generators.user()            // Complete user objects
generators.incident()        // Complete incident objects
generators.guest()           // Guest objects
```

### Validators
Built-in validators for testing properties:

```javascript
const { validators } = require('./utils/propertyTestHelpers');

validators.isValidEmail(email)
validators.isValidGeoJSON(point)
validators.isValidIncidentType(type)
validators.isValidRole(role)
```

### Property Test Configuration
```javascript
const propertyTestConfig = {
  numRuns: 100,        // Number of test cases
  timeout: 10000,      // Timeout per test
  seed: undefined,     // Reproducible seed
  verbose: false       // Verbose output
};
```

## Test Utilities

### Database Helpers
```javascript
const { createTestUser, createTestGuest, clearTestData } = require('./utils/testHelpers');

// Create test data
const user = await createTestUser(userData);
const guest = await createTestGuest(guestData);

// Clean up after tests
await clearTestData();
```

### API Testing Helpers
```javascript
const { createTestAgent, expectSuccessResponse, expectErrorResponse } = require('./utils/testHelpers');

const agent = createTestAgent();

const response = await agent.get('/api/incidents');
expectSuccessResponse(response, 200);
```

### Request Headers
```javascript
const { createGuestHeaders, createUserHeaders } = require('./utils/testHelpers');

// Guest requests
const guestHeaders = createGuestHeaders(guestId);

// User requests (when JWT is implemented)
const userHeaders = createUserHeaders(token);
```

## Database Setup

The testing framework uses MongoDB Memory Server for isolated testing:

- **Automatic Setup**: In-memory database starts before tests
- **Clean State**: Database is cleared after each test
- **No Dependencies**: No external MongoDB required
- **Fast**: In-memory operations are very fast

## Best Practices

### 1. Test Isolation
Each test should be independent and not rely on other tests.

### 2. Property-Based Testing
Use property-based tests for universal properties:
- Data validation rules
- Round-trip properties (serialize/deserialize)
- Invariants that should always hold
- Metamorphic properties

### 3. Unit vs Integration
- **Unit tests**: Test individual functions with mocked dependencies
- **Integration tests**: Test complete workflows with real database

### 4. Test Data
- Use factories for consistent test data generation
- Use property generators for comprehensive input coverage
- Keep test data realistic but minimal

### 5. Error Testing
Always test both success and error cases:
```javascript
test('should reject invalid email', async () => {
  const invalidData = createInvalidUserData('email');
  const response = await agent.post('/api/user/register').send(invalidData);
  expectErrorResponse(response, 400, 'VALIDATION_ERROR');
});
```

## Coverage Goals

The testing framework is configured with coverage thresholds:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Debugging Tests

### Verbose Output
```bash
npm test -- --verbose
```

### Single Test File
```bash
npm test -- tests/specific-test.js
```

### Debug Mode
```bash
npm test -- --detectOpenHandles --forceExit
```

## Property Test Examples

### Round-Trip Property
```javascript
test('Property: User serialization round-trip', () => {
  fc.assert(
    fc.property(generators.user(), async (userData) => {
      const user = await createTestUser(userData);
      const retrieved = await User.findById(user._id);
      return retrieved.email === userData.email;
    })
  );
});
```

### Invariant Property
```javascript
test('Property: Guest action count never exceeds limit after increment', () => {
  fc.assert(
    fc.property(generators.guest(), async (guestData) => {
      const guest = await createTestGuest(guestData);
      await guest.incrementActionCount();
      return guest.actionCount <= 10; // Action limit
    })
  );
});
```

### Metamorphic Property
```javascript
test('Property: Incident search results are subset of all incidents', () => {
  fc.assert(
    fc.property(
      fc.array(generators.incident(), { minLength: 5 }),
      generators.incidentType(),
      async (incidents, searchType) => {
        // Create incidents
        await Promise.all(incidents.map(createTestIncident));
        
        // Search by type
        const results = await Incident.find({ type: searchType });
        const allIncidents = await Incident.find({});
        
        // Results should be subset of all incidents
        return results.length <= allIncidents.length;
      }
    )
  );
});
```

This testing framework provides a solid foundation for ensuring the correctness and reliability of the Emergency Incident Platform.