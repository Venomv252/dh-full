/**
 * AuditLog Model
 * 
 * Comprehensive audit logging system for tracking all sensitive operations,
 * data access, status changes, and user actions across the platform
 */

const mongoose = require('mongoose');

// Request Context Schema for capturing HTTP request details
const requestContextSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']
  },
  url: {
    type: String,
    required: true,
    maxlength: 500
  },
  path: {
    type: String,
    required: true,
    maxlength: 200
  },
  query: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  headers: {
    userAgent: String,
    referer: String,
    acceptLanguage: String,
    contentType: String
  },
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
  sessionId: String,
  requestId: String
}, { _id: false });

// Data Change Schema for tracking field-level changes
const dataChangeSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
    maxlength: 100
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  changeType: {
    type: String,
    enum: ['create', 'update', 'delete', 'encrypt', 'decrypt'],
    required: true
  }
}, { _id: false });

// Security Context Schema for security-related information
const securityContextSchema = new mongoose.Schema({
  authenticationMethod: {
    type: String,
    enum: ['jwt', 'session', 'api_key', 'guest', 'system'],
    required: true
  },
  permissions: [{
    type: String,
    maxlength: 50
  }],
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  sensitiveDataAccessed: {
    type: Boolean,
    default: false
  },
  encryptedDataAccessed: {
    type: Boolean,
    default: false
  },
  adminAction: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Main AuditLog Schema
const auditLogSchema = new mongoose.Schema({
  // Event Classification
  eventType: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'user_login',
      'user_logout',
      'user_registration',
      'password_change',
      'password_reset',
      'account_locked',
      'account_unlocked',
      
      // Data access events
      'data_read',
      'data_create',
      'data_update',
      'data_delete',
      'data_export',
      'data_import',
      
      // Incident events
      'incident_created',
      'incident_updated',
      'incident_status_changed',
      'incident_assigned',
      'incident_resolved',
      'incident_upvoted',
      'incident_flagged',
      
      // User management events
      'user_created',
      'user_updated',
      'user_banned',
      'user_unbanned',
      'user_role_changed',
      'user_deleted',
      
      // System events
      'system_config_changed',
      'backup_created',
      'backup_restored',
      'maintenance_started',
      'maintenance_completed',
      
      // Security events
      'unauthorized_access',
      'suspicious_activity',
      'data_breach_detected',
      'security_scan',
      'vulnerability_detected',
      
      // Medical data events (HIPAA compliance)
      'patient_data_accessed',
      'patient_data_updated',
      'patient_search_performed',
      'medical_record_viewed',
      
      // Administrative events
      'admin_login',
      'admin_action',
      'policy_updated',
      'audit_log_accessed',
      
      // Other events
      'file_upload',
      'file_download',
      'api_call',
      'error_occurred',
      'other'
    ]
  },
  
  // Event Details
  action: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Actor Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel'
  },
  userModel: {
    type: String,
    enum: ['User', 'Guest', 'System'],
    default: 'User'
  },
  userName: {
    type: String,
    maxlength: 100
  },
  userRole: {
    type: String,
    enum: ['user', 'police', 'hospital', 'admin', 'guest', 'system'],
    required: true
  },
  
  // Target Resource Information
  resourceType: {
    type: String,
    enum: ['User', 'Guest', 'Incident', 'AuditLog', 'System', 'File', 'Configuration'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  resourceIdentifier: {
    type: String,
    maxlength: 200
  },
  
  // Request Context
  requestContext: {
    type: requestContextSchema,
    required: true
  },
  
  // Data Changes (for update operations)
  dataChanges: {
    type: [dataChangeSchema],
    default: []
  },
  
  // Security Context
  securityContext: {
    type: securityContextSchema,
    required: true
  },
  
  // Outcome and Status
  outcome: {
    type: String,
    enum: ['success', 'failure', 'partial', 'blocked', 'error'],
    required: true
  },
  statusCode: {
    type: Number,
    min: 100,
    max: 599
  },
  errorMessage: {
    type: String,
    maxlength: 500
  },
  
  // Timing Information
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  duration: {
    type: Number, // Milliseconds
    min: 0
  },
  
  // Compliance and Regulatory
  complianceFlags: {
    hipaa: {
      type: Boolean,
      default: false
    },
    gdpr: {
      type: Boolean,
      default: false
    },
    pci: {
      type: Boolean,
      default: false
    },
    sox: {
      type: Boolean,
      default: false
    }
  },
  
  // Geolocation (for compliance and security)
  location: {
    country: String,
    region: String,
    city: String,
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
  
  // Additional Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Correlation and Tracing
  correlationId: {
    type: String,
    maxlength: 100
  },
  parentEventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuditLog'
  },
  childEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AuditLog'
  }],
  
  // Retention and Archival
  retentionPeriod: {
    type: Number, // Days
    default: 2555, // 7 years for compliance
    min: 1
  },
  archiveAfter: {
    type: Date,
    default: function() {
      return new Date(Date.now() + this.retentionPeriod * 24 * 60 * 60 * 1000);
    }
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  
  // Integrity and Verification
  checksum: {
    type: String,
    maxlength: 64
  },
  signature: {
    type: String,
    maxlength: 256
  },
  
  // System Information
  systemVersion: {
    type: String,
    maxlength: 20
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'production'
  }
}, {
  timestamps: false, // We use our own timestamp field
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Remove sensitive fields from JSON output
      delete ret.__v;
      delete ret.signature; // Don't expose signature in API responses
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Virtual for event age in hours
auditLogSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.timestamp) / (60 * 60 * 1000));
});

