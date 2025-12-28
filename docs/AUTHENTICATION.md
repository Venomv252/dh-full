# Authentication System Documentation

## Overview

The Emergency Incident Reporting Platform supports dual authentication modes:
1. **JWT Token Authentication** for registered users
2. **Guest ID Authentication** for anonymous users

This flexible system allows both registered users with full access and anonymous guests with limited actions.

## Authentication Methods

### 1. JWT Token Authentication (Registered Users)

#### Token Format
```
Authorization: Bearer <jwt-token>
```

#### Token Structure
```javascript
{
  userId: "user_object_id",
  userType: "user",
  role: "user|admin|hospital",
  email: "user@example.com",
  iat: 1234567890,
  exp: 1234567890
}
```

#### Usage Example
```javascript
// Generate token (typically during login)
const token = generateUserToken(user);

// Use token in requests
const response = await fetch('/api/incidents', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 2. Guest ID Authentication (Anonymous Users)

#### Header Format
```
x-guest-id: <guest-id>
```

#### Guest ID Structure
```
guest_<timestamp>_<random-hex>
Example: guest_1a2b3c4d_f1e2d3c4b5a6
```

#### Usage Example
```javascript
// Create guest user first
const guestResponse = await fetch('/api/guest/create', {
  method: 'POST'
});
const { guestId } = await guestResponse.json();

// Use guest ID in subsequent requests
const response = await fetch('/api/incidents', {
  headers: {
    'x-guest-id': guestId,
    'Content-Type': 'application/json'
  }
});
```

## Middleware Functions

### Core Authentication Middleware

#### `authenticate(req, res, next)`
- **Purpose**: Main authentication middleware
- **Behavior**: 
  - Attempts JWT authentication first
  - Falls back to guest authentication if no JWT
  - Sets `req.user` with authentication context
  - Continues without authentication if neither provided
- **Usage**: Apply to all routes that may need authentication

```javascript
app.use('/api', authenticate);
```

#### `requireAuth(req, res, next)`
- **Purpose**: Requires any form of authentication (user or guest)
- **Behavior**: Rejects requests without valid authentication
- **Usage**: Apply to protected endpoints

```javascript
app.get('/api/incidents', requireAuth, getIncidents);
```

#### `requireUserAuth(req, res, next)`
- **Purpose**: Requires registered user authentication only
- **Behavior**: Rejects guest users and unauthenticated requests
- **Usage**: Apply to user-only endpoints

```javascript
app.get('/api/user/profile', requireUserAuth, getUserProfile);
```

#### `optionalAuth(req, res, next)`
- **Purpose**: Attempts authentication but doesn't require it
- **Behavior**: Sets authentication context if available, continues regardless
- **Usage**: Apply to public endpoints that benefit from user context

```javascript
app.get('/api/incidents/public', optionalAuth, getPublicIncidents);
```

### Specialized Middleware

#### `checkGuestActionLimit(req, res, next)`
- **Purpose**: Enforces guest action limits
- **Behavior**: Blocks guests who have reached their action limit
- **Usage**: Apply to endpoints that consume guest actions

```javascript
app.post('/api/incidents', requireAuth, checkGuestActionLimit, createIncident);
```

## Request Context

After authentication, the following properties are available on `req`:

### Authentication Status
```javascript
req.isAuthenticated  // boolean: true if any authentication succeeded
req.isUser          // boolean: true if JWT user authentication
req.isGuest         // boolean: true if guest authentication
```

### User Context
```javascript
req.user = {
  userType: 'user' | 'guest',
  userId: 'ObjectId',           // Only for users
  guestId: 'guest_xxx_xxx',     // Only for guests
  role: 'user|admin|hospital|guest',
  email: 'user@example.com',    // Only for users
  canPerformAction: boolean,    // Action limit status for guests
  actionCount: number,          // Current actions for guests
  maxActions: number,           // Action limit for guests
  user: UserObject,             // Full user object (users only)
  guest: GuestObject            // Full guest object (guests only)
}
```

## Helper Functions

### `getUserContext(req)`
Extracts standardized user context from request:

```javascript
const context = getUserContext(req);
// Returns:
{
  userType: 'user' | 'guest',
  userId: string | null,
  guestId: string | null,
  role: string,
  canPerformAction: boolean,
  actionCount: number | null,
  maxActions: number | null,
  email: string | null
}
```

### `generateUserToken(user, expiresIn)`
Generates JWT token for user:

```javascript
const token = generateUserToken(user, '24h');
```

### `refreshToken(token)`
Refreshes expired JWT token:

```javascript
const newToken = await refreshToken(oldToken);
```

## Implementation Examples

### Basic Route Protection

```javascript
const express = require('express');
const { authenticate, requireAuth, requireUserAuth } = require('./middleware/auth');

