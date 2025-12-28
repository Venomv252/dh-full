# Rate Limiting Documentation

## Overview

The Emergency Incident Reporting Platform implements comprehensive rate limiting to prevent abuse and ensure fair resource usage. The system provides different rate limits based on user roles and endpoint sensitivity.

## Rate Limiting Strategy

### Role-Based Rate Limits

Different user types receive different rate limits based on their trust level and typical usage patterns:

| User Type | Requests/15min | Use Case |
|-----------|----------------|----------|
| **Guest** | 50 | Anonymous users with limited actions |
| **User** | 200 | Registered users with full access |
| **Hospital** | 500 | Emergency services requiring higher limits |
| **Admin** | 1000 | Administrative users with system access |
| **Unauthenticated** | 20 | No authentication provided |

### Endpoint-Specific Limits

Sensitive operations have additional restrictions:

#### Authentication Endpoints
- **Limit**: 5 attempts per 15 minutes
- **Purpose**: Prevent brute force attacks
- **Applies to**: Login, token refresh

#### Registration Endpoints
- **Limit**: 3 registrations per hour per IP
- **Purpose**: Prevent spam registrations
- **Applies to**: User registration, guest creation

#### Incident Creation
- **Guest**: 2 incidents per 5 minutes
- **User**: 10 incidents per 5 minutes
- **Hospital**: 50 incidents per 5 minutes
- **Admin**: 100 incidents per 5 minutes

#### Upvoting
- **Guest**: 5 upvotes per minute
- **User**: 20 upvotes per minute
- **Hospital**: 50 upvotes per minute
- **Admin**: 100 upvotes per minute

## Implementation

### Basic Usage

```javascript
const { rateLimiters } = require('./middleware/rateLimiter');

// Apply general API rate limiting
app.use('/api', rateLimiters.api);

// Apply authentication rate limiting
app.post('/api/auth/login', rateLimiters.auth, loginController);

// Apply incident creation rate limiting
app.post('/api/incidents', rateLimiters.incidentCreation, createIncident);
```

### Custom Rate Limiters

#### Role-Based Limiter
```javascript
const { createRoleBasedLimiter } = require('./middleware/rateLimiter');

// Create custom role-based limiter
const customLimiter = createRoleBasedLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // Override default limits
  message: 'Custom rate limit message'
});

app.use('/api/custom', customLimiter);
```

#### Endpoint-Specific Limiter
```javascript
const { createEndpointLimiter } = require('./middleware/rateLimiter');

// Create custom endpoint limiter
const customEndpointLimiter = createEndpointLimiter('incidentCreation', {
  windowMs: 2 * 60 * 1000, // 2 minutes
  message: 'Too many incidents created'
});

app.post('/api/incidents/urgent', customEndpointLimiter, createUrgentIncident);
```

## Rate Limiting Keys

The system uses intelligent key generation for rate limiting:

### Key Types
- **User**: `user:{userId}` - Per registered user
- **Guest**: `guest:{guestId}` - Per guest session
- **IP**: `ip:{ipAddress}` - Per IP address (fallback)

### Key Selection Logic
1. If authenticated user → use user ID
2. If authenticated guest → use guest ID
3. Otherwise → use IP address

## Response Headers

Rate limit information is included in response headers:

### Standard Headers
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 199
X-RateLimit-Reset: 1640995200
```

### Custom Headers
```
X-RateLimit-UserType: user
X-RateLimit-Policy: user-200-900000ms
X-RateLimit-Window: 900000
X-RateLimit-Max: 200
X-RateLimit-Reset: 2024-01-01T15:30:00.000Z
```

## Error Responses

### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "details": {
      "userType": "user",
      "windowMs": 900000,
      "maxRequests": 200,
      "retryAfter": 900,
      "suggestion": "Please wait before making more requests"
    }
  },
  "timestamp": "2024-01-01T15:30:00.000Z"
}
```

### Guest-Specific Error
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests from guest user. Please register for higher limits.",
    "details": {
      "userType": "guest",
      "windowMs": 900000,
      "maxRequests": 50,
      "retryAfter": 900,
      "suggestion": "Register as a user for higher limits"
    }
  },
  "timestamp": "2024-01-01T15:30:00.000Z"
}
```

## Configuration

### Environment Variables
```bash
# Redis configuration (optional, for production scaling)
REDIS_URL=redis://localhost:6379

# Rate limiting configuration
RATE_LIMIT_SKIP_FAILED_REQUESTS=true
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false
```

### Production Scaling

For production environments with multiple servers, use Redis store:

```javascript
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

// Use Redis store for rate limiting
const limiter = createRoleBasedLimiter({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:' // Rate limit prefix
  })
});
```

## Pre-configured Rate Limiters

### Available Limiters

```javascript
const { rateLimiters } = require('./middleware/rateLimiter');

// General API rate limiting (role-based)
rateLimiters.api

// Authentication endpoints (5 attempts/15min)
rateLimiters.auth

// Registration endpoints (3 attempts/hour)
rateLimiters.registration

// Incident creation (role-specific limits)
rateLimiters.incidentCreation

// Upvoting (role-specific limits)
rateLimiters.upvoting

