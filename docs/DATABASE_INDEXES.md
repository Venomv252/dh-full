# Database Indexes Documentation

## Overview

This document describes the database indexing strategy for the Emergency Incident Reporting Platform. Proper indexing is crucial for query performance, especially for geospatial queries and high-traffic scenarios.

## Index Categories

### 1. User Collection Indexes

#### Unique Indexes
- **`email_unique_idx`**: `{ email: 1 }` - Ensures email uniqueness
- **`phone_unique_idx`**: `{ phone: 1 }` - Ensures phone uniqueness (sparse)

#### Query Optimization Indexes
- **`role_idx`**: `{ role: 1 }` - Role-based queries
- **`user_created_desc_idx`**: `{ createdAt: -1 }` - Recent users
- **`address_location_idx`**: `{ 'address.city': 1, 'address.state': 1 }` - Location-based user queries

### 2. Guest Collection Indexes

#### Primary Indexes
- **`guestId_unique_idx`**: `{ guestId: 1 }` - Unique guest identification

#### Lifecycle Management Indexes
- **`guest_last_active_idx`**: `{ lastActiveAt: 1 }` - Cleanup inactive guests
- **`guest_created_idx`**: `{ createdAt: 1 }` - Guest lifecycle management
- **`guest_action_count_idx`**: `{ actionCount: 1 }` - Action limit queries

### 3. Incident Collection Indexes

#### Critical Geospatial Index
- **`geo_location_2dsphere_idx`**: `{ geoLocation: '2dsphere' }` - **CRITICAL** for location-based queries

#### Primary Query Indexes
- **`status_created_desc_idx`**: `{ status: 1, createdAt: -1 }` - Most common query pattern
- **`type_created_desc_idx`**: `{ type: 1, createdAt: -1 }` - Type-based filtering
- **`incident_created_desc_idx`**: `{ createdAt: -1 }` - Recent incidents

#### Reporter Tracking Indexes
- **`reported_by_user_idx`**: `{ 'reportedBy.userType': 1, 'reportedBy.userId': 1 }` - User's incidents
- **`reported_by_guest_idx`**: `{ 'reportedBy.userType': 1, 'reportedBy.guestId': 1 }` - Guest's incidents

#### Compound Query Indexes
- **`status_type_created_idx`**: `{ status: 1, type: 1, createdAt: -1 }` - Multi-filter queries
- **`popular_incidents_idx`**: `{ upvotes: -1, createdAt: -1 }` - Popular incidents
- **`admin_date_status_idx`**: `{ createdAt: 1, status: 1 }` - Admin date range queries

#### Upvote Tracking Indexes
- **`upvoted_by_user_idx`**: `{ 'upvotedBy.userType': 1, 'upvotedBy.userId': 1 }` - User upvote tracking
- **`upvoted_by_guest_idx`**: `{ 'upvotedBy.userType': 1, 'upvotedBy.guestId': 1 }` - Guest upvote tracking

## Index Management

### Automatic Index Creation

Indexes are automatically created when the application starts:

```javascript
const { connectDB } = require('./src/config/database');

// Indexes are created automatically on connection
await connectDB();
```

### Manual Index Management

Use the provided scripts for manual index management:

```bash
# Create all indexes
npm run indexes:create

# List all indexes
npm run indexes:list

# Validate critical indexes
npm run indexes:validate

# Get index usage statistics
npm run indexes:stats

# Drop all custom indexes (WARNING: Impacts performance)
npm run indexes:drop
```

### Development Usage

```bash
# Check current indexes
node scripts/manage-indexes.js list

# Validate that critical indexes exist
node scripts/manage-indexes.js validate

# Create missing indexes
node scripts/manage-indexes.js create
```

## Performance Considerations

### Critical Indexes

These indexes are essential for application performance:

1. **Geospatial Index** (`geo_location_2dsphere_idx`) - Required for location queries
2. **Email Unique Index** (`email_unique_idx`) - Required for user registration
3. **Status-Date Index** (`status_created_desc_idx`) - Most common incident query

### Query Patterns

#### Geospatial Queries
```javascript
// Supported by geo_location_2dsphere_idx
db.incidents.find({
  geoLocation: {
    $near: {
      $geometry: { type: "Point", coordinates: [lng, lat] },
      $maxDistance: 5000
    }
  }
});
```

#### Status-Based Listing
```javascript
// Supported by status_created_desc_idx
db.incidents.find({ status: "reported" }).sort({ createdAt: -1 });
```

#### Multi-Filter Queries
```javascript
// Supported by status_type_created_idx
db.incidents.find({ 
  status: "reported", 
  type: "Medical" 
}).sort({ createdAt: -1 });
```

#### User's Incidents
```javascript
// Supported by reported_by_user_idx
db.incidents.find({ 
  "reportedBy.userType": "user",
  "reportedBy.userId": ObjectId("...")
});
```

## Index Monitoring

### Usage Statistics

Monitor index usage with:

```bash
npm run indexes:stats
```

### Performance Metrics

Key metrics to monitor:
- Index hit ratio
- Query execution time
- Index size vs collection size
- Unused indexes

### Maintenance

#### Regular Tasks
1. **Weekly**: Check index usage statistics
2. **Monthly**: Validate critical indexes exist
3. **Quarterly**: Review and optimize based on query patterns

#### Troubleshooting

**Slow Queries**
1. Check if appropriate indexes exist
2. Verify query uses indexed fields
3. Consider compound indexes for multi-field queries

**High Memory Usage**
1. Review index sizes
2. Consider dropping unused indexes
3. Optimize index field selection

## Production Considerations

### Index Creation Strategy

- **Background Creation**: All indexes use `background: true` to avoid blocking operations
- **Sparse Indexes**: Used for optional fields to save space
- **Compound Indexes**: Ordered by selectivity (most selective first)

### Deployment

1. **Pre-deployment**: Validate indexes in staging
2. **Deployment**: Indexes created automatically on startup
3. **Post-deployment**: Validate critical indexes exist

### Backup Considerations

- Index definitions are stored in code (version controlled)
- Indexes are recreated automatically on restore
- No separate index backup needed

## Troubleshooting Guide

### Common Issues

#### "Index not found" errors
```bash
# Recreate all indexes
npm run indexes:create
```

#### Slow geospatial queries
```bash
# Verify geospatial index exists
npm run indexes:validate
```

#### Duplicate key errors
```bash
# Check unique indexes
npm run indexes:list | grep UNIQUE
```

### Emergency Procedures

#### Complete Index Rebuild
```bash
# 1. Drop all indexes (WARNING: Performance impact)
npm run indexes:drop

# 2. Recreate all indexes
npm run indexes:create

# 3. Validate critical indexes
npm run indexes:validate
```

## Best Practices

1. **Always validate** indexes after deployment
2. **Monitor performance** regularly
3. **Use compound indexes** for multi-field queries
4. **Keep indexes minimal** - only create what's needed
5. **Test index changes** in staging first
6. **Document query patterns** that require new indexes

## Related Files

- `src/config/indexes.js` - Index definitions and management
- `src/config/database.js` - Database connection with index creation
- `scripts/manage-indexes.js` - Index management CLI tool
- `src/models/*.js` - Model-level index definitions