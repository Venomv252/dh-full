/**
 * Role-Based Access Control (RBAC) Middleware
 * Implements permission checking for different user roles and guest restrictions
 * Provides fine-grained access control for API endpoints
 */

const { USER_ROLES, USER_TYPES, ERROR_CODES, HTTP_STATUS } = require('../config/constants');

/**
 * Permission matrix defining what each role can access
 * Structure: { resource: { action: [allowedRoles] } }
 */
const PERMISSIONS = {
  // User management permissions
  users: {
    create: [USER_ROLES.ADMIN], // Only admins can create users directly
    read: [USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.HOSPITAL], // Users can read their own data
    update: [USER_ROLES.USER, USER_ROLES.ADMIN], // Users can update their own data
    delete: [USER_ROLES.ADMIN], // Only admins can delete users
    list: [USER_ROLES.ADMIN], // Only admins can list all users
    register: ['*'] // Anyone can register (handled separately)
  },

  // Guest management permissions
  guests: {
    create: ['*'], // Anyone can create guest sessions
    read: [USER_ROLES.GUEST, USER_ROLES.ADMIN], // Guests can read their own data
    update: [USER_ROLES.GUEST, USER_ROLES.ADMIN], // Guests can update their own data
    delete: [USER_ROLES.ADMIN], // Only admins can delete guests
    list: [USER_ROLES.ADMIN] // Only admins can list all guests
  },

  // Incident management permissions
  incidents: {
    create: [USER_ROLES.USER, USER_ROLES.GUEST, USER_ROLES.ADMIN, USER_ROLES.HOSPITAL],
    read: ['*'], // Anyone can read incidents (public safety)
    update: [USER_ROLES.ADMIN, USER_ROLES.HOSPITAL], // Only admins and hospitals can update
    delete: [USER_ROLES.ADMIN], // Only admins can delete incidents
    list: ['*'], // Anyone can list incidents
    upvote: [USER_ROLES.USER, USER_ROLES.GUEST, USER_ROLES.ADMIN, USER_ROLES.HOSPITAL],
    verify: [USER_ROLES.ADMIN, USER_ROLES.HOSPITAL], // Verify incident status
    resolve: [USER_ROLES.ADMIN, USER_ROLES.HOSPITAL] // Mark incident as resolved
  },

  // Administrative permissions
  admin: {
    dashboard: [USER_ROLES.ADMIN],
    statistics: [USER_ROLES.ADMIN, USER_ROLES.HOSPITAL],
    reports: [USER_ROLES.ADMIN, USER_ROLES.HOSPITAL],
    userManagement: [USER_ROLES.ADMIN],
    systemConfig: [USER_ROLES.ADMIN],
    auditLogs: [USER_ROLES.ADMIN]
  },

  // Hospital-specific permissions
  hospital: {
    medicalIncidents: [USER_ROLES.HOSPITAL, USER_ROLES.ADMIN],
    patientData: [USER_ROLES.HOSPITAL], // Access to medical information
    emergencyAlerts: [USER_ROLES.HOSPITAL, USER_ROLES.ADMIN],
    resourceManagement: [USER_ROLES.HOSPITAL]
  },

  // System permissions
  system: {
    health: ['*'], // Health checks available to all
    metrics: [USER_ROLES.ADMIN],
    logs: [USER_ROLES.ADMIN],
    backup: [USER_ROLES.ADMIN]
  }
};

/**
 * Guest user action limits and restrictions
 */
const GUEST_RESTRICTIONS = {
  maxActions: 10, // Maximum actions per guest session
  allowedActions: [
    'incidents.create',
    'incidents.read',
    'incidents.list',
    'incidents.upvote',
    'guests.read',
    'guests.update'
  ],
  restrictedActions: [
    'incidents.update',
    'incidents.delete',
    'incidents.verify',
    'incidents.resolve',
    'admin.*',
    'hospital.*',
    'users.*'
  ]
};

/**
 * Resource ownership rules for self-access permissions
 */
const OWNERSHIP_RULES = {
  users: {
    // Users can access their own profile
    checkOwnership: (req, resourceId) => {
      return req.isUser && req.user.userId === resourceId;
    }
  },
  guests: {
    // Guests can access their own session data
    checkOwnership: (req, resourceId) => {
      return req.isGuest && req.user.guestId === resourceId;
    }
  },
  incidents: {
    // Users/guests can access incidents they reported
    checkOwnership: async (req, resourceId) => {
      // This would typically query the database to check incident ownership
      // For now, we'll implement the interface
      return false; // Will be implemented in controllers with database access
    }
  }
};

/**
 * Check if a role has permission for a specific resource and action
 * @param {string} userRole - User's role
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @returns {boolean} - Whether permission is granted
 */