const app = express();

// Apply authentication to all API routes
app.use('/api', authenticate);

// Public endpoint (no auth required)
app.get('/api/incidents/public', getPublicIncidents);

// Protected endpoint (any auth required)
app.get('/api/incidents', requireAuth, getIncidents);

// User-only endpoint
app.get('/api/admin/incidents', requireUserAuth, getAdminIncidents);
```

### Guest Action Tracking

```javascript
const { requireAuth, checkGuestActionLimit } = require('./middleware/auth');

// Endpoint that consumes guest actions
app.post('/api/incidents', requireAuth, checkGuestActionLimit, async (req, res) => {
  // If we reach here, user is authenticated and (if guest) has actions remaining
  
  if (req.isGuest) {
    // Increment guest action count
    await req.user.guest.incrementActionCount();
  }
  
  // Create incident...
});
```

### Role-Based Access Control

```javascript
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.isAuthenticated) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Admin-only endpoint
app.get('/api/admin/users', requireUserAuth, checkRole(['admin']), getUsers);

// Hospital and admin endpoint
app.get('/api/medical/incidents', requireUserAuth, checkRole(['admin', 'hospital']), getMedicalIncidents);
```

## Error Responses

### Authentication Errors

#### Invalid JWT Token (401)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Invalid or expired authentication token",
    "details": { "reason": "Token expired" }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Invalid Guest ID (401)
```json
{
  "success": false,
  "error": {
    "code": "GUEST_NOT_FOUND",
    "message": "Invalid guest ID",
    "details": { "reason": "Guest not found" }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Authentication Required (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_ACCESS",
    "message": "Authentication required. Provide either a valid JWT token or guest ID.",
    "details": {
      "authMethods": [
        "JWT token in Authorization header",
        "Guest ID in x-guest-id header"
      ]
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Guest Action Limit Exceeded (403)
```json
{
  "success": false,
  "error": {
    "code": "GUEST_ACTION_LIMIT_EXCEEDED",
    "message": "Guest user has reached maximum action limit",
    "details": {
      "actionCount": 10,
      "maxActions": 10,
      "suggestion": "Register as a user to continue using the service"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Security Considerations

### JWT Security
- Use strong secret keys (minimum 256 bits)
- Set appropriate expiration times (24h recommended)
- Implement token refresh mechanism
- Store JWT secret in environment variables

### Guest Security
- Guest IDs are not cryptographically secure (by design)
- Guest actions are rate-limited
- Guest data should be cleaned up periodically
- Guest sessions should have reasonable timeouts

### General Security
- Always use HTTPS in production
- Implement rate limiting on authentication endpoints
- Log authentication failures for monitoring
- Validate all input data regardless of authentication status

## Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-256-bit-secret-key-here

# Encryption for sensitive data
ENCRYPTION_KEY=your-encryption-key-here

# Database connection
MONGODB_URI=mongodb://localhost:27017/emergency-platform
```

## Testing

The authentication system includes comprehensive tests:

```bash
# Run authentication tests
npm test src/middleware/__tests__/auth.test.js

# Run all tests
npm test
```

## Future Enhancements

### Planned Features
1. **OAuth Integration** - Social login support
2. **Multi-Factor Authentication** - SMS/Email verification
3. **Session Management** - Active session tracking
4. **Advanced Rate Limiting** - Per-user rate limits
5. **Audit Logging** - Detailed authentication logs

### Migration Path
The current system is designed to be backward-compatible when adding new authentication methods. JWT structure includes version information for future migrations.