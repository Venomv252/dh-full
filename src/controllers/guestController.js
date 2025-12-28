/**
 * Guest Controller
 * Handles guest user creation, action tracking, and limit enforcement
 * Supports anonymous users with limited actions (max 10)
 */

const Guest = require('../models/Guest');
const { GUEST_LIMITS } = require('../config/constants');

/**
 * Create new guest user
 * POST /api/guest/create
 * 
 * Creates a new anonymous guest user with auto-generated guestId
 * Returns guest information including action limits
 */
const createGuest = async (req, res, next) => {
  try {
    // Create new guest with default settings
    const guest = await Guest.createGuest();
    
    // Return guest information
    const response = {
      success: true,
      data: {
        guestId: guest.guestId,
        actionCount: guest.actionCount,
        maxActions: guest.maxActions,
        remainingActions: guest.getRemainingActions(),
        createdAt: guest.createdAt
      },
      message: 'Guest user created successfully'
    };
    
    res.status(201).json(response);
    
  } catch (error) {
    // Handle duplicate guestId error (very rare due to UUID generation)
    if (error.code === 11000 && error.keyPattern?.guestId) {
      error.message = 'Failed to generate unique guest ID, please try again';
      error.statusCode = 500;
      error.code = 'GUEST_ID_GENERATION_ERROR';
    }
    
    next(error);
  }
};

/**
 * Get guest information by guestId
 * GET /api/guest/:guestId
 * 
 * Retrieves guest information including current action count and limits
 */