const hasPermission = (userRole, resource, action) => {
  const resourcePermissions = PERMISSIONS[resource];
  if (!resourcePermissions) {
    return false; // Resource not defined = no access
  }

  const actionPermissions = resourcePermissions[action];
  if (!actionPermissions) {
    return false; // Action not defined = no access
  }

  // Check for wildcard permission (everyone allowed)
  if (actionPermissions.includes('*')) {
    return true;
  }

  // Check if user's role is in allowed roles
  return actionPermissions.includes(userRole);
};

/**
 * Check if guest user can perform a specific action
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @returns {boolean} - Whether guest can perform action
 */
const guestCanPerformAction = (resource, action) => {
  const actionKey = `${resource}.${action}`;
  
  // Check if action is explicitly allowed for guests
  if (GUEST_RESTRICTIONS.allowedActions.includes(actionKey)) {
    return true;
  }

  // Check if action is explicitly restricted
  if (GUEST_RESTRICTIONS.restrictedActions.includes(actionKey)) {
    return false;
  }

  // Check for wildcard restrictions
  const wildcardRestriction = GUEST_RESTRICTIONS.restrictedActions.find(
    restriction => restriction.endsWith('*') && 
    actionKey.startsWith(restriction.slice(0, -1))
  );

  return !wildcardRestriction;
};

/**
 * Main role-based access control middleware
 * @param {string} resource - Resource being accessed
 * @param {string} action - Action being performed
 * @param {object} options - Additional options
 * @returns {function} - Express middleware function
 */
const requireRole = (resource, action, options = {}) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED_ACCESS,
            message: 'Authentication required to access this resource',
            details: {
              resource,
              action,
              required: 'Valid authentication (user or guest)'
            }
          },
          timestamp: new Date().toISOString()
        });
      }

      const userRole = req.user.role;
      const isGuest = req.isGuest;

      // Special handling for guest users
      if (isGuest) {
        // Check if guest can perform this action
        if (!guestCanPerformAction(resource, action)) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: {
              code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
              message: 'Guest users are not allowed to perform this action',
              details: {
                resource,
                action,
                userType: 'guest',
                suggestion: 'Register as a user to access this feature'
              }
            },
            timestamp: new Date().toISOString()
          });
        }

        // Check guest action limits
        if (req.user.actionCount >= req.user.maxActions) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: {
              code: ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED,
              message: 'Guest user has reached maximum action limit',
              details: {
                actionCount: req.user.actionCount,
                maxActions: req.user.maxActions,
                suggestion: 'Register as a user to continue using the service'
              }
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // Check role-based permissions
      if (!hasPermission(userRole, resource, action)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: 'Insufficient permissions to access this resource',
            details: {
              resource,
              action,
              userRole,
              requiredRoles: PERMISSIONS[resource]?.[action] || []
            }
          },
          timestamp: new Date().toISOString()
        });
      }

      // Check ownership if required
      if (options.checkOwnership && req.params.id) {
        const ownershipRule = OWNERSHIP_RULES[resource];
        if (ownershipRule) {
          const isOwner = await ownershipRule.checkOwnership(req, req.params.id);
          if (!isOwner && !hasPermission(userRole, resource, 'admin')) {
            return res.status(HTTP_STATUS.FORBIDDEN).json({
              success: false,
              error: {
                code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
                message: 'You can only access your own resources',
                details: {
                  resource,
                  action,
                  resourceId: req.params.id
                }
              },
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Set permission context for controllers
      req.permissions = {
        resource,
        action,
        userRole,
        isGuest,
        canAdmin: hasPermission(userRole, resource, 'admin') || userRole === USER_ROLES.ADMIN
      };

      next();
    } catch (error) {
      console.error('Role check error:', error.message);
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Permission check failed',
          details: process.env.NODE_ENV === 'development' ? { error: error.message } : {}
        },
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Require specific roles (shorthand for common patterns)
 * @param {string|array} roles - Required role(s)
 * @returns {function} - Express middleware function
 */
const requireRoles = (roles) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.isAuthenticated) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: {
          code: ERROR_CODES.UNAUTHORIZED_ACCESS,
          message: 'Authentication required',
          details: { requiredRoles: allowedRoles }
        },
        timestamp: new Date().toISOString()
      });
    }

    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: {
          code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
          message: 'Insufficient role permissions',
          details: {
            userRole,
            requiredRoles: allowedRoles
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

/**
 * Admin-only access middleware
 */
const requireAdmin = requireRoles([USER_ROLES.ADMIN]);

/**
 * Hospital or Admin access middleware
 */
const requireHospitalOrAdmin = requireRoles([USER_ROLES.HOSPITAL, USER_ROLES.ADMIN]);

/**
 * Registered user access (no guests)
 */
const requireRegisteredUser = (req, res, next) => {
  if (!req.isAuthenticated || req.isGuest) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED_ACCESS,
        message: 'Registered user account required',
        details: {
          provided: req.isGuest ? 'guest' : 'none',
          required: 'registered user'
        }
      },
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Check if user can access their own resource
 * @param {string} resource - Resource type
 * @returns {function} - Express middleware function
 */
const requireOwnership = (resource) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const ownershipRule = OWNERSHIP_RULES[resource];
      
      if (!ownershipRule) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          success: false,
          error: {
            code: ERROR_CODES.INTERNAL_ERROR,
            message: 'Ownership rule not defined for resource',
            details: { resource }
          },
          timestamp: new Date().toISOString()
        });
      }

      const isOwner = await ownershipRule.checkOwnership(req, resourceId);
      const isAdmin = req.user?.role === USER_ROLES.ADMIN;
      
      if (!isOwner && !isAdmin) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: {
            code: ERROR_CODES.INSUFFICIENT_PERMISSIONS,
            message: 'You can only access your own resources',
            details: {
              resource,
              resourceId,
              userRole: req.user?.role
            }
          },
          timestamp: new Date().toISOString()
        });
      }

      req.isOwner = isOwner;
      req.isAdmin = isAdmin;
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error.message);
      
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Ownership check failed',
          details: process.env.NODE_ENV === 'development' ? { error: error.message } : {}
        },
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Get user permissions for a resource
 * @param {object} req - Express request object
 * @param {string} resource - Resource name
 * @returns {object} - Permission summary
 */
