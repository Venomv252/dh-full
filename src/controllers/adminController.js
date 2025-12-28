/**
 * Admin Controller
 * Handles administrative functions for incident management, user management, and system monitoring
 * Provides comprehensive admin dashboard functionality and bulk operations
 */

const Incident = require('../models/Incident');
const User = require('../models/User');
const Guest = require('../models/Guest');
const { 
  INCIDENT_TYPES, 
  INCIDENT_STATUS, 
  USER_ROLES,
  ERROR_CODES, 
  HTTP_STATUS,
  PAGINATION
} = require('../config/constants');

/**
 * Get admin dashboard overview
 * GET /api/admin/dashboard
 * 
 * Provides comprehensive system overview for admin dashboard
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    // Get current date ranges for statistics
    const now = new Date();
    const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const last7Days = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const last30Days = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get comprehensive statistics
    const [
      incidentStats,
      userStats,
      guestStats,
      recentIncidents,
      recentUsers,
      systemHealth
    ] = await Promise.all([
      // Incident statistics
      Incident.getStatistics(),
      
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            adminUsers: { $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] } },
            hospitalUsers: { $sum: { $cond: [{ $eq: ['$role', 'hospital'] }, 1, 0] } },
            regularUsers: { $sum: { $cond: [{ $eq: ['$role', 'user'] }, 1, 0] } },
            recentUsers: { $sum: { $cond: [{ $gte: ['$createdAt', last7Days] }, 1, 0] } }
          }
        }
      ]),
      
      // Guest statistics
      Guest.getStatistics(),
      
      // Recent incidents (last 24 hours)
      Incident.find({ createdAt: { $gte: last24Hours } })
        .populate('reportedBy.userId', 'email role')
        .populate('reportedBy.guestId', 'guestId')
        .sort({ createdAt: -1 })
        .limit(10),
      
      // Recent user registrations
      User.find({ createdAt: { $gte: last7Days } })
        .select('email role createdAt')
        .sort({ createdAt: -1 })
        .limit(10),
      
      // System health metrics
      Promise.all([
        Incident.countDocuments({ status: INCIDENT_STATUS.REPORTED }),
        Incident.countDocuments({ status: INCIDENT_STATUS.VERIFIED }),
        Incident.countDocuments({ status: INCIDENT_STATUS.RESOLVED }),
        Incident.countDocuments({ createdAt: { $gte: last24Hours } }),
        User.countDocuments({ createdAt: { $gte: last24Hours } })
      ])
    ]);

    // Process system health data
    const [reportedIncidents, verifiedIncidents, resolvedIncidents, newIncidents24h, newUsers24h] = systemHealth;
    const totalActiveIncidents = reportedIncidents + verifiedIncidents;
    const resolutionRate = (reportedIncidents + verifiedIncidents + resolvedIncidents) > 0 
      ? Math.round((resolvedIncidents / (reportedIncidents + verifiedIncidents + resolvedIncidents)) * 100)
      : 0;

    // Format response
    const response = {
      success: true,
      data: {
        overview: {
          totalIncidents: incidentStats.totalIncidents,
          totalUsers: userStats[0]?.totalUsers || 0,
          totalGuests: guestStats.totalGuests,
          activeIncidents: totalActiveIncidents,
          resolutionRate,
          systemStatus: resolutionRate >= 80 ? 'healthy' : resolutionRate >= 60 ? 'warning' : 'critical'
        },
        
        incidents: {
          total: incidentStats.totalIncidents,
          byStatus: incidentStats.statusBreakdown,
          byType: incidentStats.typeBreakdown,
          recent24h: newIncidents24h,
          upvoteStats: incidentStats.upvoteStats,
          resolutionRate
        },
        
        users: {
          total: userStats[0]?.totalUsers || 0,
          byRole: {
            admin: userStats[0]?.adminUsers || 0,
            hospital: userStats[0]?.hospitalUsers || 0,
            user: userStats[0]?.regularUsers || 0
          },
          recent7days: userStats[0]?.recentUsers || 0,
          recent24h: newUsers24h
        },
        
        guests: {
          total: guestStats.totalGuests,
          active: guestStats.activeGuests,
          atLimit: guestStats.guestsAtLimit,
          averageActions: Math.round(guestStats.averageActions || 0)
        },
        
        recentActivity: {
          incidents: recentIncidents.map(incident => ({
            id: incident._id,
            title: incident.title,
            type: incident.type,
            status: incident.status,
            reportedBy: incident.reportedBy,
            createdAt: incident.createdAt,
            upvotes: incident.upvotes
          })),
          users: recentUsers.map(user => ({
            id: user._id,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
          }))
        },
        
        systemHealth: {
          status: resolutionRate >= 80 ? 'healthy' : resolutionRate >= 60 ? 'warning' : 'critical',
          metrics: {
            incidentResolutionRate: resolutionRate,
            activeIncidents: totalActiveIncidents,
            dailyIncidentVolume: newIncidents24h,
            dailyUserGrowth: newUsers24h,
            guestActivityRate: guestStats.totalGuests > 0 
              ? Math.round((guestStats.activeGuests / guestStats.totalGuests) * 100)
              : 0
          }
        }
      },
      message: 'Admin dashboard data retrieved successfully'
    };

    res.status(HTTP_STATUS.OK).json(response);

  } catch (error) {
    next(error);
  }
};

/**
 * Get admin incident management view
 * GET /api/admin/incidents
 * 
 * Provides comprehensive incident management with advanced filtering and bulk operations
 */