const getGuest = async (req, res, next) => {
  try {
    const { guestId } = req.params;
    
    // Find guest by guestId
    const guest = await Guest.findByGuestId(guestId);
    
    if (!guest) {
      const error = new Error('Guest not found');
      error.statusCode = 404;
      error.code = 'GUEST_NOT_FOUND';
      throw error;
    }
    
    // Update last active timestamp
    guest.lastActiveAt = new Date();
    await guest.save();
    
    // Return guest status
    const response = {
      success: true,
      data: guest.getStatus(),
      message: 'Guest information retrieved successfully'
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Increment guest action count
 * POST /api/guest/:guestId/action
 * 
 * Increments the action count for a guest user
 * Enforces action limits and prevents exceeding maximum actions
 */
const incrementGuestAction = async (req, res, next) => {
  try {
    const { guestId } = req.params;
    const { actionType } = req.body; // Optional: track action type for analytics
    
    // Find guest by guestId
    const guest = await Guest.findByGuestId(guestId);
    
    if (!guest) {
      const error = new Error('Guest not found');
      error.statusCode = 404;
      error.code = 'GUEST_NOT_FOUND';
      throw error;
    }
    
    // Check if guest can perform action
    if (!guest.canPerformAction()) {
      const error = new Error('Guest has reached maximum action limit. Please register to continue.');
      error.statusCode = 403;
      error.code = 'GUEST_ACTION_LIMIT_EXCEEDED';
      error.details = {
        actionCount: guest.actionCount,
        maxActions: guest.maxActions,
        requiresRegistration: true
      };
      throw error;
    }
    
    // Increment action count
    await guest.incrementActionCount();
    
    // Prepare response
    const response = {
      success: true,
      data: {
        guestId: guest.guestId,
        actionCount: guest.actionCount,
        maxActions: guest.maxActions,
        remainingActions: guest.getRemainingActions(),
        canPerformAction: guest.canPerformAction(),
        actionType: actionType || 'unknown'
      },
      message: guest.canPerformAction() 
        ? 'Action recorded successfully'
        : 'Action recorded. You have reached your limit - please register to continue.'
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Validate guest action eligibility
 * GET /api/guest/:guestId/can-act
 * 
 * Checks if a guest can perform actions without incrementing count
 * Used for UI state management and action validation
 */
const canGuestAct = async (req, res, next) => {
  try {
    const { guestId } = req.params;
    
    // Find guest by guestId
    const guest = await Guest.findByGuestId(guestId);
    
    if (!guest) {
      const error = new Error('Guest not found');
      error.statusCode = 404;
      error.code = 'GUEST_NOT_FOUND';
      throw error;
    }
    
    // Update last active timestamp (lightweight activity tracking)
    guest.lastActiveAt = new Date();
    await guest.save();
    
    const canAct = guest.canPerformAction();
    
    const response = {
      success: true,
      data: {
        guestId: guest.guestId,
        canPerformAction: canAct,
        actionCount: guest.actionCount,
        maxActions: guest.maxActions,
        remainingActions: guest.getRemainingActions(),
        requiresRegistration: !canAct,
        isActive: guest.isActive()
      },
      message: canAct 
        ? 'Guest can perform actions'
        : 'Guest has reached action limit - registration required'
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Get guest statistics (admin only)
 * GET /api/guest/stats
 * 
 * Returns system-wide guest statistics for monitoring and analytics
 */
const getGuestStatistics = async (req, res, next) => {
  try {
    // Get comprehensive guest statistics
    const stats = await Guest.getStatistics();
    
    // Add additional computed metrics
    const activePercentage = stats.totalGuests > 0 
      ? Math.round((stats.activeGuests / stats.totalGuests) * 100)
      : 0;
    
    const limitReachedPercentage = stats.totalGuests > 0
      ? Math.round((stats.guestsAtLimit / stats.totalGuests) * 100)
      : 0;
    
    const response = {
      success: true,
      data: {
        ...stats,
        activePercentage,
        limitReachedPercentage,
        systemLimits: {
          maxActions: GUEST_LIMITS.MAX_ACTIONS,
          actionWindowHours: GUEST_LIMITS.ACTION_WINDOW_HOURS || 24
        }
      },
      message: 'Guest statistics retrieved successfully'
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Cleanup inactive guests (admin only)
 * DELETE /api/guest/cleanup
 * 
 * Removes inactive guest records to maintain database performance
 * Configurable inactivity period (default: 7 days)
 */
const cleanupInactiveGuests = async (req, res, next) => {
  try {
    const { daysInactive = 7 } = req.query;
    
    // Validate days parameter
    const days = parseInt(daysInactive);
    if (isNaN(days) || days < 1) {
      const error = new Error('Invalid daysInactive parameter. Must be a positive integer.');
      error.statusCode = 400;
      error.code = 'INVALID_CLEANUP_PARAMETER';
      throw error;
    }
    
    // Perform cleanup
    const result = await Guest.cleanupInactiveGuests(days);
    
    const response = {
      success: true,
      data: {
        deletedCount: result.deletedCount,
        cutoffTime: result.cutoffTime,
        daysInactive: days
      },
      message: `Cleaned up ${result.deletedCount} inactive guest records`
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * List active guests (admin only)
 * GET /api/guest/active
 * 
 * Returns list of currently active guests for monitoring
 */
const getActiveGuests = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      const error = new Error('Invalid page parameter');
      error.statusCode = 400;
      error.code = 'INVALID_PAGINATION';
      throw error;
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      const error = new Error('Invalid limit parameter. Must be between 1 and 100.');
      error.statusCode = 400;
      error.code = 'INVALID_PAGINATION';
      throw error;
    }
    
    // Get active guests with pagination
    const skip = (pageNum - 1) * limitNum;
    const activeGuests = await Guest.findActiveGuests()
      .skip(skip)
      .limit(limitNum);
    
    // Get total count for pagination
    const totalActive = await Guest.countDocuments({
      lastActiveAt: { 
        $gte: new Date(Date.now() - (24 * 60 * 60 * 1000))
      }
    });
    
    const response = {
      success: true,
      data: {
        guests: activeGuests.map(guest => guest.getStatus()),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalActive,
          pages: Math.ceil(totalActive / limitNum),
          hasNext: pageNum < Math.ceil(totalActive / limitNum),
          hasPrev: pageNum > 1
        }
      },
      message: 'Active guests retrieved successfully'
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGuest,
  getGuest,
  incrementGuestAction,
  canGuestAct,
  getGuestStatistics,
  cleanupInactiveGuests,
  getActiveGuests
};