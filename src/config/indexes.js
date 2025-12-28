/**
 * Database Indexes Configuration
 * Centralized index management for optimal query performance
 */

const mongoose = require('mongoose');

/**
 * Create all database indexes for optimal performance
 * This function should be called after database connection is established
 */
const createIndexes = async () => {
  try {
    console.log('🔧 Creating database indexes...');
    
    // Get database connection
    const db = mongoose.connection.db;
    
    // User Collection Indexes
    console.log('📝 Creating User collection indexes...');
    
    // Unique indexes for user identification
    await db.collection('users').createIndex(
      { email: 1 }, 
      { 
        unique: true, 
        name: 'email_unique_idx',
        background: true 
      }
    );
    
    await db.collection('users').createIndex(
      { phone: 1 }, 
      { 
        unique: true, 
        name: 'phone_unique_idx',
        background: true,
        sparse: true // Allow multiple null values
      }
    );
    
    // Query optimization indexes for users
    await db.collection('users').createIndex(
      { role: 1 }, 
      { 
        name: 'role_idx',
        background: true 
      }
    );
    
    await db.collection('users').createIndex(
      { createdAt: -1 }, 
      { 
        name: 'user_created_desc_idx',
        background: true 
      }
    );
    
    // Address-based queries
    await db.collection('users').createIndex(
      { 'address.city': 1, 'address.state': 1 }, 
      { 
        name: 'address_location_idx',
        background: true 
      }
    );
    
    // Guest Collection Indexes
    console.log('👤 Creating Guest collection indexes...');
    
    // Primary lookup for guests
    await db.collection('guests').createIndex(
      { guestId: 1 }, 
      { 
        unique: true, 
        name: 'guestId_unique_idx',
        background: true 
      }
    );
    
    // Cleanup and lifecycle management
    await db.collection('guests').createIndex(
      { lastActiveAt: 1 }, 
      { 
        name: 'guest_last_active_idx',
        background: true 
      }
    );
    
    await db.collection('guests').createIndex(
      { createdAt: 1 }, 
      { 
        name: 'guest_created_idx',
        background: true 
      }
    );
    
    // Action count queries
    await db.collection('guests').createIndex(
      { actionCount: 1 }, 
      { 
        name: 'guest_action_count_idx',
        background: true 
      }
    );
    
    // Incident Collection Indexes
    console.log('🚨 Creating Incident collection indexes...');
    
    // CRITICAL: Geospatial index for location-based queries
    await db.collection('incidents').createIndex(
      { geoLocation: '2dsphere' }, 
      { 
        name: 'geo_location_2dsphere_idx',
        background: true 
      }
    );
    
    // Status-based listing (most common query)
    await db.collection('incidents').createIndex(
      { status: 1, createdAt: -1 }, 
      { 
        name: 'status_created_desc_idx',
        background: true 
      }
    );
    
    // Type-based filtering
    await db.collection('incidents').createIndex(
      { type: 1, createdAt: -1 }, 
      { 
        name: 'type_created_desc_idx',
        background: true 
      }
    );
    
    // User's incidents lookup
    await db.collection('incidents').createIndex(
      { 'reportedBy.userType': 1, 'reportedBy.userId': 1 }, 
      { 
        name: 'reported_by_user_idx',
        background: true,
        sparse: true
      }
    );
    
    // Guest's incidents lookup
    await db.collection('incidents').createIndex(
      { 'reportedBy.userType': 1, 'reportedBy.guestId': 1 }, 
      { 
        name: 'reported_by_guest_idx',
        background: true,
        sparse: true
      }
    );
    
    // Multi-filter queries (status + type + date)
    await db.collection('incidents').createIndex(
      { status: 1, type: 1, createdAt: -1 }, 
      { 
        name: 'status_type_created_idx',
        background: true 
      }
    );
    
    // Popular incidents (upvotes + recency)
    await db.collection('incidents').createIndex(
      { upvotes: -1, createdAt: -1 }, 
      { 
        name: 'popular_incidents_idx',
        background: true 
      }
    );
    
    // Recent incidents (most common query)
    await db.collection('incidents').createIndex(
      { createdAt: -1 }, 
      { 
        name: 'incident_created_desc_idx',
        background: true 
      }
    );
    
    // Upvote tracking indexes
    await db.collection('incidents').createIndex(
      { 'upvotedBy.userType': 1, 'upvotedBy.userId': 1 }, 
      { 
        name: 'upvoted_by_user_idx',
        background: true,
        sparse: true
      }
    );
    
    await db.collection('incidents').createIndex(
      { 'upvotedBy.userType': 1, 'upvotedBy.guestId': 1 }, 
      { 
        name: 'upvoted_by_guest_idx',
        background: true,
        sparse: true
      }
    );
    
    // Admin queries - incidents by date range
    await db.collection('incidents').createIndex(
      { createdAt: 1, status: 1 }, 
      { 
        name: 'admin_date_status_idx',
        background: true 
      }
    );
    
    console.log('✅ All database indexes created successfully');
    
    // Log index statistics
    await logIndexStatistics();
    
  } catch (error) {
    console.error('❌ Error creating database indexes:', error.message);
    throw error;
  }
};

