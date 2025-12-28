/**
 * Enhanced Incident Model
 * 
 * Comprehensive incident schema with complete status workflow, GeoJSON location,
 * media arrays, status history tracking, assignment fields, and upvote system
 */

const mongoose = require('mongoose');

// Media File Schema for incident attachments
const mediaFileSchema = new mongoose.Schema({
  cloudinaryId: {
    type: String,
    required: true
  },
  publicUrl: {
    type: String,
    required: true
  },
  secureUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true,
    maxlength: 255
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image', 'video', 'audio', 'document']
  },
  mimeType: {
    type: String,
    required: true,
    maxlength: 100
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0,
    max: 50 * 1024 * 1024 // 50MB max
  },
  dimensions: {
    width: Number,
    height: Number
  },
  duration: Number, // For video/audio files in seconds
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'uploadedByModel'
  },
  uploadedByModel: {
    type: String,
    enum: ['User', 'Guest'],
    required: true
  }
}, { _id: true });

// Status History Schema for tracking incident workflow
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      'reported',
      'verified',
      'assigned',
      'in_progress',
      'resolved',
      'closed',
      'duplicate',
      'false_report',
      'cancelled'
    ]
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'changedByModel',
    required: true
  },
  changedByModel: {
    type: String,
    enum: ['User', 'Guest'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    maxlength: 500
  },
  notes: {
    type: String,
    maxlength: 1000
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: true });

// Upvote Schema for incident validation
const upvoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'userModel',
    required: true
  },
  userModel: {
    type: String,
    enum: ['User', 'Guest'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  location: {
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
}, { _id: true });

// Assignment Schema for police/emergency responders
const assignmentSchema = new mongoose.Schema({
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: Date,
  completedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'completed', 'reassigned'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  estimatedResponseTime: Number, // Minutes
  actualResponseTime: Number, // Minutes
  notes: {
    type: String,
    maxlength: 1000
  }
}, { _id: true });

// Main Incident Schema
const incidentSchema = new mongoose.Schema({
  // Basic Incident Information
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 2000
  },
  
  // Incident Classification
  type: {
    type: String,
    required: true,
    enum: [
      'accident',
      'fire',
      'medical_emergency',
      'crime',
      'natural_disaster',
      'infrastructure_failure',
      'public_safety',
      'environmental',
      'other'
    ]
  },
  subtype: {
    type: String,
    maxlength: 100
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Location Information (GeoJSON)
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90;    // latitude
        },
        message: 'Invalid coordinates format'
      }
    }
  },
  
  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    },
    landmark: String,
    formattedAddress: String
  },
  
  // Reporter Information
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'reportedByModel',
    required: true
  },
  reportedByModel: {
    type: String,
    enum: ['User', 'Guest'],
    required: true
  },
  reporterContact: {
    phone: String,
    email: String,
    name: String
  },
  
  // Status and Workflow
  status: {
    type: String,
    required: true,
    enum: [
      'reported',
      'verified',
      'assigned',
      'in_progress',
      'resolved',
      'closed',
      'duplicate',
      'false_report',
      'cancelled'
    ],
    default: 'reported'
  },
  statusHistory: {
    type: [statusHistorySchema],
    default: []
  },
  
  // Priority and Urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Assignment and Response
  assignments: {
    type: [assignmentSchema],
    default: []
  },
  currentAssignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  department: {
    type: String,
    enum: ['police', 'fire', 'medical', 'municipal', 'traffic', 'other'],
    required: true
  },
  jurisdiction: String,
  
  // Media and Evidence
  media: {
    type: [mediaFileSchema],
    validate: {
      validator: function(media) {
        return media.length <= 20; // Max 20 media files per incident
      },
      message: 'Cannot have more than 20 media files per incident'
    }
  },
  
  // Community Validation
  upvotes: {
    type: [upvoteSchema],
    default: []
  },
  upvoteCount: {
    type: Number,
    default: 0,
    min: 0
  },
  verificationScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Timing Information
  incidentTime: {
    type: Date,
    required: true,
    validate: {
      validator: function(date) {
        // Incident time cannot be more than 24 hours in the future
        return date <= new Date(Date.now() + 24 * 60 * 60 * 1000);
      },
      message: 'Incident time cannot be more than 24 hours in the future'
    }
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  verifiedAt: Date,
  assignedAt: Date,
  resolvedAt: Date,
  closedAt: Date,
  
  // Response Metrics
  responseTime: Number, // Minutes from report to first response
  resolutionTime: Number, // Minutes from report to resolution
  
  // Duplicate Detection
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  },
  relatedIncidents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident'
  }],
  
  // Additional Information
  tags: [{
    type: String,
    maxlength: 50
  }],
  visibility: {
    type: String,
    enum: ['public', 'restricted', 'private'],
    default: 'public'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  
  // System Metadata
  source: {
    type: String,
    enum: ['web', 'mobile', 'api', 'phone', 'other'],
    default: 'web'
  },
  ipAddress: String,
  userAgent: String,
  
  // Flags and Moderation
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  flaggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  flaggedAt: Date,
  
  // Analytics and Tracking
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  shareCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Expiration and Cleanup
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
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

// Virtual for incident age in hours
incidentSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.reportedAt) / (60 * 60 * 1000));
});

