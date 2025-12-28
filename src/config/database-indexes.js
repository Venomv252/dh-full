/**
 * Database Indexes Configuration
 * 
 * Comprehensive database index definitions for optimal performance
 * including geospatial indexes, compound indexes, and text search indexes
 */

const mongoose = require('mongoose');

/**
 * Database Index Definitions
 * Organized by collection with performance-critical indexes
 */
const DATABASE_INDEXES = {
  // User Collection Indexes
  users: [
    // Unique indexes for data integrity
    { fields: { email: 1 }, options: { unique: true, name: 'idx_users_email_unique' } },
    { fields: { 'phone.encrypted': 1 }, options: { unique: true, sparse: true, name: 'idx_users_phone_unique' } },
    
    // Performance indexes for common queries
    { fields: { role: 1 }, options: { name: 'idx_users_role' } },
    { fields: { department: 1 }, options: { name: 'idx_users_department' } },
    { fields: { jurisdiction: 1 }, options: { name: 'idx_users_jurisdiction' } },
    { fields: { isActive: 1, createdAt: -1 }, options: { name: 'idx_users_active_created' } },
    { fields: { lastLogin: -1 }, options: { name: 'idx_users_last_login' } },
    { fields: { lastActiveAt: -1 }, options: { name: 'idx_users_last_active' } },
    
    // Compound indexes for complex queries
    { fields: { role: 1, department: 1 }, options: { name: 'idx_users_role_department' } },
    { fields: { role: 1, isActive: 1 }, options: { name: 'idx_users_role_active' } },
    { fields: { isActive: 1, isBanned: 1 }, options: { name: 'idx_users_active_banned' } },
    { fields: { department: 1, jurisdiction: 1, isActive: 1 }, options: { name: 'idx_users_dept_jurisdiction_active' } }
  ],

  // Guest Collection Indexes
  guests: [
    // Unique index for guest identification
    { fields: { guestId: 1 }, options: { unique: true, name: 'idx_guests_guest_id_unique' } },
    
    // Performance indexes
    { fields: { ipAddress: 1, createdAt: -1 }, options: { name: 'idx_guests_ip_created' } },
    { fields: { sessionId: 1 }, options: { name: 'idx_guests_session_id' } },
    { fields: { isSessionActive: 1, lastActionAt: -1 }, options: { name: 'idx_guests_active_last_action' } },
    { fields: { convertedToUser: 1, convertedAt: -1 }, options: { name: 'idx_guests_converted' } },
    { fields: { isBlocked: 1, blockExpiresAt: 1 }, options: { name: 'idx_guests_blocked_expires' } },
    { fields: { expiresAt: 1 }, options: { name: 'idx_guests_expires_ttl' } },
    
    // Compound indexes
    { fields: { ipAddress: 1, isBlocked: 1 }, options: { name: 'idx_guests_ip_blocked' } },
    { fields: { sessionId: 1, isSessionActive: 1 }, options: { name: 'idx_guests_session_active' } },
    { fields: { createdAt: -1, totalActions: -1 }, options: { name: 'idx_guests_created_actions' } }
  ],

  // Incident Collection Indexes (Critical for Performance)
  incidents: [
    // CRITICAL: 2dsphere index for geospatial queries and proximity detection
    { fields: { location: '2dsphere' }, options: { name: 'idx_incidents_location_2dsphere' } },
    
    // Core performance indexes
    { fields: { status: 1, createdAt: -1 }, options: { name: 'idx_incidents_status_created' } },
    { fields: { type: 1, severity: 1 }, options: { name: 'idx_incidents_type_severity' } },
    { fields: { department: 1, jurisdiction: 1 }, options: { name: 'idx_incidents_dept_jurisdiction' } },
    { fields: { reportedBy: 1, reportedAt: -1 }, options: { name: 'idx_incidents_reporter_date' } },
    { fields: { priority: 1, status: 1 }, options: { name: 'idx_incidents_priority_status' } },
    { fields: { incidentTime: -1 }, options: { name: 'idx_incidents_incident_time' } },
    { fields: { upvoteCount: -1 }, options: { name: 'idx_incidents_upvote_count' } },
    { fields: { verificationScore: -1 }, options: { name: 'idx_incidents_verification_score' } },
    
    // Compound indexes for complex dashboard queries
    { fields: { status: 1, department: 1, createdAt: -1 }, options: { name: 'idx_incidents_status_dept_created' } },
    { fields: { type: 1, status: 1, location: '2dsphere' }, options: { name: 'idx_incidents_type_status_location' } },
    { fields: { priority: 1, department: 1, status: 1 }, options: { name: 'idx_incidents_priority_dept_status' } },
    { fields: { reportedAt: -1, status: 1 }, options: { name: 'idx_incidents_reported_status' } },
    { fields: { department: 1, status: 1, priority: -1, createdAt: -1 }, options: { name: 'idx_incidents_dept_status_priority_created' } },
    
    // Assignment and workflow indexes
    { fields: { currentAssignment: 1, status: 1 }, options: { name: 'idx_incidents_assignment_status' } },
    { fields: { 'assignments.assignedTo': 1, 'assignments.status': 1 }, options: { name: 'idx_incidents_assigned_to_status' } },
    
    // Flagging and moderation indexes
    { fields: { isFlagged: 1, flaggedAt: -1 }, options: { name: 'idx_incidents_flagged' } },
    { fields: { visibility: 1, status: 1 }, options: { name: 'idx_incidents_visibility_status' } },
    
    // Text search index for incident search
    { 
      fields: { 
        title: 'text', 
        description: 'text', 
        'address.formattedAddress': 'text',
        tags: 'text'
      }, 
      options: { 
        name: 'idx_incidents_text_search',
        weights: {
          title: 10,
          description: 5,
          'address.formattedAddress': 3,
          tags: 2
        }
      } 
    }
  ],

  // AuditLog Collection Indexes (Critical for Compliance)
  auditlogs: [
    // Primary performance index
    { fields: { timestamp: -1 }, options: { name: 'idx_auditlogs_timestamp' } },
    
    // Event and user tracking indexes
    { fields: { eventType: 1, timestamp: -1 }, options: { name: 'idx_auditlogs_event_timestamp' } },
    { fields: { userId: 1, timestamp: -1 }, options: { name: 'idx_auditlogs_user_timestamp' } },
    { fields: { userRole: 1, timestamp: -1 }, options: { name: 'idx_auditlogs_role_timestamp' } },
    { fields: { resourceType: 1, resourceId: 1, timestamp: -1 }, options: { name: 'idx_auditlogs_resource_timestamp' } },
    { fields: { outcome: 1, timestamp: -1 }, options: { name: 'idx_auditlogs_outcome_timestamp' } },
    { fields: { 'requestContext.ipAddress': 1, timestamp: -1 }, options: { name: 'idx_auditlogs_ip_timestamp' } },
    { fields: { correlationId: 1 }, options: { name: 'idx_auditlogs_correlation' } },
    { fields: { archiveAfter: 1 }, options: { name: 'idx_auditlogs_archive_cleanup' } },
    
    // Security and compliance indexes
    { 
      fields: { 
        eventType: 1, 
        'securityContext.riskLevel': 1, 
        timestamp: -1 
      }, 
      options: { name: 'idx_auditlogs_event_risk_timestamp' } 
    },
    { 
      fields: { 
        userRole: 1, 
        'securityContext.sensitiveDataAccessed': 1, 
        timestamp: -1 
      }, 
      options: { name: 'idx_auditlogs_role_sensitive_timestamp' } 
    },
    { 
      fields: { 
        resourceType: 1, 
        action: 1, 
        timestamp: -1 
      }, 
      options: { name: 'idx_auditlogs_resource_action_timestamp' } 
    },
    
    // Compliance-specific indexes
    { fields: { 'complianceFlags.hipaa': 1, timestamp: -1 }, options: { name: 'idx_auditlogs_hipaa_timestamp' } },
    { fields: { 'complianceFlags.gdpr': 1, timestamp: -1 }, options: { name: 'idx_auditlogs_gdpr_timestamp' } },
    { fields: { 'complianceFlags.pci': 1, timestamp: -1 }, options: { name: 'idx_auditlogs_pci_timestamp' } },
    
    // Security monitoring indexes
    { fields: { 'securityContext.riskLevel': 1, timestamp: -1 }, options: { name: 'idx_auditlogs_risk_timestamp' } },
    { fields: { 'securityContext.adminAction': 1, timestamp: -1 }, options: { name: 'idx_auditlogs_admin_timestamp' } }
  ]
};