// Global rate limiting (1000 requests/15min per IP)
rateLimiters.global

// Strict rate limiting (5 requests/hour)
rateLimiters.strict

// Burst rate limiting (30 requests/minute)
rateLimiters.burst
```

### Usage Examples

```javascript
const express = require('express');
const { rateLimiters } = require('./middleware/rateLimiter');
const { authenticate } = require('./middleware/auth');

const app = express();

// Apply global rate limiting first
app.use(rateLimiters.global);

// Apply authentication
app.use('/api', authenticate);

// Apply API rate limiting after authentication
app.use('/api', rateLimiters.api);

// Specific endpoint rate limiting
app.post('/api/auth/login', rateLimiters.auth, loginController);
app.post('/api/user/register', rateLimiters.registration, registerController);
app.post('/api/incidents', rateLimiters.incidentCreation, createIncidentController);
app.post('/api/incidents/:id/upvote', rateLimiters.upvoting, upvoteController);

// Strict rate limiting for sensitive operations
app.post('/api/admin/reset-password', rateLimiters.strict, resetPasswordController);
```

## Skip Conditions

Rate limiting is automatically skipped for:

1. **Test Environment**: When `NODE_ENV=test`
2. **Health Checks**: `/health` and `/ping` endpoints
3. **Custom Skip Logic**: Configurable per limiter

### Custom Skip Logic
```javascript
const customLimiter = createRoleBasedLimiter({
  skip: (req) => {
    // Skip for admin users on admin endpoints
    return req.user?.role === 'admin' && req.path.startsWith('/api/admin/');
  }
});
```

## Monitoring and Analytics

### Rate Limit Status
```javascript
const { getRateLimitStatus } = require('./middleware/rateLimiter');

app.get('/api/rate-limit-status', authenticate, (req, res) => {
  const status = getRateLimitStatus(req);
  res.json(status);
});
```

### Response Format
```json
{
  "userType": "user",
  "windowMs": 900000,
  "maxRequests": 200,
  "identifier": "user:12345",
  "resetTime": "2024-01-01T15:30:00.000Z"
}
```

### Logging Rate Limit Violations
```javascript
// Rate limit violations are automatically logged
console.warn('Rate limit exceeded for user (user:12345) on POST /api/incidents');
```

## Best Practices

### 1. Layer Rate Limiting
```javascript
// Apply multiple layers of rate limiting
app.use(rateLimiters.global);           // Global IP-based limiting
app.use('/api', authenticate);          // Authentication
app.use('/api', rateLimiters.api);      // Role-based limiting
app.post('/api/incidents', 
  rateLimiters.incidentCreation,        // Endpoint-specific limiting
  createIncident
);
```

### 2. Provide Clear Error Messages
```javascript
const customLimiter = createRoleBasedLimiter({
  message: 'Too many incident reports. Emergency services have been notified of high activity.'
});
```

### 3. Use Appropriate Windows
- **Short windows** (1-5 minutes) for burst protection
- **Medium windows** (15 minutes) for general API usage
- **Long windows** (1 hour) for sensitive operations

### 4. Monitor and Adjust
- Track rate limit hit rates
- Adjust limits based on usage patterns
- Consider user feedback on restrictive limits

## Security Considerations

### 1. IP-Based Fallback
- Unauthenticated requests use IP-based limiting
- Prevents abuse from multiple anonymous requests

### 2. User-Based Tracking
- Authenticated requests use user/guest IDs
- Prevents circumvention by changing IPs

### 3. Endpoint Sensitivity
- More sensitive operations have stricter limits
- Authentication endpoints have the strictest limits

### 4. Role-Based Privileges
- Higher trust levels receive higher limits
- Emergency services (hospitals) get priority access

## Troubleshooting

### Common Issues

#### 1. Rate Limits Too Restrictive
```javascript
// Increase limits for specific user types
const relaxedLimiter = createRoleBasedLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500 // Increased limit
});
```

#### 2. Shared IP Issues
```javascript
// Use user-based limiting instead of IP-based
const userBasedLimiter = createRoleBasedLimiter({
  keyGenerator: (req) => req.user?.userId || req.ip
});
```

#### 3. Testing Issues
```javascript
// Skip rate limiting in test environment
process.env.NODE_ENV = 'test';
```

### Debugging Rate Limits
```javascript
const { getRateLimitStatus } = require('./middleware/rateLimiter');

// Add debugging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const status = getRateLimitStatus(req);
    console.log('Rate limit status:', status);
  }
  next();
});
```

## Performance Considerations

### 1. Memory Usage
- In-memory store suitable for single server
- Use Redis for multi-server deployments

### 2. Response Time
- Rate limiting adds minimal overhead (~1ms)
- Redis store adds network latency

### 3. Cleanup
- Expired rate limit data is automatically cleaned up
- No manual maintenance required

## Future Enhancements

### Planned Features
1. **Dynamic Rate Limiting** - Adjust limits based on system load
2. **User-Specific Overrides** - Custom limits for specific users
3. **Geographic Rate Limiting** - Different limits by region
4. **Adaptive Limits** - Machine learning-based limit adjustment
5. **Rate Limit Analytics** - Detailed usage analytics and reporting