/**
 * Role-Based Access Control (RBAC) Middleware Tests
 * Tests for permission checking and role-based access control
 */

const request = require('supertest');
const express = require('express');
const { 
  requireRole,
  requireRoles,
  requireAdmin,
  requireHospitalOrAdmin,
  requireRegisteredUser,
  requireOwnership,
  hasPermission,
  getUserPermissions,
  guestCanPerformAction,
  roleCheckers,
  PERMISSIONS,
  GUEST_RESTRICTIONS
} = require('../roleCheck');
const { USER_ROLES, USER_TYPES, ERROR_CODES } = require('../../config/constants');

// Mock authentication middleware for testing
const mockAuth = (userType, role = null, actionCount = 0, maxActions = 10) => {
  return (req, res, next) => {
    if (userType === 'user') {
      req.isAuthenticated = true;
      req.isUser = true;
      req.isGuest = false;
      req.user = {
        userId: 'test-user-id',
        userType: USER_TYPES.USER,
        role: role || USER_ROLES.USER,
        email: 'test@example.com'
      };
    } else if (userType === 'guest') {
      req.isAuthenticated = true;
      req.isUser = false;
      req.isGuest = true;
      req.user = {
        guestId: 'test-guest-id',
        userType: USER_TYPES.GUEST,
        role: USER_ROLES.GUEST,
        actionCount,
        maxActions,
        canPerformAction: actionCount < maxActions
      };
    } else {
      req.isAuthenticated = false;
      req.isUser = false;
      req.isGuest = false;
      req.user = null;
    }
    next();
  };
};

