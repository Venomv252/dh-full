# Validation System Documentation

## Overview

The Emergency Incident Reporting Platform implements comprehensive input validation using Joi schemas and custom sanitization functions. The system provides protection against injection attacks, data corruption, and ensures data integrity across all API endpoints.

## Key Features

- **Joi Schema Validation** - Comprehensive data validation with custom extensions
- **Input Sanitization** - Protection against XSS, SQL injection, and other attacks
- **Type Coercion** - Automatic type conversion and normalization
- **Error Standardization** - Consistent error responses across all endpoints
- **Reusable Components** - Pre-configured validators for common use cases

## Architecture

### Validation Flow
```
Request → Sanitization → Schema Validation → Type Coercion → Controller
```

### Components
1. **Sanitization Functions** - Clean and normalize input data
2. **Joi Schemas** - Define validation rules and constraints
3. **Validation Middleware** - Apply validation to Express routes
4. **Error Handling** - Standardized error responses

## Sanitization Functions

### String Sanitization
```javascript
const { sanitize } = require('./middleware/validation');

// Remove HTML tags, scripts, and dangerous content
const cleanString = sanitize.string('<script>alert("xss")</script>Hello');
// Result: "Hello"
```

#### Features:
- Removes HTML/XML tags
- Strips JavaScript injections
- Removes SQL injection patterns
- Trims whitespace
- Limits string length (10,000 chars max)

### Email Sanitization
```javascript
const cleanEmail = sanitize.email('TEST@EXAMPLE.COM');
// Result: "test@example.com"
```

#### Features:
- Converts to lowercase
- Removes dangerous characters
- Preserves valid email characters
- Limits length (254 chars max)

### Phone Sanitization
```javascript
const cleanPhone = sanitize.phone('+1 (555) 123-4567 ext 123');
// Result: "+1 555 123-4567  123"
```

#### Features:
- Keeps only digits, +, -, and spaces
- Removes invalid characters
- Limits length (20 chars max)

### URL Sanitization
```javascript
const cleanUrl = sanitize.url('https://example.com/path');
// Result: "https://example.com/path"

const invalidUrl = sanitize.url('javascript:alert("xss")');
// Result: ""
```

#### Features:
- Only allows HTTP/HTTPS protocols
- Validates URL format
- Limits length (2048 chars max)
- Returns empty string for invalid URLs

## Joi Schema Validation

### Custom Extensions

#### GeoCoordinates Validation
```javascript
const { customJoi } = require('./middleware/validation');

const schema = customJoi.object({
  location: customJoi.geoCoordinates().required()
});

// Valid: [-122.4194, 37.7749] (San Francisco)
// Invalid: [-200, 37.7749] (longitude out of range)
```

### Common Schema Components

#### ObjectId Validation
```javascript
const { schemas } = require('./middleware/validation');

const schema = schemas.common.objectId;
// Validates MongoDB ObjectId format (24 hex characters)
```

#### Email Validation
```javascript
const emailSchema = schemas.common.email;
// Validates email format with sanitization
```

#### Pagination Validation
```javascript
const paginationSchema = schemas.common.pagination;
// Validates page (min: 1) and limit (min: 1, max: 100)
```

## Pre-configured Validators

### User Validators

#### User Registration
```javascript
const { validators } = require('./middleware/validation');

app.post('/api/user/register', validators.user.register, (req, res) => {
  // req.body is validated and sanitized
  res.json({ success: true });
});
```

**Validates:**
- Personal information (name, DOB, gender)
- Contact details (email, phone)
- Address information
- Medical information (optional)
- Emergency contacts (optional)
- Vehicle information (optional)
- Insurance details (optional)

#### User Profile Update
```javascript
app.put('/api/user/profile', validators.user.updateProfile, (req, res) => {
  // Partial update validation
});
```

### Incident Validators

#### Incident Creation
```javascript
app.post('/api/incidents', validators.incident.create, (req, res) => {
  // Validates incident data with geolocation
});
```

**Validates:**
- Title and description (with sanitization)
- Incident type (enum validation)
- GeoJSON location coordinates
- Media attachments (optional)
- Reporter information (user/guest)

#### Incident Query
```javascript
app.get('/api/incidents', validators.incident.query, (req, res) => {
  // Validates query parameters with defaults
});
```

**Validates:**
- Pagination parameters
- Filtering options (type, status)
- Geospatial query parameters
- Date range filtering
- Sorting options

#### Incident Upvoting
```javascript
app.post('/api/incidents/:id/upvote', validators.incident.upvote, (req, res) => {
  // Validates upvote data
});
```

### Admin Validators

#### Admin Incident Query
```javascript
app.get('/api/admin/incidents', validators.admin.incidentQuery, (req, res) => {
  // Enhanced query validation for admins
});
```

