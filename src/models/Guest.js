/**
 * Enhanced Guest Model
 * 
 * Comprehensive guest schema for anonymous users with auto-generated IDs,
 * IP tracking, action count limits, and session management functionality
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Guest Action Schema for tracking individual actions
const guestActionSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'incident_report',
      'incident_view',
      'incident_upvote',
      'media_upload',
      'location_check',
      'proximity_check',
      'page_view',
      'search',
      'other'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for action-specific data
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    maxlength: 500
  },
  sessionId: {
    type: String,
    required: true
  }
}, { _id: true });

// Main Guest Schema
const guestSchema = new mongoose.Schema({
  // Unique Guest Identifier
  guestId: {
    type: String,
    unique: true,
    required: true,
    default: () => `guest_${uuidv4().replace(/-/g, '')}`
  },
  
  // IP and Session Tracking
  ipAddress: {
    type: String,
    required: true,
    validate: {
      validator: function(ip) {
        // Basic IP validation (IPv4 and IPv6)
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
        return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1' || ip === '127.0.0.1';
      },
      message: 'Invalid IP address format'
    }
  },
  
  // Session Management
  sessionId: {
    type: String,
    required: true,
    default: () => uuidv4()
  },
  sessionStartTime: {
    type: Date,
    default: Date.now
  },
  sessionEndTime: {
    type: Date
  },
  isSessionActive: {
    type: Boolean,
    default: true
  },
  
  // Browser and Device Information
  userAgent: {
    type: String,
    maxlength: 500
  },
  browserInfo: {
    name: String,
    version: String,
    os: String,
    device: String
  },
  
  // Action Tracking and Limits
  totalActions: {
    type: Number,
    default: 0,
    min: 0
  },
  dailyActions: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActionAt: {
    type: Date,
    default: Date.now
  },
  lastDailyReset: {
    type: Date,
    default: Date.now
  },
  
  // Action History
  actions: {
    type: [guestActionSchema],
    validate: {
      validator: function(actions) {
        return actions.length <= 1000; // Limit action history
      },
      message: 'Action history cannot exceed 1000 entries'
    }
  },
  
  // Rate Limiting and Restrictions
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    maxlength: 200
  },
  blockedAt: {
    type: Date
  },
  blockExpiresAt: {
    type: Date
  },
  
  // Incident Reporting Limits
  incidentsReported: {
    type: Number,
    default: 0,
    min: 0
  },
  dailyIncidentReports: {
    type: Number,
    default: 0,
    min: 0
  },
  lastIncidentReportAt: {
    type: Date
  },
  
  // Media Upload Limits
  mediaUploaded: {
    type: Number,
    default: 0,
    min: 0
  },
  dailyMediaUploads: {
    type: Number,
    default: 0,
    min: 0
  },
  totalMediaSize: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Geographic Information
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: function(coords) {
            return coords.length === 2 && 
                   coords[0] >= -180 && coords[0] <= 180 && // longitude
                   coords[1] >= -90 && coords[1] <= 90;    // latitude
          },
          message: 'Invalid coordinates format'
        }
      }
    }
  },
  
  // Conversion Tracking
  convertedToUser: {
    type: Boolean,
    default: false
  },
  convertedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  convertedAt: {
    type: Date
  },
  
  // Cleanup and Expiration
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: { expireAfterSeconds: 0 }
  },
  
  // Metadata
  createdFrom: {
    type: String,
    enum: ['web', 'mobile', 'api', 'unknown'],
    default: 'web'
  },
  referrer: {
    type: String,
    maxlength: 500
  },
  
  // Privacy and Compliance
  dataRetentionConsent: {
    type: Boolean,
    default: false
  },
  privacyPolicyAccepted: {
    type: Boolean,
    default: false
  },
  privacyPolicyVersion: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.__v;
      delete ret.ipAddress; // Don't expose IP in API responses
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for session duration
guestSchema.virtual('sessionDuration').get(function() {
  if (!this.sessionStartTime) return 0;
  const endTime = this.sessionEndTime || new Date();
  return Math.floor((endTime - this.sessionStartTime) / 1000); // Duration in seconds
});

// Virtual for actions today
guestSchema.virtual('actionsToday').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return this.actions.filter(action => 
    action.timestamp >= today
  ).length;
});

// Virtual for remaining daily actions
guestSchema.virtual('remainingDailyActions').get(function() {
  const maxDailyActions = this.getMaxDailyActions();
  return Math.max(0, maxDailyActions - this.dailyActions);
});

// Virtual for can perform action
guestSchema.virtual('canPerformAction').get(function() {
  return !this.isBlocked && 
         this.isSessionActive && 
         this.remainingDailyActions > 0 &&
         (!this.blockExpiresAt || this.blockExpiresAt < new Date());
});

// Indexes for performance
guestSchema.index({ guestId: 1 }, { unique: true });
guestSchema.index({ ipAddress: 1, createdAt: -1 });
guestSchema.index({ sessionId: 1 });
guestSchema.index({ isSessionActive: 1, lastActionAt: -1 });
guestSchema.index({ convertedToUser: 1, convertedAt: -1 });
guestSchema.index({ isBlocked: 1, blockExpiresAt: 1 });
guestSchema.index({ expiresAt: 1 }); // For TTL cleanup

// Compound indexes
guestSchema.index({ ipAddress: 1, isBlocked: 1 });
guestSchema.index({ sessionId: 1, isSessionActive: 1 });
guestSchema.index({ createdAt: -1, totalActions: -1 });

// Pre-save middleware for daily action reset
guestSchema.pre('save', function(next) {
  try {
    const now = new Date();
    const lastReset = this.lastDailyReset || this.createdAt;
    
    // Reset daily counters if it's a new day
    if (lastReset.toDateString() !== now.toDateString()) {
      this.dailyActions = 0;
      this.dailyIncidentReports = 0;
      this.dailyMediaUploads = 0;
      this.lastDailyReset = now;
    }
    
    // Update last action time if actions were modified
    if (this.isModified('actions') || this.isModified('totalActions')) {
      this.lastActionAt = now;
    }
    
    // Auto-unblock if block has expired
    if (this.isBlocked && this.blockExpiresAt && this.blockExpiresAt <= now) {
      this.isBlocked = false;
      this.blockReason = undefined;
      this.blockedAt = undefined;
      this.blockExpiresAt = undefined;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to get maximum daily actions based on guest behavior
guestSchema.methods.getMaxDailyActions = function() {
  // Base limit for new guests
  let maxActions = 10;
  
  // Increase limit based on session duration and behavior
  const sessionHours = this.sessionDuration / 3600;
  if (sessionHours > 1) maxActions += 5;
  if (sessionHours > 4) maxActions += 10;
  
  // Increase limit for guests with good behavior history
  const daysSinceCreation = Math.floor((Date.now() - this.createdAt) / (24 * 60 * 60 * 1000));
  if (daysSinceCreation > 7) maxActions += 5;
  if (daysSinceCreation > 30) maxActions += 10;
  
  // Decrease limit for guests with many actions
  if (this.totalActions > 100) maxActions = Math.max(5, maxActions - 5);
  
  return Math.min(maxActions, 50); // Cap at 50 actions per day
};

// Instance method to record an action
guestSchema.methods.recordAction = async function(actionType, details = {}, request = {}) {
  try {
    // Check if guest can perform action
    if (!this.canPerformAction) {
      throw new Error('Guest cannot perform action: blocked or limit exceeded');
    }
    
    // Create action record
    const action = {
      action: actionType,
      details: details,
      timestamp: new Date(),
      ipAddress: request.ip || this.ipAddress,
      userAgent: request.get ? request.get('User-Agent') : this.userAgent,
      sessionId: this.sessionId
    };
    
    // Add action to history
    this.actions.push(action);
    
    // Update counters
    this.totalActions += 1;
    this.dailyActions += 1;
    
    // Update specific counters based on action type
    if (actionType === 'incident_report') {
      this.incidentsReported += 1;
      this.dailyIncidentReports += 1;
      this.lastIncidentReportAt = new Date();
    } else if (actionType === 'media_upload') {
      this.mediaUploaded += 1;
      this.dailyMediaUploads += 1;
      if (details.fileSize) {
        this.totalMediaSize += details.fileSize;
      }
    }
    
    // Trim action history if it gets too long
    if (this.actions.length > 1000) {
      this.actions = this.actions.slice(-500); // Keep last 500 actions
    }
    
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to record action: ${error.message}`);
  }
};

// Instance method to block guest
guestSchema.methods.blockGuest = async function(reason, durationHours = 24) {
  this.isBlocked = true;
  this.blockReason = reason;
  this.blockedAt = new Date();
  this.blockExpiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
  return await this.save();
};

// Instance method to unblock guest
guestSchema.methods.unblockGuest = async function() {
  this.isBlocked = false;
  this.blockReason = undefined;
  this.blockedAt = undefined;
  this.blockExpiresAt = undefined;
  return await this.save();
};

// Instance method to end session
guestSchema.methods.endSession = async function() {
  this.isSessionActive = false;
  this.sessionEndTime = new Date();
  return await this.save();
};

// Instance method to convert to user
guestSchema.methods.convertToUser = async function(userId) {
  this.convertedToUser = true;
  this.convertedUserId = userId;
  this.convertedAt = new Date();
  this.isSessionActive = false;
  this.sessionEndTime = new Date();
  return await this.save();
};

// Instance method to extend expiration
guestSchema.methods.extendExpiration = async function(days = 30) {
  this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return await this.save();
};

// Instance method to get action summary
guestSchema.methods.getActionSummary = function() {
  const actionCounts = {};
  this.actions.forEach(action => {
    actionCounts[action.action] = (actionCounts[action.action] || 0) + 1;
  });
  
  return {
    totalActions: this.totalActions,
    dailyActions: this.dailyActions,
    actionBreakdown: actionCounts,
    sessionDuration: this.sessionDuration,
    incidentsReported: this.incidentsReported,
    mediaUploaded: this.mediaUploaded,
    remainingDailyActions: this.remainingDailyActions
  };
};

// Static method to find by guest ID
guestSchema.statics.findByGuestId = function(guestId) {
  return this.findOne({ guestId, isSessionActive: true });
};

// Static method to find active guests by IP
guestSchema.statics.findActiveByIP = function(ipAddress) {
  return this.find({ 
    ipAddress, 
    isSessionActive: true,
    isBlocked: false 
  }).sort({ lastActionAt: -1 });
};

// Static method to cleanup expired sessions
guestSchema.statics.cleanupExpiredSessions = async function() {
  const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  const result = await this.updateMany(
    { 
      isSessionActive: true,
      lastActionAt: { $lt: cutoffTime }
    },
    { 
      isSessionActive: false,
      sessionEndTime: new Date()
    }
  );
  
  return result;
};

// Static method to get guest statistics
guestSchema.statics.getGuestStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalGuests: { $sum: 1 },
        activeGuests: { $sum: { $cond: ['$isSessionActive', 1, 0] } },
        blockedGuests: { $sum: { $cond: ['$isBlocked', 1, 0] } },
        convertedGuests: { $sum: { $cond: ['$convertedToUser', 1, 0] } },
        totalActions: { $sum: '$totalActions' },
        totalIncidents: { $sum: '$incidentsReported' },
        avgSessionDuration: { $avg: '$sessionDuration' }
      }
    }
  ]);
  
  return stats[0] || {};
};

// Static method to find guests by location
guestSchema.statics.findByLocation = function(country, region = null) {
  const query = { 'location.country': country };
  if (region) {
    query['location.region'] = region;
  }
  return this.find(query).sort({ createdAt: -1 });
};

// Create and export the model
const Guest = mongoose.model('Guest', guestSchema);

module.exports = Guest;