const getAdminIncidents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      reporterType,
      priority,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search
    } = req.query;

    // Build query
    const query = {};

    // Filter by status
    if (status && Object.values(INCIDENT_STATUS).includes(status)) {
      query.status = status;
    }

    // Filter by type
    if (type && Object.values(INCIDENT_TYPES).includes(type)) {
      query.type = type;
    }

    // Filter by reporter type
    if (reporterType && ['user', 'guest'].includes(reporterType)) {
      query['reportedBy.userType'] = reporterType;
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

    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Priority filtering (based on upvotes and age)
    if (priority) {
      if (priority === 'high') {
        query.upvotes = { $gte: 10 };
      } else if (priority === 'urgent') {
        query.upvotes = { $gte: 20 };
        query.createdAt = { $gte: new Date(Date.now() - (24 * 60 * 60 * 1000)) };
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [incidents, totalIncidents] = await Promise.all([
      Incident.find(query)
        .populate('reportedBy.userId', 'email role createdAt')
        .populate('reportedBy.guestId', 'guestId createdAt')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(parseInt(limit)),
      Incident.countDocuments(query)
    ]);

    // Format incidents with admin-specific data
    const formattedIncidents = incidents.map(incident => ({
      ...incident.toObject(),
      adminMetrics: {
        ageInHours: incident.ageInHours,
        priority: incident.upvotes >= 20 ? 'urgent' : incident.upvotes >= 10 ? 'high' : 'normal',
        needsAttention: incident.status === INCIDENT_STATUS.REPORTED && incident.ageInHours > 24,
        reporterInfo: incident.reportedBy.userType === 'user' 
          ? { type: 'user', email: incident.reportedBy.userId?.email, role: incident.reportedBy.userId?.role }
          : { type: 'guest', guestId: incident.reportedBy.guestId?.guestId }
      }
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
          status,
          type,
          reporterType,
          priority,
          dateRange: startDate || endDate ? { startDate, endDate } : null,
          search,
          sortBy,
          sortOrder
        },
        summary: {
          totalResults: totalIncidents,
          needsAttention: formattedIncidents.filter(i => i.adminMetrics.needsAttention).length,
          highPriority: formattedIncidents.filter(i => i.adminMetrics.priority === 'high' || i.adminMetrics.priority === 'urgent').length
        }
      },
      message: 'Admin incidents retrieved successfully'
    };

    res.status(HTTP_STATUS.OK).json(response);

  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update incident status
 * PATCH /api/admin/incidents/bulk-status
 * 
 * Updates status for multiple incidents at once
 */
const bulkUpdateIncidentStatus = async (req, res, next) => {
  try {
    const { incidentIds, status, reason } = req.body;

    // Validate status
    if (!Object.values(INCIDENT_STATUS).includes(status)) {
      const error = new Error('Invalid incident status');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      error.details = {
        providedStatus: status,
        validStatuses: Object.values(INCIDENT_STATUS)
      };
      throw error;
    }

    // Validate incident IDs
    if (!Array.isArray(incidentIds) || incidentIds.length === 0) {
      const error = new Error('Incident IDs array is required');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }

    if (incidentIds.length > 100) {
      const error = new Error('Cannot update more than 100 incidents at once');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }

    // Find incidents to update
    const incidents = await Incident.find({
      _id: { $in: incidentIds }
    });

    if (incidents.length === 0) {
      const error = new Error('No valid incidents found');
      error.statusCode = 404;
      error.code = ERROR_CODES.INCIDENT_NOT_FOUND;
      throw error;
    }

    // Update incidents
    const updateResult = await Incident.updateMany(
      { _id: { $in: incidentIds } },
      { 
        status,
        updatedAt: new Date(),
        ...(reason && { statusReason: reason })
      }
    );

    const response = {
      success: true,
      data: {
        requestedUpdates: incidentIds.length,
        foundIncidents: incidents.length,
        updatedIncidents: updateResult.modifiedCount,
        newStatus: status,
        reason: reason || null,
        updatedBy: {
          userId: req.user.userId,
          role: req.user.role
        },
        updatedAt: new Date().toISOString()
      },
      message: `Successfully updated ${updateResult.modifiedCount} incidents to ${status} status`
    };

    res.status(HTTP_STATUS.OK).json(response);

  } catch (error) {
    next(error);
  }
};

/**
 * Delete multiple incidents
 * DELETE /api/admin/incidents/bulk-delete
 * 
 * Deletes multiple incidents (admin only)
 */
const bulkDeleteIncidents = async (req, res, next) => {
  try {
    const { incidentIds, reason } = req.body;

    // Validate incident IDs
    if (!Array.isArray(incidentIds) || incidentIds.length === 0) {
      const error = new Error('Incident IDs array is required');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }

    if (incidentIds.length > 50) {
      const error = new Error('Cannot delete more than 50 incidents at once');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }

    // Find incidents to delete
    const incidents = await Incident.find({
      _id: { $in: incidentIds }
    }).select('_id title type status createdAt');

    if (incidents.length === 0) {
      const error = new Error('No valid incidents found');
      error.statusCode = 404;
      error.code = ERROR_CODES.INCIDENT_NOT_FOUND;
      throw error;
    }

    // Delete incidents
    const deleteResult = await Incident.deleteMany({
      _id: { $in: incidentIds }
    });

    const response = {
      success: true,
      data: {
        requestedDeletions: incidentIds.length,
        foundIncidents: incidents.length,
        deletedIncidents: deleteResult.deletedCount,
        deletedIncidentDetails: incidents.map(incident => ({
          id: incident._id,
          title: incident.title,
          type: incident.type,
          status: incident.status
        })),
        reason: reason || null,
        deletedBy: {
          userId: req.user.userId,
          role: req.user.role
        },
        deletedAt: new Date().toISOString()
      },
      message: `Successfully deleted ${deleteResult.deletedCount} incidents`
    };

    res.status(HTTP_STATUS.OK).json(response);

  } catch (error) {
    next(error);
  }
};

/**
 * Get system analytics
 * GET /api/admin/analytics
 * 
 * Provides detailed system analytics and trends
 */
const getSystemAnalytics = async (req, res, next) => {
  try {
    const { timeframe = '30d' } = req.query;

    // Calculate date ranges
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '24h':
        startDate = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        break;
      case '7d':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case '30d':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      case '90d':
        startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        break;
      default:
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    }

    // Get analytics data
    const [
      incidentTrends,
      userGrowth,
      guestActivity,
      resolutionMetrics,
      popularIncidentTypes,
      geographicDistribution
    ] = await Promise.all([
      // Incident trends over time
      Incident.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ]),

      // User registration growth
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Guest activity patterns
      Guest.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalGuests: { $sum: 1 },
            averageActions: { $avg: '$actionCount' }
          }
        },
        { $sort: { '_id': 1 } }
      ]),

      // Resolution time metrics
      Incident.aggregate([
        { 
          $match: { 
            status: INCIDENT_STATUS.RESOLVED,
            createdAt: { $gte: startDate }
          }
        },
        {
          $project: {
            resolutionTime: { $subtract: ['$updatedAt', '$createdAt'] },
            type: 1
          }
        },
        {
          $group: {
            _id: '$type',
            averageResolutionTime: { $avg: '$resolutionTime' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Popular incident types
      Incident.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalUpvotes: { $sum: '$upvotes' },
            averageUpvotes: { $avg: '$upvotes' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Geographic distribution (if location data available)
      Incident.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            totalWithLocation: { $sum: 1 },
            averageUpvotes: { $avg: '$upvotes' }
          }
        }
      ])
    ]);

    const response = {
      success: true,
      data: {
        timeframe,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        
        trends: {
          incidents: incidentTrends,
          userGrowth,
          guestActivity
        },
        
        performance: {
          resolutionMetrics: resolutionMetrics.map(metric => ({
            type: metric._id,
            averageResolutionHours: Math.round(metric.averageResolutionTime / (1000 * 60 * 60)),
            resolvedCount: metric.count
          })),
          
          popularTypes: popularIncidentTypes.map(type => ({
            type: type._id,
            incidents: type.count,
            totalUpvotes: type.totalUpvotes,
            averageUpvotes: Math.round(type.averageUpvotes || 0)
          }))
        },
        
        insights: {
          totalIncidentsInPeriod: incidentTrends.reduce((sum, trend) => sum + trend.count, 0),
          totalUsersInPeriod: userGrowth.reduce((sum, growth) => sum + growth.count, 0),
          mostActiveDay: incidentTrends.length > 0 
            ? incidentTrends.reduce((max, trend) => trend.count > max.count ? trend : max)._id.date
            : null,
          averageIncidentsPerDay: incidentTrends.length > 0
            ? Math.round(incidentTrends.reduce((sum, trend) => sum + trend.count, 0) / incidentTrends.length)
            : 0
        }
      },
      message: 'System analytics retrieved successfully'
    };

    res.status(HTTP_STATUS.OK).json(response);

  } catch (error) {
    next(error);
  }
};

