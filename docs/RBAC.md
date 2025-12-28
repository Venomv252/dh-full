# Role-Based Access Control (RBAC) Documentation

## Overview

The Emergency Incident Reporting Platform implements a comprehensive Role-Based Access Control (RBAC) system that provides fine-grained permissions for different user types and resources. The system ensures that users can only access resources and perform actions appropriate to their role and authorization level.

## User Roles

### Role Hierarchy
```
Admin > Hospital > User > Guest
```

### Role Definitions

#### Guest (`guest`)
- **Description**: Anonymous users with limited actions
- **Capabilities**: Basic incident reporting and viewing
- **Limitations**: 10 actions per session, restricted feature access
- **Use Case**: Emergency situations requiring immediate reporting

#### User (`user`) 
- **Description**: Registered users with full platform access
- **Capabilities**: Full incident management, profile management
- **Limitations**: Cannot perform administrative functions
- **Use Case**: Regular platform users and incident reporters

#### Hospital (`hospital`)
- **Description**: Healthcare facility users with medical access
- **Capabilities**: Medical incident access, patient data, emergency alerts
- **Limitations**: Cannot perform system administration
- **Use Case**: Emergency services and healthcare providers

#### Admin (`admin`)
- **Description**: System administrators with full access
- **Capabilities**: All system functions, user management, configuration
- **Limitations**: None (highest privilege level)
- **Use Case**: Platform administrators and system managers

## Permission Matrix

### User Management
| Action | Guest | User | Hospital | Admin |
|--------|-------|------|----------|-------|
| Create | ❌ | ❌ | ❌ | ✅ |
| Read (Own) | ❌ | ✅ | ✅ | ✅ |
| Update (Own) | ❌ | ✅ | ❌ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| List All | ❌ | ❌ | ❌ | ✅ |
| Register | ✅ | ✅ | ✅ | ✅ |

### Incident Management
| Action | Guest | User | Hospital | Admin |
|--------|-------|------|----------|-------|
| Create | ✅ | ✅ | ✅ | ✅ |
| Read | ✅ | ✅ | ✅ | ✅ |
| Update | ❌ | ❌ | ✅ | ✅ |
| Delete | ❌ | ❌ | ❌ | ✅ |
| List | ✅ | ✅ | ✅ | ✅ |
| Upvote | ✅ | ✅ | ✅ | ✅ |
| Verify | ❌ | ❌ | ✅ | ✅ |
| Resolve | ❌ | ❌ | ✅ | ✅ |

### Administrative Functions
| Action | Guest | User | Hospital | Admin |
|--------|-------|------|----------|-------|
| Dashboard | ❌ | ❌ | ❌ | ✅ |
| Statistics | ❌ | ❌ | ✅ | ✅ |
| Reports | ❌ | ❌ | ✅ | ✅ |
| User Management | ❌ | ❌ | ❌ | ✅ |
| System Config | ❌ | ❌ | ❌ | ✅ |
| Audit Logs | ❌ | ❌ | ❌ | ✅ |

### Hospital-Specific Functions
| Action | Guest | User | Hospital | Admin |
|--------|-------|------|----------|-------|
| Medical Incidents | ❌ | ❌ | ✅ | ✅ |
| Patient Data | ❌ | ❌ | ✅ | ❌ |
| Emergency Alerts | ❌ | ❌ | ✅ | ✅ |
| Resource Management | ❌ | ❌ | ✅ | ❌ |

## Guest User Restrictions

### Action Limits
- **Maximum Actions**: 10 per session
- **Action Types**: Create incident, upvote, read data
- **Enforcement**: Automatic blocking when limit reached
- **Reset**: New guest session required

### Allowed Actions
```javascript
[
  'incidents.create',
  'incidents.read', 
  'incidents.list',
  'incidents.upvote',
  'guests.read',
  'guests.update'
]
```

### Restricted Actions
```javascript
[
  'incidents.update',
  'incidents.delete',
  'incidents.verify',
  'incidents.resolve',
  'admin.*',        // All admin functions
  'hospital.*',     // All hospital functions
  'users.*'         // All user management
]
```

## Implementation

### Basic Role Checking