### Common Validators

#### ObjectId Parameter
```javascript
app.get('/api/incidents/:id', validators.common.objectId, (req, res) => {
  // Validates :id parameter as ObjectId
});
```

## Custom Validation Middleware

### Single Source Validation

#### Body Validation
```javascript
const { validateBody, schemas } = require('./middleware/validation');

app.post('/api/custom', validateBody(schemas.user.register), (req, res) => {
  // Only validates request body
});
```

#### Query Validation
```javascript
const { validateQuery, schemas } = require('./middleware/validation');

app.get('/api/custom', validateQuery(schemas.common.pagination), (req, res) => {
  // Only validates query parameters
});
```

#### Parameter Validation
```javascript
const { validateParams, schemas } = require('./middleware/validation');

app.get('/api/custom/:id', validateParams(schemas.common.objectId), (req, res) => {
  // Only validates URL parameters
});
```

### Multi-Source Validation
```javascript
const { validate, schemas } = require('./middleware/validation');

app.post('/api/incidents/:id/update', 
  validate({
    params: schemas.common.objectId,
    body: schemas.incident.update,
    query: schemas.common.pagination
  }),
  (req, res) => {
    // Validates params, body, and query simultaneously
  }
);
```

### Custom Schema Creation
```javascript
const Joi = require('joi');
const { createValidationMiddleware } = require('./middleware/validation');

const customSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  age: Joi.number().integer().min(0).max(150).required()
});

const customValidator = createValidationMiddleware(customSchema, 'body');

app.post('/api/custom', customValidator, (req, res) => {
  // Uses custom schema
});
```

## Error Responses

### Validation Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "\"email\" must be a valid email",
          "value": "invalid-email"
        },
        {
          "field": "phone",
          "message": "Phone number must be in international format (+1234567890)",
          "value": "123-456-7890"
        }
      ],
      "errorCount": 2
    }
  },
  "timestamp": "2024-01-01T15:30:00.000Z"
}
```

### Field-Specific Errors

#### Required Field Missing
```json
{
  "field": "email",
  "message": "\"email\" is required"
}
```

#### Invalid Format
```json
{
  "field": "phone",
  "message": "Phone number must be in international format (+1234567890)",
  "value": "123-456-7890"
}
```

#### Out of Range
```json
{
  "field": "geoLocation.coordinates",
  "message": "Longitude must be between -180 and 180",
  "value": [-200, 37.7749]
}
```

## Schema Definitions

### User Registration Schema
```javascript
{
  fullName: Joi.string().min(2).max(100).required(),
  dob: Joi.date().iso().required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  phone: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
  email: Joi.string().email().required(),
  address: {
    street: Joi.string().min(5).max(200).required(),
    city: Joi.string().min(2).max(100).required(),
    state: Joi.string().min(2).max(100).required(),
    pincode: Joi.string().pattern(/^\d{4,10}$/).required()
  },
  // Optional fields...
}
```

### Incident Creation Schema
```javascript
{
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().min(10).max(2000).required(),
  type: Joi.string().valid('Accident', 'Fire', 'Medical', 'Natural Disaster', 'Crime', 'Other').required(),
  geoLocation: {
    type: Joi.string().valid('Point').default('Point'),
    coordinates: customJoi.geoCoordinates().required()
  },
  media: Joi.array().items({
    type: Joi.string().valid('image', 'video').required(),
    url: Joi.string().uri().required()
  }).max(10),
  reportedBy: {
    userType: Joi.string().valid('user', 'guest').required(),
    userId: Joi.when('userType', {
      is: 'user',
      then: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      otherwise: Joi.forbidden()
    }),
    guestId: Joi.when('userType', {
      is: 'guest', 
      then: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      otherwise: Joi.forbidden()
    })
  }
}
```

## Implementation Examples

### Basic Route Validation
```javascript
const express = require('express');
const { validators } = require('./middleware/validation');

const app = express();

