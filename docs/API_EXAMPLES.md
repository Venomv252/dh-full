# API Usage Examples

This document provides practical examples of how to use the Emergency Incident Platform API endpoints.

## Base URL
```
http://localhost:3000
```

## Authentication
Most endpoints require authentication. Guest users are identified by `X-Guest-ID` header, while registered users will use JWT tokens (to be implemented).

## Health Check

### Check API Status
```bash
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency Incident Platform API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "uptime": 123.456
}
```

## Guest Management

### Create Guest User
```bash
POST /api/guest/create
Content-Type: application/json

{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "guestId": "guest_abc123_def456",
    "actionCount": 0,
    "maxActions": 10,
    "remainingActions": 10,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Guest user created successfully"
}
```

## User Management

### Register New User
```bash
POST /api/user/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "dob": "1990-05-15",
  "gender": "male",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "address": {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "pincode": "10001"
  },
  "bloodGroup": "O+",
  "medicalConditions": ["Diabetes Type 2"],
  "allergies": ["Peanuts"],
  "emergencyContacts": [
    {
      "name": "Jane Doe",
      "relation": "Spouse",
      "phone": "+1234567891"
    }
  ],
  "vehicles": [
    {
      "vehicleNumber": "ABC123",
      "type": "Car",
      "model": "Toyota Camry 2020"
    }
  ],
  "insurance": {
    "provider": "HealthCare Plus",
    "policyNumber": "HC123456789",
    "validTill": "2025-12-31"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "email": "john.doe@example.com",
    "role": "user"
  },
  "message": "User registered successfully"
}
```

## Incident Management

### Create New Incident
```bash
POST /api/incidents
Content-Type: application/json
X-Guest-ID: guest_abc123_def456

{
  "title": "Car Accident on Highway 101",
  "description": "Multi-vehicle collision blocking two lanes. Emergency services needed immediately.",
  "type": "Accident",
  "geoLocation": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  },
  "media": [
    {
      "type": "image",
      "url": "https://example.com/accident-photo.jpg"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incidentId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "title": "Car Accident on Highway 101",
    "status": "reported",
    "upvotes": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Incident reported successfully"
}
```

### List Incidents
```bash
GET /api/incidents?page=1&limit=10&type=Accident&status=reported
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "title": "Car Accident on Highway 101",
        "description": "Multi-vehicle collision blocking two lanes...",
        "type": "Accident",
        "geoLocation": {
          "type": "Point",
          "coordinates": [-122.4194, 37.7749]
        },
        "status": "reported",
        "upvotes": 15,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "reportedBy": {
          "userType": "guest",
          "guestId": "60f7b3b3b3b3b3b3b3b3b3b3"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalIncidents": 47,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### Get Incident Details
```bash
GET /api/incidents/60f7b3b3b3b3b3b3b3b3b3b3
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incident": {
      "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
      "title": "Car Accident on Highway 101",
      "description": "Multi-vehicle collision blocking two lanes...",
      "type": "Accident",
      "geoLocation": {
        "type": "Point",
        "coordinates": [-122.4194, 37.7749]
      },
      "media": [
        {
          "type": "image",
          "url": "https://example.com/accident-photo.jpg",
          "uploadedAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "status": "reported",
      "upvotes": 15,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "reportedBy": {
        "userType": "guest",
        "guestId": "60f7b3b3b3b3b3b3b3b3b3b3"
      }
    }
  }
}
```

### Geospatial Query (Nearby Incidents)
```bash
GET /api/incidents?lat=37.7749&lng=-122.4194&radius=5000&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incidents": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "title": "Car Accident on Highway 101",
        "distance": 1250.5,
        "geoLocation": {
          "type": "Point",
          "coordinates": [-122.4194, 37.7749]
        },
        "status": "reported",
        "upvotes": 15
      }
    ],
    "searchCriteria": {
      "center": {
        "lat": 37.7749,
        "lng": -122.4194
      },
      "radius": 5000
    },
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalIncidents": 3
    }
  }
}
```

### Upvote Incident
```bash
POST /api/incidents/60f7b3b3b3b3b3b3b3b3b3b3/upvote
Content-Type: application/json
X-Guest-ID: guest_abc123_def456

{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incidentId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "upvotes": 16,
    "userUpvoted": true
  },
  "message": "Incident upvoted successfully"
}
```

## Admin Management

### Admin Dashboard
```bash
GET /api/admin/dashboard
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalIncidents": 1247,
      "reportedIncidents": 856,
      "verifiedIncidents": 312,
      "resolvedIncidents": 79,
      "totalUsers": 5432,
      "totalGuests": 12890,
      "incidentsToday": 23,
      "incidentsThisWeek": 156
    },
    "recentIncidents": [
      {
        "_id": "60f7b3b3b3b3b3b3b3b3b3b3",
        "title": "Car Accident on Highway 101",
        "type": "Accident",
        "status": "reported",
        "upvotes": 15,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "incidentsByType": {
      "Accident": 456,
      "Fire": 234,
      "Medical": 312,
      "Natural Disaster": 89,
      "Crime": 123,
      "Other": 33
    }
  }
}
```

### Update Incident Status
```bash
PUT /api/admin/incidents/60f7b3b3b3b3b3b3b3b3b3b3/status
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>

{
  "status": "verified",
  "adminNotes": "Verified by emergency services. Fire department on scene."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "incidentId": "60f7b3b3b3b3b3b3b3b3b3b3",
    "previousStatus": "reported",
    "newStatus": "verified",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Incident status updated successfully"
}
```

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "type": "error_category",
    "details": {
      "field": "specific_field",
      "value": "invalid_value"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `GUEST_ACTION_LIMIT_EXCEEDED` - Guest user exceeded action limit
- `INCIDENT_NOT_FOUND` - Requested incident doesn't exist
- `DUPLICATE_UPVOTE` - User already upvoted this incident
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `UNAUTHORIZED_ACCESS` - Authentication required
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions

## Rate Limiting

The API implements rate limiting based on user type:

- **Guest Users**: 50 requests per 15 minutes
- **Registered Users**: 200 requests per 15 minutes  
- **Admin Users**: 1000 requests per 15 minutes

Rate limit headers are included in responses:
```
RateLimit-Limit: 50
RateLimit-Remaining: 47
RateLimit-Reset: 1640995200
```

## Testing with cURL

### Create a guest and report an incident:
```bash
# 1. Create guest
curl -X POST http://localhost:3000/api/guest/create \
  -H "Content-Type: application/json" \
  -d '{}'

# 2. Use the returned guestId to report incident
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -H "X-Guest-ID: guest_abc123_def456" \
  -d '{
    "title": "Test Incident",
    "description": "This is a test incident",
    "type": "Other",
    "geoLocation": {
      "type": "Point",
      "coordinates": [-122.4194, 37.7749]
    }
  }'

# 3. List incidents
curl http://localhost:3000/api/incidents?page=1&limit=5
```

## Development Tools

### Seed Database
```bash
# Add sample data
node scripts/seed-data.js

# Clear all data
node scripts/seed-data.js clear
```

### Check Database Indexes
```bash
node scripts/manage-indexes.js list
```

This API provides a comprehensive emergency incident reporting system with proper validation, security, and error handling.