const getUserPermissions = (req, resource) => {
  if (!req.isAuthenticated) {
    return { canRead: false, canWrite: false, canDelete: false, canAdmin: false };
  }

  const userRole = req.user.role;
  const isGuest = req.isGuest;

  return {
    canRead: hasPermission(userRole, resource, 'read'),
    canWrite: hasPermission(userRole, resource, 'update') || hasPermission(userRole, resource, 'create'),
    canDelete: hasPermission(userRole, resource, 'delete'),
    canAdmin: hasPermission(userRole, resource, 'admin') || userRole === USER_ROLES.ADMIN,
    isGuest,
    userRole,
    actionCount: isGuest ? req.user.actionCount : null,
    maxActions: isGuest ? req.user.maxActions : null
  };
};

/**
 * Middleware to add permission information to response
 */
const addPermissionHeaders = (resource) => {
  return (req, res, next) => {
    const permissions = getUserPermissions(req, resource);
    
    res.set({
      'X-User-Role': permissions.userRole || 'anonymous',
      'X-Can-Read': permissions.canRead.toString(),
      'X-Can-Write': permissions.canWrite.toString(),
      'X-Can-Delete': permissions.canDelete.toString(),
      'X-Can-Admin': permissions.canAdmin.toString()
    });

    if (permissions.isGuest) {
      res.set({
        'X-Guest-Actions': `${permissions.actionCount}/${permissions.maxActions}`
      });
    }

    next();
  };
};

/**
 * Pre-configured role checkers for common endpoints
 */
const roleCheckers = {
  // User management
  users: {
    create: requireRole('users', 'create'),
    read: requireRole('users', 'read', { checkOwnership: true }),
    update: requireRole('users', 'update', { checkOwnership: true }),
    delete: requireRole('users', 'delete'),
    list: requireRole('users', 'list')
  },

  // Guest management
  guests: {
    create: requireRole('guests', 'create'),
    read: requireRole('guests', 'read', { checkOwnership: true }),
    update: requireRole('guests', 'update', { checkOwnership: true }),
    delete: requireRole('guests', 'delete'),
    list: requireRole('guests', 'list')
  },

  // Incident management
  incidents: {
    create: requireRole('incidents', 'create'),
    read: requireRole('incidents', 'read'),
    update: requireRole('incidents', 'update'),
    delete: requireRole('incidents', 'delete'),
    list: requireRole('incidents', 'list'),
    upvote: requireRole('incidents', 'upvote'),
    verify: requireRole('incidents', 'verify'),
    resolve: requireRole('incidents', 'resolve')
  },

  // Admin functions
  admin: {
    dashboard: requireRole('admin', 'dashboard'),
    statistics: requireRole('admin', 'statistics'),
    reports: requireRole('admin', 'reports'),
    userManagement: requireRole('admin', 'userManagement'),
    systemConfig: requireRole('admin', 'systemConfig'),
    auditLogs: requireRole('admin', 'auditLogs')
  },

  // Hospital functions
  hospital: {
    medicalIncidents: requireRole('hospital', 'medicalIncidents'),
    patientData: requireRole('hospital', 'patientData'),
    emergencyAlerts: requireRole('hospital', 'emergencyAlerts'),
    resourceManagement: requireRole('hospital', 'resourceManagement')
  }
};

module.exports = {
  // Main RBAC functions
  requireRole,
  requireRoles,
  hasPermission,
  getUserPermissions,
  
  // Convenience middleware
  requireAdmin,
  requireHospitalOrAdmin,
  requireRegisteredUser,
  requireOwnership,
  
  // Utility functions
  guestCanPerformAction,
  addPermissionHeaders,
  
  // Pre-configured role checkers
  roleCheckers,
  
  // Configuration
  PERMISSIONS,
  GUEST_RESTRICTIONS,
  OWNERSHIP_RULES
};