// Virtual for distance from a point (set dynamically in queries)
incidentSchema.virtual('distance');

// Virtual for current status duration
incidentSchema.virtual('currentStatusDuration').get(function() {
  const lastStatusChange = this.statusHistory.length > 0 
    ? this.statusHistory[this.statusHistory.length - 1].timestamp 
    : this.reportedAt;
  return Math.floor((Date.now() - lastStatusChange) / (60 * 1000)); // Minutes
});

// Virtual for is active (not closed/resolved)
incidentSchema.virtual('isActive').get(function() {
  return !['resolved', 'closed', 'duplicate', 'false_report', 'cancelled'].includes(this.status);
});

// Virtual for needs attention (high priority and old)
incidentSchema.virtual('needsAttention').get(function() {
  return this.isActive && 
         (this.priority === 'high' || this.priority === 'critical') && 
         this.ageInHours > 2;
});

// Indexes for performance and geospatial queries
incidentSchema.index({ location: '2dsphere' }); // Critical for proximity detection
incidentSchema.index({ status: 1, createdAt: -1 });
incidentSchema.index({ type: 1, severity: 1 });
incidentSchema.index({ department: 1, jurisdiction: 1 });
incidentSchema.index({ reportedBy: 1, reportedAt: -1 });
incidentSchema.index({ priority: 1, status: 1 });
incidentSchema.index({ incidentTime: -1 });
incidentSchema.index({ upvoteCount: -1 });
incidentSchema.index({ verificationScore: -1 });

// Compound indexes for complex queries
incidentSchema.index({ status: 1, department: 1, createdAt: -1 });
incidentSchema.index({ type: 1, status: 1, location: '2dsphere' });
incidentSchema.index({ priority: 1, department: 1, status: 1 });
incidentSchema.index({ reportedAt: -1, status: 1 });

// Text index for search functionality
incidentSchema.index({ 
  title: 'text', 
  description: 'text', 
  'address.formattedAddress': 'text',
  tags: 'text'
});