/**
 * Index Management Functions
 */

/**
 * Create all database indexes
 * @param {boolean} dropExisting - Whether to drop existing indexes first
 * @returns {Promise<Object>} Results of index creation
 */
async function createAllIndexes(dropExisting = false) {
  const results = {
    created: 0,
    errors: [],
    details: {}
  };

  try {
    const db = mongoose.connection.db;
    
    for (const [collectionName, indexes] of Object.entries(DATABASE_INDEXES)) {
      console.log(`Creating indexes for collection: ${collectionName}`);
      results.details[collectionName] = { created: 0, errors: [] };
      
      try {
        const collection = db.collection(collectionName);
        
        // Drop existing indexes if requested (except _id index)
        if (dropExisting) {
          try {
            await collection.dropIndexes();
            console.log(`Dropped existing indexes for ${collectionName}`);
          } catch (error) {
            console.log(`No indexes to drop for ${collectionName}: ${error.message}`);
          }
        }
        
        // Create each index
        for (const indexDef of indexes) {
          try {
            await collection.createIndex(indexDef.fields, indexDef.options);
            results.created++;
            results.details[collectionName].created++;
            console.log(`✓ Created index: ${indexDef.options.name || JSON.stringify(indexDef.fields)}`);
          } catch (error) {
            const errorMsg = `Failed to create index ${indexDef.options.name}: ${error.message}`;
            console.error(`✗ ${errorMsg}`);
            results.errors.push(errorMsg);
            results.details[collectionName].errors.push(errorMsg);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to access collection ${collectionName}: ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        results.errors.push(errorMsg);
        results.details[collectionName].errors.push(errorMsg);
      }
    }
    
    console.log(`\nIndex creation completed: ${results.created} indexes created, ${results.errors.length} errors`);
    return results;
    
  } catch (error) {
    console.error('Failed to create indexes:', error);
    results.errors.push(`Global error: ${error.message}`);
    return results;
  }
}

/**
 * List all indexes for all collections
 * @returns {Promise<Object>} Current indexes by collection
 */
async function listAllIndexes() {
  const results = {};
  
  try {
    const db = mongoose.connection.db;
    
    for (const collectionName of Object.keys(DATABASE_INDEXES)) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.listIndexes().toArray();
        results[collectionName] = indexes.map(idx => ({
          name: idx.name,
          key: idx.key,
          unique: idx.unique || false,
          sparse: idx.sparse || false,
          background: idx.background || false
        }));
      } catch (error) {
        results[collectionName] = { error: error.message };
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to list indexes: ${error.message}`);
  }
}

/**
 * Get index statistics for performance monitoring
 * @returns {Promise<Object>} Index usage statistics
 */
async function getIndexStats() {
  const results = {};
  
  try {
    const db = mongoose.connection.db;
    
    for (const collectionName of Object.keys(DATABASE_INDEXES)) {
      try {
        const collection = db.collection(collectionName);
        const stats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        results[collectionName] = stats.map(stat => ({
          name: stat.name,
          accesses: stat.accesses,
          since: stat.since
        }));
      } catch (error) {
        results[collectionName] = { error: error.message };
      }
    }
    
    return results;
  } catch (error) {
    throw new Error(`Failed to get index stats: ${error.message}`);
  }
}

/**
 * Validate that all required indexes exist
 * @returns {Promise<Object>} Validation results
 */
async function validateIndexes() {
  const results = {
    valid: true,
    missing: [],
    extra: [],
    details: {}
  };
  
  try {
    const currentIndexes = await listAllIndexes();
    
    for (const [collectionName, expectedIndexes] of Object.entries(DATABASE_INDEXES)) {
      results.details[collectionName] = { missing: [], extra: [] };
      
      const current = currentIndexes[collectionName] || [];
      if (current.error) {
        results.valid = false;
        results.details[collectionName].error = current.error;
        continue;
      }
      
      // Check for missing indexes
      for (const expectedIndex of expectedIndexes) {
        const indexName = expectedIndex.options.name;
        const found = current.find(idx => idx.name === indexName);
        
        if (!found) {
          results.valid = false;
          results.missing.push(`${collectionName}.${indexName}`);
          results.details[collectionName].missing.push(indexName);
        }
      }
      
      // Check for extra indexes (excluding default _id index)
      for (const currentIndex of current) {
        if (currentIndex.name === '_id_') continue; // Skip default _id index
        
        const expected = expectedIndexes.find(idx => idx.options.name === currentIndex.name);
        if (!expected) {
          results.extra.push(`${collectionName}.${currentIndex.name}`);
          results.details[collectionName].extra.push(currentIndex.name);
        }
      }
    }
    
    return results;
  } catch (error) {
    results.valid = false;
    results.error = error.message;
    return results;
  }
}

/**
 * Drop all custom indexes (keeps _id indexes)
 * @returns {Promise<Object>} Results of index dropping
 */
async function dropAllIndexes() {
  const results = {
    dropped: 0,
    errors: [],
    details: {}
  };
  
  try {
    const db = mongoose.connection.db;
    
    for (const collectionName of Object.keys(DATABASE_INDEXES)) {
      console.log(`Dropping indexes for collection: ${collectionName}`);
      results.details[collectionName] = { dropped: 0, errors: [] };
      
      try {
        const collection = db.collection(collectionName);
        await collection.dropIndexes();
        results.dropped++;
        results.details[collectionName].dropped = 1;
        console.log(`✓ Dropped indexes for ${collectionName}`);
      } catch (error) {
        const errorMsg = `Failed to drop indexes for ${collectionName}: ${error.message}`;
        console.error(`✗ ${errorMsg}`);
        results.errors.push(errorMsg);
        results.details[collectionName].errors.push(errorMsg);
      }
    }
    
    return results;
  } catch (error) {
    results.errors.push(`Global error: ${error.message}`);
    return results;
  }
}

/**
 * Initialize indexes on application startup
 * @returns {Promise<void>}
 */
async function initializeIndexes() {
  try {
    console.log('Initializing database indexes...');
    
    // Wait for database connection
    if (mongoose.connection.readyState !== 1) {
      console.log('Waiting for database connection...');
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }
    
    // Validate existing indexes
    const validation = await validateIndexes();
    
    if (validation.valid) {
      console.log('✓ All required indexes are present');
      return;
    }
    
    if (validation.missing.length > 0) {
      console.log(`Missing indexes detected: ${validation.missing.join(', ')}`);
      console.log('Creating missing indexes...');
      
      // Create only missing indexes
      await createAllIndexes(false);
    }
    
    console.log('✓ Database indexes initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize indexes:', error);
    throw error;
  }
}

module.exports = {
  DATABASE_INDEXES,
  createAllIndexes,
  listAllIndexes,
  getIndexStats,
  validateIndexes,
  dropAllIndexes,
  initializeIndexes
};