#### Resource-Action Based
```javascript
const { requireRole } = require('./middleware/roleCheck');

// Require specific permission for resource and action
app.post('/api/incidents', 
  requireRole('incidents', 'create'),
  createIncidentController
);

app.delete('/api/incidents/:id',
  requireRole('incidents', 'delete'),
  deleteIncidentController
);
```

#### Role-Based
```javascript
const { requireRoles, requireAdmin } = require('./middleware/roleCheck');

// Require specific roles
app.get('/api/admin/dashboard',
  requireRoles([USER_ROLES.ADMIN]),
  adminDashboardController
);

// Shorthand for admin-only
app.get('/api/admin/users',
  requireAdmin,
  userManagementController
);
```

### Pre-configured Role Checkers

#### Incident Management
```javascript
const { roleCheckers } = require('./middleware/roleCheck');

// Use pre-configured checkers
app.post('/api/incidents', roleCheckers.incidents.create, createIncident);
app.put('/api/incidents/:id', roleCheckers.incidents.update, updateIncident);
app.delete('/api/incidents/:id', roleCheckers.incidents.delete, deleteIncident);
app.post('/api/incidents/:id/upvote', roleCheckers.incidents.upvote, upvoteIncident);
```

#### User Management
```javascript
app.get('/api/users/:id', roleCheckers.users.read, getUserProfile);
app.put('/api/users/:id', roleCheckers.users.update, updateUserProfile);
app.delete('/api/users/:id', roleCheckers.users.delete, deleteUser);
```

#### Admin Functions
```javascript
app.get('/api/admin/dashboard', roleCheckers.admin.dashboard, adminDashboard);
app.get('/api/admin/statistics', roleCheckers.admin.statistics, getStatistics);
app.get('/api/admin/users', roleCheckers.admin.userManagement, manageUsers);
```

### Advanced Access Control

#### Ownership-Based Access
```javascript
const { requireOwnership } = require('./middleware/roleCheck');

// Users can only access their own resources
app.get('/api/users/:id', 
  requireOwnership('users'),
  getUserProfile
);

// Guests can only access their own session data
app.get('/api/guests/:id',
  requireOwnership('guests'), 
  getGuestData
);
```

#### Multi-Role Access
```javascript
const { requireHospitalOrAdmin } = require('./middleware/roleCheck');

// Allow both hospital and admin users
app.get('/api/medical/incidents',
  requireHospitalOrAdmin,
  getMedicalIncidents
);
```

#### Registered Users Only
```javascript
const { requireRegisteredUser } = require('./middleware/roleCheck');

// Block guest users from certain features
app.post('/api/users/profile/update',
  requireRegisteredUser,
  updateProfile
);
```

### Permission Context

After successful authorization, middleware sets permission context:

```javascript
app.post('/api/incidents/:id/update',
  requireRole('incidents', 'update'),
  (req, res) => {
    // Access permission context
    console.log(req.permissions);
    /*
    {
      resource: 'incidents',
      action: 'update', 
      userRole: 'admin',
      isGuest: false,
      canAdmin: true
    }
    */
  }
);
```

### Permission Checking Utilities

#### Check User Permissions
```javascript
const { getUserPermissions } = require('./middleware/roleCheck');

app.get('/api/incidents', (req, res) => {
  const permissions = getUserPermissions(req, 'incidents');
  
  res.json({
    incidents: await getIncidents(),
    permissions: {
      canCreate: permissions.canWrite,
      canUpdate: permissions.canWrite && permissions.canAdmin,
      canDelete: permissions.canDelete,
      isGuest: permissions.isGuest,
      actionsRemaining: permissions.isGuest ? 
        permissions.maxActions - permissions.actionCount : null
    }
  });
});
```

#### Add Permission Headers
```javascript
const { addPermissionHeaders } = require('./middleware/roleCheck');

app.get('/api/incidents',
  addPermissionHeaders('incidents'),
  (req, res) => {
    // Response includes permission headers:
    // X-User-Role: user
    // X-Can-Read: true
    // X-Can-Write: true
    // X-Can-Delete: false
    // X-Can-Admin: false
    // X-Guest-Actions: 5/10 (for guests)
  }
);
```