// User registration with validation
app.post('/api/user/register', validators.user.register, async (req, res) => {
  try {
    // req.body is validated and sanitized
    const user = await User.create(req.body);
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Incident creation with validation
app.post('/api/incidents', validators.incident.create, async (req, res) => {
  try {
    const incident = await Incident.create(req.body);
    res.status(201).json({ success: true, incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Custom Validation Chain
```javascript
const { validate, schemas } = require('./middleware/validation');
const { authenticate, requireAuth } = require('./middleware/auth');
const { rateLimiters } = require('./middleware/rateLimiter');

app.post('/api/incidents/:id/upvote',
  // Apply middleware in order
  rateLimiters.upvoting,           // Rate limiting
  authenticate,                    // Authentication
  requireAuth,                     // Require authentication
  validate({                       // Validation
    params: schemas.common.objectId,
    body: schemas.incident.upvote
  }),
  async (req, res) => {
    // All validation passed
    const { id } = req.params;
    const upvoteData = req.body;
    
    // Process upvote...
  }
);
```

### Conditional Validation
```javascript
const Joi = require('joi');

const conditionalSchema = Joi.object({
  userType: Joi.string().valid('user', 'guest').required(),
  
  // Conditional validation based on userType
  userData: Joi.when('userType', {
    is: 'user',
    then: Joi.object({
      userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      email: Joi.string().email().required()
    }).required(),
    otherwise: Joi.object({
      guestId: Joi.string().required(),
      sessionId: Joi.string().required()
    }).required()
  })
});
```

## Security Considerations

### XSS Prevention
- All string inputs are sanitized to remove HTML tags
- JavaScript injections are stripped
- Event handlers are removed

### SQL Injection Prevention
- Dangerous SQL characters are removed
- Input length is limited
- Type validation prevents injection vectors

### Data Integrity
- Type coercion ensures consistent data types
- Range validation prevents invalid values
- Required field validation ensures completeness

### Performance Optimization
- Validation occurs early in request pipeline
- Sanitization is efficient and non-blocking
- Schema compilation is cached

## Best Practices

### 1. Layer Validation
```javascript
// Apply validation after authentication but before business logic
app.post('/api/endpoint',
  authenticate,           // 1. Authentication
  rateLimiter,           // 2. Rate limiting
  validators.endpoint,   // 3. Validation
  businessLogic         // 4. Business logic
);
```

### 2. Use Pre-configured Validators
```javascript
// Preferred: Use pre-configured validators
app.post('/api/user/register', validators.user.register, handler);

// Avoid: Creating custom schemas for common patterns
app.post('/api/user/register', validateBody(customUserSchema), handler);
```

### 3. Handle Validation Errors Gracefully
```javascript
app.post('/api/endpoint', validators.common.objectId, (req, res) => {
  // Validation middleware handles errors automatically
  // This handler only runs if validation passes
});
```

### 4. Sanitize Before Validation
```javascript
// Sanitization is built into schemas
const schema = Joi.object({
  name: Joi.string().custom((value, helpers) => sanitize.string(value))
});
```

## Testing

### Unit Tests
```javascript
const { sanitize, validators } = require('./middleware/validation');

describe('Validation', () => {
  test('should sanitize XSS attempts', () => {
    const input = '<script>alert("xss")</script>Hello';
    const result = sanitize.string(input);
    expect(result).toBe('Hello');
  });
  
  test('should validate user registration', async () => {
    const response = await request(app)
      .post('/api/user/register')
      .send(validUserData);
    
    expect(response.status).toBe(200);
  });
});
```

### Integration Tests
```javascript
describe('API Validation', () => {
  test('should reject invalid incident data', async () => {
    const response = await request(app)
      .post('/api/incidents')
      .send({ title: 'x' }); // Too short
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Validation Passing Invalid Data
```javascript
// Check if sanitization is working
console.log('Before:', req.body);
// Apply validator
console.log('After:', req.body);
```

#### 2. Custom Schema Not Working
```javascript
// Ensure proper Joi syntax
const schema = Joi.object({
  field: Joi.string().required() // Don't forget .required()
});
```

#### 3. Conditional Validation Issues
```javascript
// Use Joi.when() for conditional validation
const schema = Joi.object({
  type: Joi.string().valid('A', 'B').required(),
  data: Joi.when('type', {
    is: 'A',
    then: Joi.string().required(),
    otherwise: Joi.number().required()
  })
});
```

### Debugging Validation
```javascript
// Enable detailed Joi errors
const { error, value } = schema.validate(data, {
  abortEarly: false,  // Get all errors
  allowUnknown: false, // Strict validation
  debug: true         // Enable debug mode
});

if (error) {
  console.log('Validation errors:', error.details);
}
```

## Performance Considerations

### Schema Compilation
- Joi schemas are compiled once and reused
- Pre-configured validators are more efficient
- Avoid creating schemas in request handlers

### Sanitization Overhead
- Sanitization adds ~1-2ms per request
- String operations are optimized
- Length limits prevent DoS attacks

### Memory Usage
- Validation middleware has minimal memory footprint
- Sanitized data replaces original data
- No additional memory allocation for valid requests

## Future Enhancements

### Planned Features
1. **Dynamic Validation** - Runtime schema modification
2. **Async Validation** - Database uniqueness checks
3. **Custom Validators** - Domain-specific validation rules
4. **Validation Caching** - Cache validation results
5. **Enhanced Sanitization** - More sophisticated cleaning algorithms