// Pre-save middleware for status history tracking
incidentSchema.pre('save', function(next) {
  try {
    // Track status changes
    if (this.isModified('status') && !this.isNew) {
      const statusChange = {
        status: this.status,
        changedBy: this.modifiedBy || this.reportedBy,
        changedByModel: this.modifiedByModel || this.reportedByModel,
        timestamp: new Date(),
        reason: this.statusChangeReason,
        notes: this.statusChangeNotes
      };
      
      this.statusHistory.push(statusChange);
      
      // Update timing fields based on status
      switch (this.status) {
        case 'verified':
          this.verifiedAt = new Date();
          break;
        case 'assigned':
          this.assignedAt = new Date();
          break;
        case 'resolved':
          this.resolvedAt = new Date();
          this.resolutionTime = Math.floor((Date.now() - this.reportedAt) / (60 * 1000));
          break;
        case 'closed':
          this.closedAt = new Date();
          break;
      }
    }
    
    // Calculate verification score based on upvotes and other factors
    if (this.isModified('upvotes') || this.isModified('upvoteCount')) {
      this.verificationScore = this.calculateVerificationScore();
    }
    
    // Update upvote count
    if (this.isModified('upvotes')) {
      this.upvoteCount = this.upvotes.length;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to add upvote
incidentSchema.methods.addUpvote = async function(userId, userModel, ipAddress, userAgent, location) {
  try {
    // Check if user already upvoted
    const existingUpvote = this.upvotes.find(upvote => 
      upvote.userId.toString() === userId.toString() && upvote.userModel === userModel
    );
    
    if (existingUpvote) {
      throw new Error('User has already upvoted this incident');
    }
    
    // Add upvote
    const upvote = {
      userId,
      userModel,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      location
    };
    
    this.upvotes.push(upvote);
    this.upvoteCount = this.upvotes.length;
    this.verificationScore = this.calculateVerificationScore();
    
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to add upvote: ${error.message}`);
  }
};

// Instance method to remove upvote
incidentSchema.methods.removeUpvote = async function(userId, userModel) {
  try {
    const upvoteIndex = this.upvotes.findIndex(upvote => 
      upvote.userId.toString() === userId.toString() && upvote.userModel === userModel
    );
    
    if (upvoteIndex === -1) {
      throw new Error('Upvote not found');
    }
    
    this.upvotes.splice(upvoteIndex, 1);
    this.upvoteCount = this.upvotes.length;
    this.verificationScore = this.calculateVerificationScore();
    
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to remove upvote: ${error.message}`);
  }
};

// Instance method to calculate verification score
incidentSchema.methods.calculateVerificationScore = function() {
  let score = 0;
  
  // Base score from upvotes (max 50 points)
  score += Math.min(this.upvoteCount * 5, 50);
  
  // Bonus for media evidence (max 20 points)
  score += Math.min(this.media.length * 5, 20);
  
  // Bonus for detailed description (max 10 points)
  if (this.description.length > 100) score += 5;
  if (this.description.length > 500) score += 5;
  
  // Bonus for verified reporter (max 10 points)
  if (this.reportedByModel === 'User') score += 10;
  
  // Penalty for age (incidents lose credibility over time)
  const ageInDays = this.ageInHours / 24;
  if (ageInDays > 7) score -= Math.min(ageInDays - 7, 20);
  
  return Math.max(0, Math.min(score, 100));
};

// Instance method to update status
incidentSchema.methods.updateStatus = async function(newStatus, changedBy, changedByModel, reason, notes) {
  try {
    // Store change metadata for pre-save middleware
    this.modifiedBy = changedBy;
    this.modifiedByModel = changedByModel;
    this.statusChangeReason = reason;
    this.statusChangeNotes = notes;
    
    this.status = newStatus;
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to update status: ${error.message}`);
  }
};

// Instance method to assign incident
incidentSchema.methods.assignTo = async function(assignedTo, assignedBy, priority = 'medium', notes) {
  try {
    const assignment = {
      assignedTo,
      assignedBy,
      assignedAt: new Date(),
      status: 'pending',
      priority,
      notes
    };
    
    this.assignments.push(assignment);
    this.currentAssignment = assignedTo;
    
    // Update incident status if not already assigned
    if (this.status === 'reported' || this.status === 'verified') {
      await this.updateStatus('assigned', assignedBy, 'User', 'Incident assigned', notes);
    }
    
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to assign incident: ${error.message}`);
  }
};

// Instance method to add media
incidentSchema.methods.addMedia = async function(mediaData) {
  try {
    if (this.media.length >= 20) {
      throw new Error('Maximum media limit reached (20 files)');
    }
    
    this.media.push(mediaData);
    return await this.save();
  } catch (error) {
    throw new Error(`Failed to add media: ${error.message}`);
  }
};

// Instance method to flag incident
incidentSchema.methods.flagIncident = async function(reason, flaggedBy) {
  this.isFlagged = true;
  this.flagReason = reason;
  this.flaggedBy = flaggedBy;
  this.flaggedAt = new Date();
  return await this.save();
};

// Static method to find nearby incidents
incidentSchema.statics.findNearby = function(longitude, latitude, maxDistance = 1000) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // meters
      }
    },
    status: { $in: ['reported', 'verified', 'assigned', 'in_progress'] }
  });
};

// Static method to find by status and department
incidentSchema.statics.findByStatusAndDepartment = function(status, department) {
  return this.find({ status, department }).sort({ priority: -1, createdAt: -1 });
};

// Static method to get incident statistics
incidentSchema.statics.getIncidentStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        avgResolutionTime: { $avg: '$resolutionTime' }
      }
    }
  ]);
  
  const typeStats = await this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgSeverity: { $avg: { $cond: [
          { $eq: ['$severity', 'low'] }, 1,
          { $cond: [
            { $eq: ['$severity', 'medium'] }, 2,
            { $cond: [
              { $eq: ['$severity', 'high'] }, 3, 4
            ]}
          ]}
        ]}}
      }
    }
  ]);
  
  return { statusStats: stats, typeStats };
};

// Create and export the model
const Incident = mongoose.model('Incident', incidentSchema);

module.exports = Incident;