// Virtual for is recent (within last 24 hours)
auditLogSchema.virtual('isRecent').get(function() {
  return this.ageInHours <= 24;
});

// Virtual for is high risk
auditLogSchema.virtual('isHighRisk').get(function() {
  return this.securityContext.riskLevel === 'high' || 
         this.securityContext.riskLevel === 'critical' ||
         this.securityContext.sensitiveDataAccessed ||
         this.outcome === 'failure' ||
         this.outcome === 'blocked';
});

// Virtual for requires attention
auditLogSchema.virtual('requiresAttention').get(function() {
  return this.isHighRisk || 
         this.eventType.includes('unauthorized') ||
         this.eventType.includes('suspicious') ||
         this.eventType.includes('breach');
});

// Indexes for performance and compliance queries
auditLogSchema.index({ timestamp: -1 }); // Most common query
auditLogSchema.index({ eventType: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ userRole: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ outcome: 1, timestamp: -1 });
auditLogSchema.index({ 'requestContext.ipAddress': 1, timestamp: -1 });
auditLogSchema.index({ correlationId: 1 });
auditLogSchema.index({ archiveAfter: 1 }); // For cleanup jobs

// Compound indexes for complex queries
auditLogSchema.index({ 
  eventType: 1, 
  'securityContext.riskLevel': 1, 
  timestamp: -1 
});
auditLogSchema.index({ 
  userRole: 1, 
  'securityContext.sensitiveDataAccessed': 1, 
  timestamp: -1 
});
auditLogSchema.index({ 
  resourceType: 1, 
  action: 1, 
  timestamp: -1 
});

// Compliance-specific indexes
auditLogSchema.index({ 'complianceFlags.hipaa': 1, timestamp: -1 });
auditLogSchema.index({ 'complianceFlags.gdpr': 1, timestamp: -1 });