## Error Responses

### Insufficient Permissions (403)
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions to access this resource",
    "details": {
      "resource": "users",
      "action": "delete",
      "userRole": "user",
      "requiredRoles": ["admin"]
    }
  },
  "timestamp": "2024-01-01T15:30:00.000Z"
}
```

### Guest Action Limit Exceeded (403)
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
  "timestamp": "2024-01-01T15:30:00.000Z"
}
```

### Authentication Required (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_ACCESS",
    "message": "Authentication required to access this resource",
    "details": {
      "resource": "incidents",
      "action": "create",
      "required": "Valid authentication (user or guest)"
    }
  },
  "timestamp": "2024-01-01T15:30:00.000Z"
}
```

### Registered User Required (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED_ACCESS",
    "message": "Registered user account required",
    "details": {
      "provided": "guest",
      "required": "registered user"
    }
  },
  "timestamp": "2024-01-01T15:30:00.000Z"
}
```

## Implementation Examples

### Complete Route Protection
```javascript
const express = require('express');
const { authenticate } = require('./middleware/auth');
const { rateLimiters } = require('./middleware/rateLimiter');
const { validators } = require('./middleware/validation');
const { roleCheckers } = require('./middleware/roleCheck');

const app = express();

// Apply middleware in correct order
app.post('/api/incidents',
  rateLimiters.incidentCreation,    // 1. Rate limiting
  authenticate,                     // 2. Authentication
  validators.incident.create,       // 3. Validation
  roleCheckers.incidents.create,    // 4. Authorization
  createIncidentController          // 5. Business logic
);
```

### Admin Dashboard with Multiple Protections
```javascript
app.get('/api/admin/dashboard',
  rateLimiters.api,                 // Rate limiting
  authenticate,                     // Authentication
  requireAdmin,                     // Admin role required
  addPermissionHeaders('admin'),    // Add permission headers
  async (req, res) => {
    const dashboardData = await getDashboardData();
    res.json({
      success: true,
      data: dashboardData,
      permissions: getUserPermissions(req, 'admin')
    });
  }
);
```

### Hospital Medical Data Access
```javascript
app.get('/api/medical/incidents',
  authenticate,
  requireHospitalOrAdmin,
  validators.admin.incidentQuery,
  async (req, res) => {
    // Only hospital and admin users can access medical data
    const medicalIncidents = await getMedicalIncidents(req.query);
    res.json({
      success: true,
      incidents: medicalIncidents,
      userRole: req.user.role
    });
  }
);
```

### Guest User Incident Creation
```javascript
app.post('/api/incidents',
  rateLimiters.incidentCreation,
  authenticate,
  validators.incident.create,
  roleCheckers.incidents.create,    // Handles guest restrictions
  async (req, res) => {
    // If we reach here, guest has actions remaining
    const incident = await createIncident(req.body);
    
    // Increment guest action count if applicable
    if (req.isGuest) {
      await req.user.guest.incrementActionCount();
    }
    
    res.status(201).json({
      success: true,
      incident,
      actionsRemaining: req.isGuest ? 
        req.user.maxActions - req.user.actionCount - 1 : null
    });
  }
);
```

## Custom Permission Logic

### Dynamic Permission Checking
```javascript
const { hasPermission } = require('./middleware/roleCheck');

app.get('/api/incidents/:id', async (req, res) => {
  const incident = await getIncident(req.params.id);
  
  // Check if user can update this specific incident
  const canUpdate = hasPermission(req.user.role, 'incidents', 'update') ||
                   (incident.reportedBy.userId === req.user.userId);
  
  res.json({
    incident,
    permissions: {
      canUpdate,
      canDelete: hasPermission(req.user.role, 'incidents', 'delete')
    }
  });
});
```

### Conditional Access Based on Data
```javascript
app.get('/api/incidents/:id/medical-data',
  authenticate,
  async (req, res) => {
    const incident = await getIncident(req.params.id);
    
    // Only allow access to medical data for medical incidents
    if (incident.type !== 'Medical') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Medical data only available for medical incidents'
        }
      });
    }
    
    // Check hospital or admin role
    if (!hasPermission(req.user.role, 'hospital', 'medicalIncidents')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Hospital or admin role required for medical data'
        }
      });
    }
    
    const medicalData = await getMedicalData(incident.id);
    res.json({ success: true, data: medicalData });
  }
);
```