/**
 * Get user management data
 * GET /api/admin/users
 * 
 * Provides comprehensive user management interface
 */
const getAdminUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'active'
    } = req.query;

    // Build query
    const query = {};

    // Filter by role
    if (role && Object.values(USER_ROLES).includes(role)) {
      query.role = role;
    }

    // Filter by status (active users only by default)
    if (status === 'active') {
      query.role = { $ne: 'deactivated' };
    } else if (status === 'deactivated') {
      query.role = 'deactivated';
    }

    // Search functionality
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('email role createdAt updatedAt')
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // Get additional user metrics
    const userMetrics = await Promise.all(
      users.map(async (user) => {
        const [incidentCount, recentActivity] = await Promise.all([
          Incident.countDocuments({ 'reportedBy.userId': user._id }),
          Incident.findOne({ 'reportedBy.userId': user._id }, {}, { sort: { createdAt: -1 } })
        ]);

        return {
          ...user.toObject(),
          metrics: {
            incidentsReported: incidentCount,
            lastActivity: recentActivity?.createdAt || null,
            accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          }
        };
      })
    );

    const response = {
      success: true,
      data: {
        users: userMetrics,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalUsers,
          pages: Math.ceil(totalUsers / parseInt(limit)),
          hasNext: skip + parseInt(limit) < totalUsers,
          hasPrev: parseInt(page) > 1
        },
        filters: {
          role,
          search,
          status,
          sortBy,
          sortOrder
        }
      },
      message: 'Admin users retrieved successfully'
    };

    res.status(HTTP_STATUS.OK).json(response);

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getAdminIncidents,
  bulkUpdateIncidentStatus,
  bulkDeleteIncidents,
  getSystemAnalytics,
  getAdminUsers
};