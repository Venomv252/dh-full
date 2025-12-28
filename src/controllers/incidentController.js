/**
 * Incident Controller
 * Handles incident reporting, management, and geospatial queries
 * Supports both user and guest incident reporting with upvoting system
 */

const Incident = require('../models/Incident');
const Guest = require('../models/Guest');
const { calculateDistance } = require('../utils/helpers');
const { 
  INCIDENT_TYPES, 
  INCIDENT_STATUS, 
  USER_TYPES, 
  USER_ROLES,
  ERROR_CODES, 
  HTTP_STATUS,
  GEO_CONSTANTS,
  PAGINATION
} = require('../config/constants');

/**
 * Create new incident
 * POST /api/incidents
 * 
 * Creates a new incident report with geolocation and media support
 * Handles both user and guest reporting with action count tracking
 */
const createIncident = async (req, res, next) => {
  try {
    const incidentData = req.body;
    const reporter = req.user;
    
    // Validate reporter information
    if (!reporter || (!reporter.userId && !reporter.guestId)) {
      const error = new Error('Reporter information is required');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }
    
    // Set reporter information based on user type
    if (req.isGuest) {
      // Handle guest reporting
      const guest = await Guest.findOne({ guestId: reporter.guestId });
      
      if (!guest) {
        const error = new Error('Guest not found');
        error.statusCode = 404;
        error.code = ERROR_CODES.GUEST_NOT_FOUND;
        throw error;
      }
      
      // Check if guest can perform action
      if (!guest.canPerformAction()) {
        const error = new Error('Guest has reached maximum action limit');
        error.statusCode = 403;
        error.code = ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED;
        error.details = {
          actionCount: guest.actionCount,
          maxActions: guest.maxActions,
          suggestion: 'Register as a user to continue reporting incidents'
        };
        throw error;
      }
      
      incidentData.reportedBy = {
        userType: USER_TYPES.GUEST,
        guestId: guest._id
      };
      
      // Increment guest action count
      await guest.incrementActionCount();
      
    } else {
      // Handle user reporting
      incidentData.reportedBy = {
        userType: USER_TYPES.USER,
        userId: reporter.userId
      };
    }
    
    // Create incident
    const incident = new Incident(incidentData);
    await incident.save();
    
    // Prepare response
    const response = {
      success: true,
      data: {
        incident: {
          incidentId: incident._id,
          title: incident.title,
          type: incident.type,
          status: incident.status,
          coordinates: incident.coordinates,
          mediaCount: incident.mediaCount,
          reportedBy: incident.reportedBy,
          createdAt: incident.createdAt
        },
        reporter: {
          type: req.isGuest ? 'guest' : 'user',
          actionsRemaining: req.isGuest ? 
            (await Guest.findOne({ guestId: reporter.guestId })).getRemainingActions() : 
            null
        }
      },
      message: 'Incident reported successfully'
    };
    
    res.status(HTTP_STATUS.CREATED).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get incident by ID
 * GET /api/incidents/:id
 * 
 * Retrieves detailed incident information including media and upvote data
 */
const getIncidentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find incident with populated reporter information
    const incident = await Incident.findById(id)
      .populate('reportedBy.userId', 'email role createdAt')
      .populate('reportedBy.guestId', 'guestId createdAt');
    
    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.INCIDENT_NOT_FOUND;
      throw error;
    }
    
    // Check if current user has upvoted (if authenticated)
    let hasUpvoted = false;
    if (req.isAuthenticated) {
      if (req.isGuest) {
        hasUpvoted = incident.hasUpvoted(USER_TYPES.GUEST, null, req.user.guestId);
      } else {
        hasUpvoted = incident.hasUpvoted(USER_TYPES.USER, req.user.userId, null);
      }
    }
    
    const response = {
      success: true,
      data: {
        incident: {
          ...incident.toObject(),
          hasUpvoted,
          canUpvote: req.isAuthenticated && !hasUpvoted,
          canEdit: req.isAuthenticated && (
            req.user.role === USER_ROLES.ADMIN ||
            (req.isUser && incident.reportedBy.userType === USER_TYPES.USER && 
             incident.reportedBy.userId.toString() === req.user.userId) ||
            (req.isGuest && incident.reportedBy.userType === USER_TYPES.GUEST && 
             incident.reportedBy.guestId.toString() === req.user.guestId)
          )
        }
      },
      message: 'Incident retrieved successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * List incidents with filtering and pagination
 * GET /api/incidents
 * 
 * Retrieves incidents with support for geospatial queries, filtering, and pagination
 */
const listIncidents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      lat,
      lng,
      radius = GEO_CONSTANTS.DEFAULT_RADIUS_METERS,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;
    
    // Build query
    const query = {};
    
    // Filter by type
    if (type && Object.values(INCIDENT_TYPES).includes(type)) {
      query.type = type;
    }
    
    // Filter by status
    if (status && Object.values(INCIDENT_STATUS).includes(status)) {
      query.status = status;
    }
    
    // Date range filtering
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    let incidents;
    let totalIncidents;
    
    // Handle geospatial queries
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const searchRadius = Math.min(parseInt(radius), GEO_CONSTANTS.MAX_RADIUS_METERS);
      
      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        const error = new Error('Invalid coordinates');
        error.statusCode = 400;
        error.code = ERROR_CODES.INVALID_INPUT;
        error.details = {
          latitude: { min: -90, max: 90, provided: latitude },
          longitude: { min: -180, max: 180, provided: longitude }
        };
        throw error;
      }
      
      // Build geospatial query using $geoWithin for better compatibility
      const geoQuery = {
        ...query,
        geoLocation: {
          $geoWithin: {
            $centerSphere: [
              [longitude, latitude],
              searchRadius / 6378100 // Convert meters to radians (Earth radius in meters)
            ]
          }
        }
      };
      
      // Execute geospatial query
      const [geoIncidents, geoTotal] = await Promise.all([
        Incident.find(geoQuery)
          .populate('reportedBy.userId', 'email role')
          .populate('reportedBy.guestId', 'guestId')
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit)),
        Incident.countDocuments(geoQuery)
      ]);
      
      incidents = geoIncidents;
      totalIncidents = geoTotal;
      
    } else {
      // Regular query without geospatial filtering
      const [regularIncidents, regularTotal] = await Promise.all([
        Incident.find(query)
          .populate('reportedBy.userId', 'email role')
          .populate('reportedBy.guestId', 'guestId')
          .sort({ [sortBy]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit)),
        Incident.countDocuments(query)
      ]);
      
      incidents = regularIncidents;
      totalIncidents = regularTotal;
    }
    
    // Format incident data for list view
    const formattedIncidents = incidents.map(incident => ({
      incidentId: incident._id,
      title: incident.title,
      type: incident.type,
      status: incident.status,
      coordinates: incident.coordinates,
      upvotes: incident.upvotes,
      mediaCount: incident.mediaCount,
      ageInHours: incident.ageInHours,
      reportedBy: {
        userType: incident.reportedBy.userType,
        // Don't expose sensitive reporter details in list view
        reporterId: incident.reporterId
      },
      createdAt: incident.createdAt,
      // Include distance if geospatial query was used
      ...(lat && lng && incident.geoLocation ? {
        distance: calculateDistance(
          parseFloat(lat), 
          parseFloat(lng), 
          incident.geoLocation.coordinates[1], 
          incident.geoLocation.coordinates[0]
        )
      } : {})
    }));
    
    const response = {
      success: true,
      data: {
        incidents: formattedIncidents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalIncidents,
          pages: Math.ceil(totalIncidents / parseInt(limit)),
          hasNext: skip + parseInt(limit) < totalIncidents,
          hasPrev: parseInt(page) > 1
        },
        filters: {
          type,
          status,
          location: lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng), radius: parseInt(radius) } : null,
          dateRange: startDate || endDate ? { startDate, endDate } : null,
          sortBy,
          sortOrder
        },
        summary: {
          totalResults: totalIncidents,
          searchType: lat && lng ? 'geospatial' : 'standard'
        }
      },
      message: 'Incidents retrieved successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Update incident
 * PUT /api/incidents/:id
 * 
 * Updates incident information (admin/hospital only for status changes)
 */
const updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;
    
    // Find incident
    const incident = await Incident.findById(id);
    
    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.INCIDENT_NOT_FOUND;
      throw error;
    }
    
    // Check permissions
    const isAdmin = user.role === USER_ROLES.ADMIN;
    const isHospital = user.role === USER_ROLES.HOSPITAL;
    const isReporter = (
      (req.isUser && incident.reportedBy.userType === USER_TYPES.USER && 
       incident.reportedBy.userId.toString() === user.userId) ||
      (req.isGuest && incident.reportedBy.userType === USER_TYPES.GUEST && 
       incident.reportedBy.guestId.toString() === user.guestId)
    );
    
    // Status changes require admin or hospital role
    if (updateData.status && !isAdmin && !isHospital) {
      const error = new Error('Only admin and hospital users can update incident status');
      error.statusCode = 403;
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      throw error;
    }
    
    // Other changes require reporter ownership or admin role
    if (!isReporter && !isAdmin) {
      const error = new Error('You can only update incidents you reported');
      error.statusCode = 403;
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      throw error;
    }
    
    // Prevent changing reporter information
    if (updateData.reportedBy) {
      delete updateData.reportedBy;
    }
    
    // Prevent changing creation timestamp
    if (updateData.createdAt) {
      delete updateData.createdAt;
    }
    
    // Update incident
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        incident[key] = updateData[key];
      }
    });
    
    await incident.save();
    
    const response = {
      success: true,
      data: {
        incident: incident.toObject(),
        updatedFields: Object.keys(updateData),
        updatedBy: {
          userType: req.isGuest ? 'guest' : 'user',
          role: user.role
        }
      },
      message: 'Incident updated successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Delete incident
 * DELETE /api/incidents/:id
 * 
 * Deletes incident (admin only or reporter within time limit)
 */
const deleteIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    // Find incident
    const incident = await Incident.findById(id);
    
    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.INCIDENT_NOT_FOUND;
      throw error;
    }
    
    // Check permissions
    const isAdmin = user.role === USER_ROLES.ADMIN;
    const isReporter = (
      (req.isUser && incident.reportedBy.userType === USER_TYPES.USER && 
       incident.reportedBy.userId.toString() === user.userId) ||
      (req.isGuest && incident.reportedBy.userType === USER_TYPES.GUEST && 
       incident.reportedBy.guestId.toString() === user.guestId)
    );
    
    // Check time limit for reporter deletion (1 hour)
    const hoursSinceCreation = incident.ageInHours;
    const canReporterDelete = isReporter && hoursSinceCreation <= 1;
    
    if (!isAdmin && !canReporterDelete) {
      const error = new Error(
        isReporter 
          ? 'You can only delete incidents within 1 hour of reporting'
          : 'You can only delete incidents you reported'
      );
      error.statusCode = 403;
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      error.details = {
        timeLimit: '1 hour',
        hoursSinceCreation,
        canDelete: canReporterDelete
      };
      throw error;
    }
    
    // Delete incident
    await Incident.findByIdAndDelete(id);
    
    const response = {
      success: true,
      data: {
        incidentId: id,
        deletedBy: {
          userType: req.isGuest ? 'guest' : 'user',
          role: user.role,
          isAdmin
        },
        deletedAt: new Date().toISOString()
      },
      message: 'Incident deleted successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Upvote incident
 * POST /api/incidents/:id/upvote
 * 
 * Adds or removes upvote for an incident
 */
const upvoteIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action = 'add' } = req.body; // 'add' or 'remove'
    const user = req.user;
    
    // Find incident
    const incident = await Incident.findById(id);
    
    if (!incident) {
      const error = new Error('Incident not found');
      error.statusCode = 404;
      error.code = ERROR_CODES.INCIDENT_NOT_FOUND;
      throw error;
    }
    
    // Handle guest action count
    if (req.isGuest) {
      const guest = await Guest.findOne({ guestId: user.guestId });
      
      if (!guest) {
        const error = new Error('Guest not found');
        error.statusCode = 404;
        error.code = ERROR_CODES.GUEST_NOT_FOUND;
        throw error;
      }
      
      // Only check action limit for adding upvotes, not removing
      if (action === 'add' && !guest.canPerformAction()) {
        const error = new Error('Guest has reached maximum action limit');
        error.statusCode = 403;
        error.code = ERROR_CODES.GUEST_ACTION_LIMIT_EXCEEDED;
        error.details = {
          actionCount: guest.actionCount,
          maxActions: guest.maxActions
        };
        throw error;
      }
    }
    
    let result;
    
    if (action === 'add') {
      // Add upvote
      if (req.isGuest) {
        const guest = await Guest.findOne({ guestId: user.guestId });
        result = await incident.addUpvote(USER_TYPES.GUEST, null, guest._id);
        // Increment guest action count
        await guest.incrementActionCount();
      } else {
        result = await incident.addUpvote(USER_TYPES.USER, user.userId, null);
      }
    } else if (action === 'remove') {
      // Remove upvote
      if (req.isGuest) {
        result = await incident.removeUpvote(USER_TYPES.GUEST, null, user.guestId);
      } else {
        result = await incident.removeUpvote(USER_TYPES.USER, user.userId, null);
      }
    } else {
      const error = new Error('Invalid action. Must be "add" or "remove"');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }
    
    const response = {
      success: true,
      data: {
        incidentId: id,
        action,
        upvotes: result.upvotes,
        hasUpvoted: action === 'add',
        voter: {
          userType: req.isGuest ? 'guest' : 'user',
          actionsRemaining: req.isGuest ? 
            (await Guest.findOne({ guestId: user.guestId })).getRemainingActions() : 
            null
        }
      },
      message: `Incident ${action === 'add' ? 'upvoted' : 'upvote removed'} successfully`
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get incidents by reporter
 * GET /api/incidents/my-reports
 * 
 * Retrieves incidents reported by the current user/guest
 */
const getMyIncidents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const user = req.user;
    
    // Build query for user's incidents
    const query = {};
    
    if (req.isGuest) {
      query['reportedBy.userType'] = USER_TYPES.GUEST;
      query['reportedBy.guestId'] = user.guestId;
    } else {
      query['reportedBy.userType'] = USER_TYPES.USER;
      query['reportedBy.userId'] = user.userId;
    }
    
    // Add filters
    if (status && Object.values(INCIDENT_STATUS).includes(status)) {
      query.status = status;
    }
    
    if (type && Object.values(INCIDENT_TYPES).includes(type)) {
      query.type = type;
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    // Execute query
    const [incidents, totalIncidents] = await Promise.all([
      Incident.find(query)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(parseInt(limit)),
      Incident.countDocuments(query)
    ]);
    
    const response = {
      success: true,
      data: {
        incidents: incidents.map(incident => incident.toObject()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalIncidents,
          pages: Math.ceil(totalIncidents / parseInt(limit)),
          hasNext: skip + parseInt(limit) < totalIncidents,
          hasPrev: parseInt(page) > 1
        },
        reporter: {
          userType: req.isGuest ? 'guest' : 'user',
          totalReports: totalIncidents
        }
      },
      message: 'Your incidents retrieved successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get incident statistics
 * GET /api/incidents/stats
 * 
 * Returns system-wide incident statistics (admin only)
 */
const getIncidentStatistics = async (req, res, next) => {
  try {
    const stats = await Incident.getStatistics();
    
    // Add additional computed metrics
    const activeIncidents = stats.statusBreakdown[INCIDENT_STATUS.REPORTED] || 0;
    const resolvedIncidents = stats.statusBreakdown[INCIDENT_STATUS.RESOLVED] || 0;
    const resolutionRate = stats.totalIncidents > 0 
      ? Math.round((resolvedIncidents / stats.totalIncidents) * 100)
      : 0;
    
    const response = {
      success: true,
      data: {
        ...stats,
        activeIncidents,
        resolvedIncidents,
        resolutionRate,
        averageIncidentsPerDay: Math.round(stats.recentIncidents / 1), // Last 24 hours
        systemHealth: {
          totalIncidents: stats.totalIncidents,
          resolutionRate,
          recentActivity: stats.recentIncidents
        }
      },
      message: 'Incident statistics retrieved successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncident,
  getIncidentById,
  listIncidents,
  updateIncident,
  deleteIncident,
  upvoteIncident,
  getMyIncidents,
  getIncidentStatistics
};