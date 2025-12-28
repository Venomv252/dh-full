/**
 * Database Index Management Script
 * 
 * Manages database indexes for the Emergency Incident Platform
 * Supports creating, dropping, listing, and validating indexes
 */

require('dotenv').config();
const mongoose = require('mongoose');
const {
  createAllIndexes,
  listAllIndexes,
  getIndexStats,
  validateIndexes,
  dropAllIndexes,
  initializeIndexes
} = require('../src/config/database-indexes');

// Import models to ensure schemas are registered
require('../src/models/User');
require('../src/models/Guest');
require('../src/models/Incident');
require('../src/models/AuditLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emergency-incident-platform';

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Create all indexes with detailed output
 */
async function createIndexes() {
  console.log('Creating comprehensive database indexes...\n');
  
  try {
    const results = await createAllIndexes(false);
    
    console.log('\n=== INDEX CREATION SUMMARY ===');
    console.log(`Total indexes created: ${results.created}`);
    console.log(`Total errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors encountered:');
      results.errors.forEach(error => console.log(`  ✗ ${error}`));
    }
    
    console.log('\nDetails by collection:');
    Object.entries(results.details).forEach(([collection, details]) => {
      console.log(`  ${collection}: ${details.created} created, ${details.errors.length} errors`);
    });
    
    return results.errors.length === 0;
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}

/**
 * Drop all indexes with confirmation
 */
async function dropIndexes() {
  console.log('⚠️  WARNING: This will drop all custom indexes (keeping _id indexes)');
  console.log('Dropping database indexes...\n');
  
  try {
    const results = await dropAllIndexes();
    
    console.log('\n=== INDEX DROPPING SUMMARY ===');
    console.log(`Collections processed: ${results.dropped}`);
    console.log(`Total errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors encountered:');
      results.errors.forEach(error => console.log(`  ✗ ${error}`));
    }
    
    return results.errors.length === 0;
  } catch (error) {
    console.error('Error dropping indexes:', error);
    throw error;
  }
}

/**
 * List all indexes with detailed information
 */
async function listIndexes() {
  console.log('Listing all database indexes...\n');
  
  try {
    const indexes = await listAllIndexes();
    
    Object.entries(indexes).forEach(([collection, collectionIndexes]) => {
      console.log(`\n=== ${collection.toUpperCase()} COLLECTION ===`);
      
      if (collectionIndexes.error) {
        console.log(`  ✗ Error: ${collectionIndexes.error}`);
        return;
      }
      
      if (collectionIndexes.length === 0) {
        console.log('  - No indexes found');
        return;
      }
      
      collectionIndexes.forEach(index => {
        const flags = [];
        if (index.unique) flags.push('UNIQUE');
        if (index.sparse) flags.push('SPARSE');
        if (index.background) flags.push('BACKGROUND');
        
        const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}${flagStr}`);
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error listing indexes:', error);
    throw error;
  }
}

/**
 * Get comprehensive index statistics
 */
async function getStats() {
  console.log('Getting comprehensive index statistics...\n');
  
  try {
    const stats = await getIndexStats();
    
    Object.entries(stats).forEach(([collection, collectionStats]) => {
      console.log(`\n=== ${collection.toUpperCase()} STATISTICS ===`);
      
      if (collectionStats.error) {
        console.log(`  ✗ Error: ${collectionStats.error}`);
        return;
      }
      
      if (collectionStats.length === 0) {
        console.log('  - No statistics available (collection may be empty)');
        return;
      }
      
      collectionStats.forEach(stat => {
        console.log(`  - ${stat.name}:`);
        console.log(`    Operations: ${stat.accesses.ops || 0}`);
        console.log(`    Since: ${stat.accesses.since || 'N/A'}`);
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error getting index statistics:', error);
    throw error;
  }
}

/**
 * Validate all indexes with detailed reporting
 */
async function validateAllIndexes() {
  console.log('Validating comprehensive database indexes...\n');
  
  try {
    const validation = await validateIndexes();
    
    console.log('=== INDEX VALIDATION RESULTS ===');
    console.log(`Overall status: ${validation.valid ? '✓ VALID' : '✗ INVALID'}`);
    
    if (validation.missing.length > 0) {
      console.log(`\nMissing indexes (${validation.missing.length}):`);
      validation.missing.forEach(index => console.log(`  ✗ ${index}`));
    }
    
    if (validation.extra.length > 0) {
      console.log(`\nExtra indexes (${validation.extra.length}):`);
      validation.extra.forEach(index => console.log(`  ! ${index}`));
    }
    
    console.log('\nDetails by collection:');
    Object.entries(validation.details).forEach(([collection, details]) => {
      if (details.error) {
        console.log(`  ${collection}: ✗ Error - ${details.error}`);
      } else {
        const missing = details.missing.length;
        const extra = details.extra.length;
        const status = missing === 0 ? '✓' : '✗';
        console.log(`  ${collection}: ${status} ${missing} missing, ${extra} extra`);
      }
    });
    
    if (!validation.valid) {
      console.log('\n💡 Run "npm run indexes:create" to create missing indexes');
    }
    
    return validation.valid;
  } catch (error) {
    console.error('Error validating indexes:', error);
    throw error;
  }
}

/**
 * Initialize indexes (used during application startup)
 */
async function initIndexes() {
  console.log('Initializing database indexes for application startup...\n');
  
  try {
    await initializeIndexes();
    console.log('✓ Database indexes initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing indexes:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('Emergency Incident Platform - Database Index Management');
    console.log('\nUsage: node manage-indexes.js <command>');
    console.log('\nCommands:');
    console.log('  create    - Create all comprehensive indexes');
    console.log('  drop      - Drop all custom indexes (keeps _id)');
    console.log('  list      - List all existing indexes');
    console.log('  stats     - Show index usage statistics');
    console.log('  validate  - Validate that all required indexes exist');
    console.log('  init      - Initialize indexes (for app startup)');
    console.log('\nExamples:');
    console.log('  npm run indexes:create');
    console.log('  npm run indexes:validate');
    console.log('  node scripts/manage-indexes.js list');
    process.exit(1);
  }
  
  let success = false;
  
  try {
    await connectDB();
    
    switch (command) {
      case 'create':
        success = await createIndexes();
        break;
      case 'drop':
        success = await dropIndexes();
        break;
      case 'list':
        success = await listIndexes();
        break;
      case 'stats':
        success = await getStats();
        break;
      case 'validate':
        success = await validateAllIndexes();
        break;
      case 'init':
        success = await initIndexes();
        break;
      default:
        console.error(`✗ Unknown command: ${command}`);
        console.log('Run without arguments to see available commands');
        process.exit(1);
    }
    
    if (success) {
      console.log('\n✓ Operation completed successfully');
    } else {
      console.log('\n⚠️  Operation completed with warnings or errors');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n✗ Script execution failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  main();
}