// Pre-save middleware for integrity and validation
auditLogSchema.pre('save', function(next) {
  try {
    // Set compliance flags based on event type and data
    if (this.eventType.includes('patient') || this.eventType.includes('medical')) {
      this.complianceFlags.hipaa = true;
    }
    
    if (this.securityContext.sensitiveDataAccessed) {
      this.complianceFlags.gdpr = true;
    }
    
    // Set risk level based on event type
    if (!this.securityContext.riskLevel || this.securityContext.riskLevel === 'low') {
      if (this.eventType.includes('unauthorized') || 
          this.eventType.includes('suspicious') ||
          this.eventType.includes('breach')) {
        this.securityContext.riskLevel = 'critical';
      } else if (this.securityContext.adminAction || 
                 this.eventType.includes('admin') ||
                 this.eventType.includes('delete')) {
        this.securityContext.riskLevel = 'high';
      } else if (this.securityContext.sensitiveDataAccessed) {
        this.securityContext.riskLevel = 'medium';
      }
    }
    
    // Generate checksum for integrity
    if (!this.checksum) {
      const crypto = require('crypto');
      const dataToHash = JSON.stringify({
        eventType: this.eventType,
        action: this.action,
        userId: this.userId,
        resourceType: this.resourceType,
        resourceId: this.resourceId,
        timestamp: this.timestamp,
        outcome: this.outcome
      });
      this.checksum = crypto.createHash('sha256').update(dataToHash).digest('hex');
    }
    
    // Set system information
    if (!this.systemVersion) {
      this.systemVersion = process.env.APP_VERSION || '1.0.0';
    }
    
    if (!this.environment) {
      this.environment = process.env.NODE_ENV || 'production';
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to log an event
auditLogSchema.statics.logEvent = async function(eventData) {
  try {
    const auditLog = new this(eventData);
    return await auditLog.save();
  } catch (error) {
    // Audit logging should never fail the main operation
    console.error('Audit logging failed:', error);
    return null;
  }
};

// Static method to log user action
auditLogSchema.statics.logUserAction = async function(
  eventType, 
  action, 
  description, 
  userId, 
  userModel, 
  userRole, 
  resourceType, 
  resourceId, 
  requestContext, 
  outcome = 'success',
  metadata = {}
) {
  return await this.logEvent({
    eventType,
    action,
    description,
    userId,
    userModel,
    userRole,
    resourceType,
    resourceId,
    requestContext,
    securityContext: {
      authenticationMethod: 'jwt',
      riskLevel: 'low'
    },
    outcome,
    metadata
  });
};

// Static method to log data access
auditLogSchema.statics.logDataAccess = async function(
  userId,
  userModel,
  userRole,
  resourceType,
  resourceId,
  action,
  requestContext,
  sensitiveData = false,
  encryptedData = false
) {
  return await this.logEvent({
    eventType: 'data_read',
    action,
    description: `${userRole} accessed ${resourceType} data`,
    userId,
    userModel,
    userRole,
    resourceType,
    resourceId,
    requestContext,
    securityContext: {
      authenticationMethod: 'jwt',
      sensitiveDataAccessed: sensitiveData,
      encryptedDataAccessed: encryptedData,
      riskLevel: sensitiveData ? 'medium' : 'low'
    },
    outcome: 'success',
    complianceFlags: {
      hipaa: resourceType === 'User' && sensitiveData,
      gdpr: sensitiveData
    }
  });
};

// Static method to log security event
auditLogSchema.statics.logSecurityEvent = async function(
  eventType,
  description,
  requestContext,
  riskLevel = 'high',
  userId = null,
  userRole = 'unknown'
) {
  return await this.logEvent({
    eventType,
    action: 'security_event',
    description,
    userId,
    userModel: userId ? 'User' : 'System',
    userRole,
    resourceType: 'System',
    requestContext,
    securityContext: {
      authenticationMethod: userId ? 'jwt' : 'system',
      riskLevel
    },
    outcome: 'blocked'
  });
};

// Static method to get audit statistics
auditLogSchema.statics.getAuditStats = async function(timeRange = 24) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
  
  const stats = await this.aggregate([
    { $match: { timestamp: { $gte: startTime } } },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        successCount: { $sum: { $cond: [{ $eq: ['$outcome', 'success'] }, 1, 0] } },
        failureCount: { $sum: { $cond: [{ $eq: ['$outcome', 'failure'] }, 1, 0] } },
        highRiskCount: { $sum: { $cond: [{ $in: ['$securityContext.riskLevel', ['high', 'critical']] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  const userStats = await this.aggregate([
    { $match: { timestamp: { $gte: startTime } } },
    {
      $group: {
        _id: '$userRole',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        _id: 1,
        count: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    }
  ]);
  
  return { eventStats: stats, userStats };
};

// Static method to find suspicious activities
auditLogSchema.statics.findSuspiciousActivities = async function(timeRange = 24) {
  const startTime = new Date(Date.now() - timeRange * 60 * 60 * 1000);
  
  return await this.find({
    timestamp: { $gte: startTime },
    $or: [
      { 'securityContext.riskLevel': { $in: ['high', 'critical'] } },
      { outcome: { $in: ['failure', 'blocked'] } },
      { eventType: { $regex: /unauthorized|suspicious|breach/ } }
    ]
  }).sort({ timestamp: -1 }).limit(100);
};

// Static method to cleanup old logs
auditLogSchema.statics.cleanupOldLogs = async function() {
  const cutoffDate = new Date();
  
  // Archive logs older than their retention period
  const archiveResult = await this.updateMany(
    { 
      archiveAfter: { $lt: cutoffDate },
      isArchived: false 
    },
    { isArchived: true }
  );
  
  // Delete archived logs older than 10 years (regulatory maximum)
  const deleteDate = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000);
  const deleteResult = await this.deleteMany({
    isArchived: true,
    timestamp: { $lt: deleteDate }
  });
  
  return { archived: archiveResult.modifiedCount, deleted: deleteResult.deletedCount };
};

// Create and export the model
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;