describe('Role-Based Access Control Middleware', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('hasPermission function', () => {
    test('should grant permission for valid role and action', () => {
      const result = hasPermission(USER_ROLES.ADMIN, 'users', 'delete');
      expect(result).toBe(true);
    });

    test('should deny permission for invalid role and action', () => {
      const result = hasPermission(USER_ROLES.GUEST, 'users', 'delete');
      expect(result).toBe(false);
    });

    test('should grant wildcard permissions', () => {
      const result = hasPermission(USER_ROLES.GUEST, 'incidents', 'read');
      expect(result).toBe(true);
    });

    test('should deny permission for non-existent resource', () => {
      const result = hasPermission(USER_ROLES.ADMIN, 'nonexistent', 'read');
      expect(result).toBe(false);
    });

    test('should deny permission for non-existent action', () => {
      const result = hasPermission(USER_ROLES.ADMIN, 'users', 'nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('guestCanPerformAction function', () => {
    test('should allow explicitly allowed actions for guests', () => {
      const result = guestCanPerformAction('incidents', 'create');
      expect(result).toBe(true);
    });

    test('should deny explicitly restricted actions for guests', () => {
      const result = guestCanPerformAction('incidents', 'delete');
      expect(result).toBe(false);
    });

    test('should deny wildcard restricted actions for guests', () => {
      const result = guestCanPerformAction('admin', 'dashboard');
      expect(result).toBe(false);
    });
  });

  describe('requireRole middleware', () => {
    test('should allow access for users with correct permissions', async () => {
      app.get('/test-user-read', 
        mockAuth('user', USER_ROLES.USER),
        requireRole('incidents', 'read'),
        (req, res) => {
          res.json({ success: true, permissions: req.permissions });
        }
      );

      const response = await request(app).get('/test-user-read');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.permissions).toHaveProperty('resource', 'incidents');
      expect(response.body.permissions).toHaveProperty('action', 'read');
    });

    test('should deny access for users without permissions', async () => {
      app.get('/test-user-delete', 
        mockAuth('user', USER_ROLES.USER),
        requireRole('users', 'delete'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-user-delete');
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    test('should allow guest access for permitted actions', async () => {
      app.post('/test-guest-create', 
        mockAuth('guest'),
        requireRole('incidents', 'create'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).post('/test-guest-create');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny guest access for restricted actions', async () => {
      app.delete('/test-guest-delete', 
        mockAuth('guest'),
        requireRole('incidents', 'delete'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).delete('/test-guest-delete');
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    test('should deny access for unauthenticated users', async () => {
      app.get('/test-unauth', 
        mockAuth('none'),
        requireRole('incidents', 'read'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-unauth');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED_ACCESS);
    });

    test('should enforce guest action limits', async () => {
      app.post('/test-guest-limit', 
        mockAuth('guest', null, 10, 10), // Guest at action limit
        requireRole('incidents', 'create'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).post('/test-guest-limit');
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED);
    });
  });

  describe('requireRoles middleware', () => {
    test('should allow access for users with required role', async () => {
      app.get('/test-admin-only', 
        mockAuth('user', USER_ROLES.ADMIN),
        requireRoles([USER_ROLES.ADMIN]),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-admin-only');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should allow access for users with any of multiple required roles', async () => {
      app.get('/test-multi-role', 
        mockAuth('user', USER_ROLES.HOSPITAL),
        requireRoles([USER_ROLES.ADMIN, USER_ROLES.HOSPITAL]),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-multi-role');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access for users without required role', async () => {
      app.get('/test-wrong-role', 
        mockAuth('user', USER_ROLES.USER),
        requireRoles([USER_ROLES.ADMIN]),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-wrong-role');
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    });

    test('should accept single role as string', async () => {
      app.get('/test-single-role', 
        mockAuth('user', USER_ROLES.ADMIN),
        requireRoles(USER_ROLES.ADMIN),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-single-role');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('requireAdmin middleware', () => {
    test('should allow access for admin users', async () => {
      app.get('/test-admin', 
        mockAuth('user', USER_ROLES.ADMIN),
        requireAdmin,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-admin');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access for non-admin users', async () => {
      app.get('/test-non-admin', 
        mockAuth('user', USER_ROLES.USER),
        requireAdmin,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-non-admin');
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('requireHospitalOrAdmin middleware', () => {
    test('should allow access for hospital users', async () => {
      app.get('/test-hospital', 
        mockAuth('user', USER_ROLES.HOSPITAL),
        requireHospitalOrAdmin,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-hospital');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should allow access for admin users', async () => {
      app.get('/test-admin-hospital', 
        mockAuth('user', USER_ROLES.ADMIN),
        requireHospitalOrAdmin,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-admin-hospital');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access for regular users', async () => {
      app.get('/test-regular-user', 
        mockAuth('user', USER_ROLES.USER),
        requireHospitalOrAdmin,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-regular-user');
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('requireRegisteredUser middleware', () => {
    test('should allow access for registered users', async () => {
      app.get('/test-registered', 
        mockAuth('user', USER_ROLES.USER),
        requireRegisteredUser,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-registered');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access for guest users', async () => {
      app.get('/test-guest-denied', 
        mockAuth('guest'),
        requireRegisteredUser,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-guest-denied');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHORIZED_ACCESS);
    });

    test('should deny access for unauthenticated users', async () => {
      app.get('/test-unauth-denied', 
        mockAuth('none'),
        requireRegisteredUser,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-unauth-denied');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('getUserPermissions function', () => {
    test('should return correct permissions for authenticated user', () => {
      const req = {
        isAuthenticated: true,
        isGuest: false,
        user: { role: USER_ROLES.USER }
      };

      const permissions = getUserPermissions(req, 'incidents');
      
      expect(permissions).toHaveProperty('canRead', true);
      expect(permissions).toHaveProperty('canWrite', true);
      expect(permissions).toHaveProperty('canDelete', false);
      expect(permissions).toHaveProperty('canAdmin', false);
      expect(permissions).toHaveProperty('userRole', USER_ROLES.USER);
      expect(permissions).toHaveProperty('isGuest', false);
    });

    test('should return correct permissions for guest user', () => {
      const req = {
        isAuthenticated: true,
        isGuest: true,
        user: { 
          role: USER_ROLES.GUEST,
          actionCount: 5,
          maxActions: 10
        }
      };

      const permissions = getUserPermissions(req, 'incidents');
      
      expect(permissions).toHaveProperty('canRead', true);
      expect(permissions).toHaveProperty('canWrite', true);
      expect(permissions).toHaveProperty('canDelete', false);
      expect(permissions).toHaveProperty('isGuest', true);
      expect(permissions).toHaveProperty('actionCount', 5);
      expect(permissions).toHaveProperty('maxActions', 10);
    });

    test('should return no permissions for unauthenticated user', () => {
      const req = {
        isAuthenticated: false
      };

      const permissions = getUserPermissions(req, 'incidents');
      
      expect(permissions).toHaveProperty('canRead', false);
      expect(permissions).toHaveProperty('canWrite', false);
      expect(permissions).toHaveProperty('canDelete', false);
      expect(permissions).toHaveProperty('canAdmin', false);
    });

    test('should return admin permissions for admin user', () => {
      const req = {
        isAuthenticated: true,
        isGuest: false,
        user: { role: USER_ROLES.ADMIN }
      };

      const permissions = getUserPermissions(req, 'users');
      
      expect(permissions).toHaveProperty('canRead', true);
      expect(permissions).toHaveProperty('canWrite', true);
      expect(permissions).toHaveProperty('canDelete', true);
      expect(permissions).toHaveProperty('canAdmin', true);
    });
  });

  describe('Pre-configured role checkers', () => {
    test('should have all expected role checkers', () => {
      expect(roleCheckers).toHaveProperty('users');
      expect(roleCheckers).toHaveProperty('guests');
      expect(roleCheckers).toHaveProperty('incidents');
      expect(roleCheckers).toHaveProperty('admin');
      expect(roleCheckers).toHaveProperty('hospital');
    });

    test('should work with incident creation checker', async () => {
      app.post('/test-incident-create', 
        mockAuth('user', USER_ROLES.USER),
        roleCheckers.incidents.create,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).post('/test-incident-create');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should work with admin dashboard checker', async () => {
      app.get('/test-admin-dashboard', 
        mockAuth('user', USER_ROLES.ADMIN),
        roleCheckers.admin.dashboard,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-admin-dashboard');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should deny access to admin dashboard for regular users', async () => {
      app.get('/test-admin-dashboard-denied', 
        mockAuth('user', USER_ROLES.USER),
        roleCheckers.admin.dashboard,
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-admin-dashboard-denied');
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error response format', () => {
    test('should return structured error for insufficient permissions', async () => {
      app.get('/test-error-format', 
        mockAuth('user', USER_ROLES.USER),
        requireRole('users', 'delete'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-error-format');
      
      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', ERROR_CODES.INSUFFICIENT_PERMISSIONS);
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('details');
      expect(response.body).toHaveProperty('timestamp');
    });

    test('should include helpful details in error response', async () => {
      app.get('/test-error-details', 
        mockAuth('user', USER_ROLES.USER),
        requireRole('admin', 'dashboard'),
        (req, res) => {
          res.json({ success: true });
        }
      );

      const response = await request(app).get('/test-error-details');
      
      expect(response.body.error.details).toHaveProperty('resource', 'admin');
      expect(response.body.error.details).toHaveProperty('action', 'dashboard');
      expect(response.body.error.details).toHaveProperty('userRole', USER_ROLES.USER);
      expect(response.body.error.details).toHaveProperty('requiredRoles');
    });
  });

  describe('Permission configuration', () => {
    test('should have valid permission matrix structure', () => {
      expect(PERMISSIONS).toHaveProperty('users');
      expect(PERMISSIONS).toHaveProperty('incidents');
      expect(PERMISSIONS).toHaveProperty('admin');
      expect(PERMISSIONS).toHaveProperty('hospital');
      
      // Check that each resource has proper actions
      expect(PERMISSIONS.users).toHaveProperty('create');
      expect(PERMISSIONS.users).toHaveProperty('read');
      expect(PERMISSIONS.users).toHaveProperty('update');
      expect(PERMISSIONS.users).toHaveProperty('delete');
    });

    test('should have valid guest restrictions', () => {
      expect(GUEST_RESTRICTIONS).toHaveProperty('maxActions');
      expect(GUEST_RESTRICTIONS).toHaveProperty('allowedActions');
      expect(GUEST_RESTRICTIONS).toHaveProperty('restrictedActions');
      
      expect(Array.isArray(GUEST_RESTRICTIONS.allowedActions)).toBe(true);
      expect(Array.isArray(GUEST_RESTRICTIONS.restrictedActions)).toBe(true);
    });
  });
});