## Best Practices

### 1. Layer Security Checks
```javascript
// Apply multiple layers of security
app.post('/api/sensitive-action',
  rateLimiters.strict,              // Rate limiting
  authenticate,                     // Authentication
  requireRegisteredUser,            // No guests
  requireAdmin,                     // Admin only
  validators.sensitiveAction,       // Input validation
  sensitiveActionController         // Business logic
);
```

### 2. Use Pre-configured Checkers
```javascript
// Preferred: Use pre-configured role checkers
app.post('/api/incidents', roleCheckers.incidents.create, handler);

// Avoid: Manual permission checking in every route
app.post('/api/incidents', (req, res, next) => {
  if (!hasPermission(req.user.role, 'incidents', 'create')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}, handler);
```

### 3. Provide Clear Error Messages
```javascript
// Good: Specific error with helpful details
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Hospital or admin role required for medical data access",
    "details": {
      "userRole": "user",
      "requiredRoles": ["hospital", "admin"],
      "suggestion": "Contact your administrator for role upgrade"
    }
  }
}
```

### 4. Check Permissions in UI
```javascript
// Frontend can check permissions before showing UI elements
fetch('/api/user/permissions')
  .then(response => response.json())
  .then(permissions => {
    if (permissions.canDelete) {
      showDeleteButton();
    }
    if (permissions.isGuest) {
      showRegistrationPrompt();
    }
  });
```

## Security Considerations

### 1. Defense in Depth
- Multiple layers of security checks
- Authentication before authorization
- Input validation after authorization
- Rate limiting to prevent abuse

### 2. Principle of Least Privilege
- Users get minimum necessary permissions
- Guest users have strict limitations
- Role escalation requires explicit grants

### 3. Fail Secure
- Default deny for undefined permissions
- Explicit allow lists for actions
- Graceful degradation for edge cases

### 4. Audit and Monitoring
- Log all permission checks
- Monitor failed authorization attempts
- Track guest user action patterns

## Testing

### Unit Tests
```javascript
const { hasPermission, guestCanPerformAction } = require('./middleware/roleCheck');

describe('RBAC', () => {
  test('should allow admin to delete users', () => {
    expect(hasPermission('admin', 'users', 'delete')).toBe(true);
  });
  
  test('should deny guest admin access', () => {
    expect(guestCanPerformAction('admin', 'dashboard')).toBe(false);
  });
});
```

### Integration Tests
```javascript
describe('API Authorization', () => {
  test('should allow incident creation for authenticated users', async () => {
    const response = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${userToken}`)
      .send(incidentData);
    
    expect(response.status).toBe(201);
  });
  
  test('should deny admin access to regular users', async () => {
    const response = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(403);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. Permission Denied for Valid User
```javascript
// Check if user role is correctly set
console.log('User role:', req.user.role);
console.log('Required permissions:', PERMISSIONS.resource.action);
```

#### 2. Guest Actions Not Working
```javascript
// Check guest action count and limits
console.log('Guest actions:', req.user.actionCount, '/', req.user.maxActions);
console.log('Can perform action:', req.user.canPerformAction);
```

#### 3. Ownership Check Failing
```javascript
// Verify ownership logic
console.log('Resource ID:', req.params.id);
console.log('User ID:', req.user.userId);
console.log('Is owner:', await checkOwnership(req, req.params.id));
```

### Debugging RBAC
```javascript
// Add debugging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('RBAC Debug:', {
      path: req.path,
      method: req.method,
      isAuthenticated: req.isAuthenticated,
      userRole: req.user?.role,
      isGuest: req.isGuest
    });
  }
  next();
});
```

## Future Enhancements

### Planned Features
1. **Dynamic Permissions** - Runtime permission modification
2. **Resource-Level Permissions** - Per-resource access control
3. **Time-Based Permissions** - Temporary access grants
4. **Hierarchical Roles** - Role inheritance and delegation
5. **Permission Caching** - Performance optimization for frequent checks