/**
 * Drop all custom indexes (useful for development/testing)
 * WARNING: This will impact query performance
 */
const dropIndexes = async () => {
  try {
    console.log('🗑️ Dropping custom database indexes...');
    
    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = ['users', 'guests', 'incidents'];
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        
        // Drop all indexes except _id (which cannot be dropped)
        for (const index of indexes) {
          if (index.name !== '_id_') {
            await collection.dropIndex(index.name);
            console.log(`Dropped index: ${index.name} from ${collectionName}`);
          }
        }
      } catch (error) {
        console.log(`Collection ${collectionName} may not exist or has no custom indexes`);
      }
    }
    
    console.log('✅ Custom indexes dropped successfully');
    
  } catch (error) {
    console.error('❌ Error dropping indexes:', error.message);
    throw error;
  }
};

/**
 * List all indexes for monitoring and debugging
 */
const listIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = ['users', 'guests', 'incidents'];
    const indexInfo = {};
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        indexInfo[collectionName] = indexes;
      } catch (error) {
        indexInfo[collectionName] = `Error: ${error.message}`;
      }
    }
    
    return indexInfo;
  } catch (error) {
    console.error('❌ Error listing indexes:', error.message);
    throw error;
  }
};

/**
 * Get index usage statistics (requires MongoDB 3.2+)
 */
const getIndexStats = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = ['users', 'guests', 'incidents'];
    const stats = {};
    
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const indexStats = await collection.aggregate([
          { $indexStats: {} }
        ]).toArray();
        
        stats[collectionName] = indexStats;
      } catch (error) {
        stats[collectionName] = `Error: ${error.message}`;
      }
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting index stats:', error.message);
    throw error;
  }
};

/**
 * Log index statistics for monitoring
 */
const logIndexStatistics = async () => {
  try {
    console.log('\n📊 Index Statistics:');
    
    const indexInfo = await listIndexes();
    
    for (const [collection, indexes] of Object.entries(indexInfo)) {
      if (Array.isArray(indexes)) {
        console.log(`\n${collection.toUpperCase()} Collection:`);
        indexes.forEach(index => {
          const keys = Object.keys(index.key).join(', ');
          const unique = index.unique ? ' (UNIQUE)' : '';
          const sparse = index.sparse ? ' (SPARSE)' : '';
          console.log(`  - ${index.name}: ${keys}${unique}${sparse}`);
        });
      } else {
        console.log(`\n${collection.toUpperCase()}: ${indexes}`);
      }
    }
    
    console.log('\n');
  } catch (error) {
    console.error('Error logging index statistics:', error.message);
  }
};

/**
 * Ensure indexes exist (safe to call multiple times)
 * This is the main function to call during application startup
 */
const ensureIndexes = async () => {
  try {
    // Check if we're connected to database
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected. Call connectDB() first.');
    }
    
    console.log('🔍 Ensuring database indexes exist...');
    
    // Create indexes (MongoDB will skip if they already exist)
    await createIndexes();
    
    console.log('✅ Database indexes are ready');
    
  } catch (error) {
    console.error('❌ Error ensuring indexes:', error.message);
    throw error;
  }
};

/**
 * Validate that critical indexes exist
 */
const validateCriticalIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // Critical indexes that must exist for performance
    const criticalIndexes = [
      { collection: 'users', index: 'email_unique_idx' },
      { collection: 'guests', index: 'guestId_unique_idx' },
      { collection: 'incidents', index: 'geo_location_2dsphere_idx' },
      { collection: 'incidents', index: 'status_created_desc_idx' }
    ];
    
    const missing = [];
    
    for (const { collection, index } of criticalIndexes) {
      try {
        const indexes = await db.collection(collection).indexes();
        const exists = indexes.some(idx => idx.name === index);
        
        if (!exists) {
          missing.push(`${collection}.${index}`);
        }
      } catch (error) {
        missing.push(`${collection}.${index} (collection error)`);
      }
    }
    
    if (missing.length > 0) {
      console.warn('⚠️ Missing critical indexes:', missing);
      return false;
    }
    
    console.log('✅ All critical indexes are present');
    return true;
    
  } catch (error) {
    console.error('❌ Error validating indexes:', error.message);
    return false;
  }
};

module.exports = {
  createIndexes,
  dropIndexes,
  listIndexes,
  getIndexStats,
  ensureIndexes,
  validateCriticalIndexes,
  logIndexStatistics
};