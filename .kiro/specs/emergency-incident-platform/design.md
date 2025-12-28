# Design Document: Emergency Incident Reporting Platform

## Overview

The Emergency Incident Reporting Platform is a comprehensive full-stack application that enables emergency incident reporting and response management. The system consists of a React frontend application and a Node.js backend API, supporting multiple user types including citizens, emergency responders, healthcare facilities, and administrators.

The platform provides real-time incident reporting with media uploads, geolocation services, proximity detection, and complete emergency response workflows. It integrates with external services including Cloudinary for media management and Google Maps/Mapbox for location services.

**Key Features:**
- Multi-role authentication system (Guest, User, Police, Hospital, Admin)
- Real-time incident reporting with media upload
- Proximity detection and duplicate prevention
- Complete incident lifecycle management (reported → dispatched → arrived → resolved)
- Hospital patient management system
- Interactive maps and geolocation services
- Comprehensive admin dashboard and analytics
- Mobile-responsive React frontend
- Secure RESTful API backend

## Architecture

### Technology Stack

#### Frontend
- **Framework**: React 18+ with Vite build tool
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context API or Redux Toolkit
- **Routing**: React Router for client-side navigation
- **Maps**: Google Maps API or Mapbox GL JS
- **HTTP Client**: Axios for API communication
- **Authentication**: JWT token management
- **Media Upload**: Cloudinary React SDK

#### Backend
- **Runtime**: Node.js (LTS version)
- **Framework**: Express.js 4.x
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, express-rate-limit
- **Validation**: Joi for schema validation
- **Encryption**: bcrypt for passwords, crypto for sensitive data
- **Media**: Cloudinary Node.js SDK
- **Environment**: dotenv for configuration

#### External Services
- **Media Storage**: Cloudinary for image/video upload and CDN
- **Maps**: Google Maps API or Mapbox for location services
- **Database**: MongoDB Atlas (cloud) or local MongoDB instance

### System Architecture Pattern

The system follows a **full-stack MVC architecture** with clear separation between frontend and backend:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│    Components   │     Pages       │       Services          │
│   (UI Elements) │  (Route Views)  │   (API Calls)          │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
                    ┌─────────────┐
                    │  REST API   │
                    └─────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                        │
├─────────────────┬─────────────────┬─────────────────────────┤
│     Routes      │   Controllers   │       Models            │
│ (API Endpoints) │ (Business Logic)│   (Data Layer)          │
├─────────────────┼─────────────────┼─────────────────────────┤
│   Middleware    │    Services     │      Database           │
│(Auth,Validation)│  (Utilities)    │     (MongoDB)           │
└─────────────────┴─────────────────┴─────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────────┐
│                 EXTERNAL SERVICES                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Cloudinary    │  Google Maps    │    MongoDB Atlas        │
│ (Media Storage) │  (Location)     │    (Database)           │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Directory Structure

#### Frontend Structure
```
frontend/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/
│   │   ├── forms/
│   │   ├── maps/
│   │   └── media/
│   ├── pages/              # Route-based page components
│   │   ├── Landing.jsx
│   │   ├── Dashboard.jsx
│   │   ├── IncidentReport.jsx
│   │   ├── PolicePanel.jsx
│   │   ├── HospitalPanel.jsx
│   │   └── AdminPanel.jsx
│   ├── services/           # API service functions
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── incidents.js
│   │   └── media.js
│   ├── hooks/              # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useGeolocation.js
│   │   └── useIncidents.js
│   ├── context/            # React Context providers
│   │   ├── AuthContext.js
│   │   └── IncidentContext.js
│   ├── utils/              # Utility functions
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validators.js
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── vite.config.js
```

#### Backend Structure
```
backend/
├── src/
│   ├── controllers/        # Business logic handlers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── guestController.js
│   │   ├── incidentController.js
│   │   ├── policeController.js
│   │   ├── hospitalController.js
│   │   └── adminController.js
│   ├── models/            # Mongoose schemas and models
│   │   ├── User.js
│   │   ├── Guest.js
│   │   ├── Incident.js
│   │   └── AuditLog.js
│   ├── routes/            # API route definitions
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── guests.js
│   │   ├── incidents.js
│   │   ├── police.js
│   │   ├── hospital.js
│   │   └── admin.js
│   ├── middleware/        # Custom middleware functions
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   ├── validation.js
│   │   ├── roleCheck.js
│   │   └── errorHandler.js
│   ├── services/          # External service integrations
│   │   ├── cloudinary.js
│   │   ├── maps.js
│   │   └── notifications.js
│   ├── config/            # Configuration files
│   │   ├── database.js
│   │   ├── security.js
│   │   ├── cloudinary.js
│   │   └── constants.js
│   ├── utils/             # Utility functions
│   │   ├── encryption.js
│   │   ├── validators.js
│   │   ├── helpers.js
│   │   └── proximity.js
│   └── app.js             # Main application file
├── package.json
└── server.js              # Server entry point
```

## Components and Interfaces

### Frontend Components

#### Landing Page Component
```jsx
// Landing page with role-based login options
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-red-900">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-white text-center mb-12">
          Emergency Incident Reporting Platform
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <LoginButton role="user" label="Login as User" />
          <LoginButton role="police" label="Login as Police" />
          <LoginButton role="hospital" label="Login as Hospital" />
          <ReportButton label="Report an Incident" />
        </div>
      </div>
    </div>
  );
};
```

#### Incident Report Form Component
```jsx
// Comprehensive incident reporting form with media upload
const IncidentReportForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: '',
    location: null,
    media: []
  });
  
  return (
    <form className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <LocationPicker onLocationSelect={handleLocationSelect} />
      <MediaUpload onMediaUpload={handleMediaUpload} />
      <ProximityCheck location={formData.location} type={formData.type} />
    </form>
  );
};
```

#### Interactive Map Component
```jsx
// Map component for location selection and incident visualization
const InteractiveMap = ({ incidents, onLocationSelect, userLocation }) => {
  return (
    <div className="w-full h-96 rounded-lg overflow-hidden">
      <GoogleMap
        center={userLocation}
        zoom={13}
        onClick={onLocationSelect}
      >
        {incidents.map(incident => (
          <IncidentMarker key={incident._id} incident={incident} />
        ))}
        <UserLocationMarker location={userLocation} />
      </GoogleMap>
    </div>
  );
};
```

#### Role-Specific Dashboards
```jsx
// Police dashboard for incident management
const PoliceDashboard = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ActiveIncidentsList />
      <IncidentMap />
      <ResponseMetrics />
    </div>
  );
};

// Hospital dashboard for patient management
const HospitalDashboard = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <PatientSearch />
      <MedicalIncidentsList />
      <AdmittedPatients />
    </div>
  );
};

// Admin dashboard for system oversight
const AdminDashboard = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <SystemMetrics />
      <IncidentAnalytics />
      <UserManagement />
      <PerformanceCharts />
    </div>
  );
};
```

### Backend Models

#### Enhanced User Model
```javascript
{
  _id: ObjectId,
  fullName: String (required, encrypted),
  dob: Date (required),
  gender: String (enum: ['male', 'female', 'other']),
  phone: String (required, unique, encrypted),
  email: String (required, unique, lowercase),
  password: String (required, hashed),
  address: {
    street: String (required, encrypted),
    city: String (required),
    state: String (required),
    pincode: String (required)
  },
  bloodGroup: String (enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  medicalConditions: [String] (encrypted),
  allergies: [String] (encrypted),
  emergencyContacts: [{
    name: String (required, encrypted),
    relation: String (required),
    phone: String (required, encrypted)
  }],
  vehicles: [{
    vehicleNumber: String (required, encrypted),
    type: String (required),
    model: String (required)
  }],
  insurance: {
    provider: String (encrypted),
    policyNumber: String (encrypted),
    validTill: Date
  },
  role: String (enum: ['user', 'police', 'hospital', 'admin'], default: 'user'),
  department: String (conditional for police/hospital),
  jurisdiction: String (conditional for police),
  licenseNumber: String (conditional for hospital),
  isActive: Boolean (default: true),
  lastLogin: Date,
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now)
}
```

#### Enhanced Incident Model
```javascript
{
  _id: ObjectId,
  title: String (required, maxlength: 200),
  description: String (required, maxlength: 2000),
  type: String (enum: ['Fire', 'Accident', 'Medical', 'Crime'], required),
  geoLocation: {
    type: String (enum: ['Point'], required: true),
    coordinates: [Number] (required, [longitude, latitude])
  },
  address: String (geocoded address),
  media: [{
    type: String (enum: ['image', 'video']),
    url: String (required, Cloudinary URL),
    publicId: String (Cloudinary public ID),
    uploadedAt: Date (default: Date.now)
  }],
  reportedBy: {
    userType: String (enum: ['user', 'guest'], required: true),
    userId: ObjectId (ref: 'User', conditional),
    guestId: ObjectId (ref: 'Guest', conditional)
  },
  status: String (enum: ['reported', 'dispatched', 'arrived', 'resolved'], default: 'reported'),
  assignedTo: {
    userId: ObjectId (ref: 'User'),
    department: String,
    assignedAt: Date
  },
  statusHistory: [{
    status: String,
    updatedBy: ObjectId (ref: 'User'),
    updatedAt: Date (default: Date.now),
    notes: String
  }],
  upvotes: Number (default: 0),
  upvotedBy: [{
    userType: String (enum: ['user', 'guest']),
    userId: ObjectId (ref: 'User', conditional),
    guestId: ObjectId (ref: 'Guest', conditional),
    upvotedAt: Date (default: Date.now)
  }],
  priority: String (enum: ['low', 'medium', 'high', 'critical'], default: 'medium'),
  responseTime: Number (minutes from report to resolution),
  isActive: Boolean (default: true),
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now)
}
```

#### Audit Log Model
```javascript
{
  _id: ObjectId,
  action: String (required),
  resource: String (required), // 'incident', 'user', 'patient'
  resourceId: ObjectId (required),
  performedBy: {
    userType: String (enum: ['user', 'guest', 'system']),
    userId: ObjectId (ref: 'User', conditional),
    guestId: ObjectId (ref: 'Guest', conditional)
  },
  details: Object, // Action-specific details
  ipAddress: String,
  userAgent: String,
  timestamp: Date (default: Date.now)
}
```

### API Endpoints Design

#### Authentication Endpoints
```javascript
// Authentication and authorization
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/verify-token
```

#### User Management Endpoints
```javascript
// User registration and profile management
POST /api/users/register
GET  /api/users/profile
PUT  /api/users/profile
GET  /api/users/incidents
DELETE /api/users/account
```

#### Guest Management Endpoints
```javascript
// Guest user operations
POST /api/guests/create
GET  /api/guests/:guestId/status
POST /api/guests/:guestId/convert-to-user
```

#### Incident Management Endpoints
```javascript
// Incident CRUD operations
POST /api/incidents                    // Create incident
GET  /api/incidents                    // List incidents with filtering
GET  /api/incidents/:id                // Get incident details
PUT  /api/incidents/:id                // Update incident
DELETE /api/incidents/:id              // Delete incident (admin only)
POST /api/incidents/:id/upvote         // Upvote incident
GET  /api/incidents/nearby             // Get nearby incidents
POST /api/incidents/check-proximity    // Check for nearby similar incidents
```

#### Police/Emergency Responder Endpoints
```javascript
// Police and emergency responder operations
GET  /api/police/dashboard             // Police dashboard data
GET  /api/police/incidents             // Assigned incidents
POST /api/police/incidents/:id/claim   // Claim incident for response
PUT  /api/police/incidents/:id/status  // Update incident status
POST /api/police/incidents/:id/notes   // Add response notes
GET  /api/police/metrics               // Response metrics
```

#### Hospital Endpoints
```javascript
// Hospital and medical operations
GET  /api/hospital/dashboard           // Hospital dashboard data
POST /api/hospital/patients/search     // Search patients by phone/ID
GET  /api/hospital/patients/:id        // Get patient medical info
POST /api/hospital/patients/:id/admit  // Mark patient as admitted
GET  /api/hospital/incidents/medical   // Medical incidents
GET  /api/hospital/admissions          // Current admissions
```

#### Admin Endpoints
```javascript
// Administrative operations
GET  /api/admin/dashboard              // Admin dashboard data
GET  /api/admin/users                  // User management
PUT  /api/admin/users/:id/status       // Ban/unban users
GET  /api/admin/incidents/analytics    // Incident analytics
GET  /api/admin/system/health          // System health metrics
POST /api/admin/system/config          // Update system configuration
GET  /api/admin/audit-logs             // System audit logs
```

#### Media Upload Endpoints
```javascript
// Cloudinary integration
POST /api/media/upload                 // Upload media to Cloudinary
DELETE /api/media/:publicId            // Delete media from Cloudinary
GET  /api/media/signed-upload-url      // Get signed upload URL
```

### External Service Integrations

#### Cloudinary Integration
```javascript
// Cloudinary service for media management
const cloudinary = require('cloudinary').v2;

const uploadMedia = async (file, folder = 'incidents') => {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `emergency-platform/${folder}`,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
        { width: 1200, height: 1200, crop: 'limit' }
      ]
    });
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    throw new Error(`Media upload failed: ${error.message}`);
  }
};
```

#### Maps Integration
```javascript
// Google Maps/Mapbox integration for geocoding
const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    if (data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        coordinates: [location.lng, location.lat],
        formattedAddress: data.results[0].formatted_address
      };
    }
    throw new Error('Address not found');
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`);
  }
};

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();
    
    if (data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return 'Unknown location';
  } catch (error) {
    return 'Unknown location';
  }
};
```

### Proximity Detection System
```javascript
// Proximity detection for duplicate incident prevention
const checkNearbyIncidents = async (coordinates, type, radiusMeters = 100) => {
  try {
    const nearbyIncidents = await Incident.find({
      geoLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: coordinates
          },
          $maxDistance: radiusMeters
        }
      },
      type: type,
      status: { $in: ['reported', 'dispatched', 'arrived'] },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    }).limit(5);
    
    return nearbyIncidents;
  } catch (error) {
    throw new Error(`Proximity check failed: ${error.message}`);
  }
};
```

## Data Models

### Database Indexes

#### User Collection Indexes
```javascript
// Unique indexes
{ email: 1 } // Unique email lookup
{ phone: 1 } // Unique phone lookup (encrypted field)

// Query optimization indexes
{ role: 1 } // Role-based queries
{ department: 1 } // Department-based queries (police/hospital)
{ jurisdiction: 1 } // Jurisdiction-based queries (police)
{ isActive: 1, createdAt: -1 } // Active users listing
{ lastLogin: -1 } // Recent login tracking
```

#### Guest Collection Indexes
```javascript
// Primary lookup
{ guestId: 1 } // Unique guest identification
{ ipAddress: 1 } // IP-based tracking

// Cleanup and management queries
{ lastActiveAt: 1 } // Inactive guest cleanup
{ createdAt: 1 } // Guest lifecycle management
{ actionCount: 1 } // Action limit monitoring
```

#### Incident Collection Indexes
```javascript
// Geospatial index (CRITICAL for location queries and proximity detection)
{ geoLocation: '2dsphere' } // Geospatial queries and proximity detection

// Query optimization indexes
{ status: 1, createdAt: -1 } // Status-based listing with recency
{ type: 1, createdAt: -1 } // Type-based filtering with recency
{ priority: 1, status: 1 } // Priority and status combinations
{ 'assignedTo.userId': 1, status: 1 } // Responder's assigned incidents

// Reporter-based indexes
{ 'reportedBy.userType': 1, 'reportedBy.userId': 1 } // User's incidents
{ 'reportedBy.userType': 1, 'reportedBy.guestId': 1 } // Guest's incidents

// Compound indexes for complex queries
{ status: 1, type: 1, createdAt: -1 } // Multi-filter queries
{ geoLocation: '2dsphere', type: 1, status: 1 } // Location + type + status
{ 'assignedTo.department': 1, status: 1, createdAt: -1 } // Department workload
```

#### Audit Log Collection Indexes
```javascript
// Query optimization indexes
{ resource: 1, resourceId: 1, timestamp: -1 } // Resource audit history
{ 'performedBy.userId': 1, timestamp: -1 } // User action history
{ action: 1, timestamp: -1 } // Action type analysis
{ timestamp: -1 } // Chronological audit trail
```

### Data Encryption Strategy

#### Sensitive Fields Encryption
- **User Personal Data**: fullName, phone, address.street
- **Medical Information**: medicalConditions, allergies
- **Emergency Contacts**: name, phone
- **Vehicle Data**: vehicleNumber
- **Insurance Data**: provider, policyNumber

#### Encryption Implementation
```javascript
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  }

  encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    const decipher = crypto.createDecipher(
      this.algorithm,
      this.key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Geospatial Data Handling

#### GeoJSON Format
```javascript
// Standard GeoJSON Point format for MongoDB
geoLocation: {
  type: "Point",
  coordinates: [longitude, latitude] // Note: longitude first!
}
```

#### Geospatial Queries
```javascript
// Find incidents within radius (proximity detection)
const findNearbyIncidents = async (coordinates, radiusMeters, incidentType) => {
  return await Incident.find({
    geoLocation: {
      $near: {
        $geometry: { type: "Point", coordinates },
        $maxDistance: radiusMeters
      }
    },
    type: incidentType,
    status: { $in: ['reported', 'dispatched', 'arrived'] },
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).limit(5);
};

// Find incidents within polygon area (jurisdiction-based)
const findIncidentsInArea = async (polygonCoordinates) => {
  return await Incident.find({
    geoLocation: {
      $geoWithin: {
        $geometry: {
          type: "Polygon",
          coordinates: [polygonCoordinates]
        }
      }
    }
  });
};
```

### Status Workflow Management

#### Status Transition Rules
```javascript
const statusTransitions = {
  reported: ['dispatched'],
  dispatched: ['arrived', 'reported'], // Can revert if dispatch cancelled
  arrived: ['resolved', 'dispatched'], // Can revert if responder leaves
  resolved: [] // Final state, no transitions allowed
};

const canTransitionStatus = (currentStatus, newStatus, userRole) => {
  // Check if transition is allowed
  if (!statusTransitions[currentStatus]?.includes(newStatus)) {
    return false;
  }
  
  // Check role permissions
  const rolePermissions = {
    police: ['dispatched', 'arrived', 'resolved'],
    hospital: ['dispatched', 'arrived', 'resolved'],
    admin: ['dispatched', 'arrived', 'resolved']
  };
  
  return rolePermissions[userRole]?.includes(newStatus) || false;
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated:

**Consolidation Opportunities:**
- Properties for user registration data (2.1, 2.5, 2.6, 2.7) can be combined into comprehensive "user data completeness" property
- Properties for guest action tracking (3.2, 3.3) can be combined into "guest action management" property
- Properties for incident data collection (4.1, 4.6, 4.7) can be combined into "incident data completeness" property
- Properties for authentication and JWT (1.5, 13.2) can be combined into "authentication system" property
- Properties for role-based access (13.1, 13.3) can be combined into comprehensive "access control" property
- Properties for media upload (4.2, 4.3, 11.1, 11.4) can be combined into "media management" property

**Final Property Set:**
After removing redundancies and combining related properties, the following properties provide comprehensive coverage without overlap.

### Converting EARS to Properties

Based on the prework analysis, here are the testable correctness properties:

**Property 1: User registration data completeness**
*For any* valid user registration including personal details, medical information, emergency contacts, vehicles, and insurance data, the system should store all provided fields correctly with proper encryption for sensitive data
**Validates: Requirements 2.1, 2.2, 2.3, 2.5, 2.6, 2.7**

**Property 2: Email uniqueness enforcement**
*For any* attempt to register multiple users with the same email address, only the first registration should succeed and subsequent attempts should be rejected with appropriate error messages
**Validates: Requirements 2.4**

**Property 3: JWT authentication system**
*For any* user login attempt with valid credentials, the system should generate a valid JWT token, and for any API request with a valid token, the system should authenticate the user correctly
**Validates: Requirements 1.5, 13.2**

**Property 4: Role-based dashboard redirection**
*For any* successful user login, the system should redirect to the appropriate dashboard based on the user's role (user, police, hospital, admin)
**Validates: Requirements 1.6**

**Property 5: Guest action management**
*For any* guest user performing actions, the actionCount should increment correctly, lastActiveAt should update, and when reaching 10 actions, further actions should be blocked with registration prompts
**Validates: Requirements 3.2, 3.3, 3.4**

**Property 6: Guest ID uniqueness**
*For any* number of guest user creations, each guest should receive a unique guestId that doesn't conflict with existing guests
**Validates: Requirements 3.1**

**Property 7: Incident data completeness**
*For any* incident creation, all provided fields (title, description, type, location, media) should be stored with proper GeoJSON format, initial "reported" status, and correct reporter attribution
**Validates: Requirements 4.1, 4.6, 4.7**

**Property 8: Media management system**
*For any* media upload, the system should integrate with Cloudinary, validate file types, return secure URLs, and properly associate media with incidents
**Validates: Requirements 4.2, 4.3, 11.1, 11.2, 11.4, 11.7, 11.8**

**Property 9: Proximity detection system**
*For any* incident submission, the system should check for existing incidents within 100 meters of the same type using geospatial queries and consider time proximity for duplicate detection
**Validates: Requirements 5.1, 5.5, 5.6**

**Property 10: Status workflow management**
*For any* incident status update attempt, the system should enforce proper status transitions (reported → dispatched → arrived → resolved) and role-based authorization
**Validates: Requirements 6.1, 6.2, 6.8**

**Property 11: Audit logging system**
*For any* sensitive operation (status changes, patient access, user management), the system should create complete audit log entries with user attribution and timestamps
**Validates: Requirements 6.3, 6.6, 7.6, 13.8**

**Property 12: Hospital patient access control**
*For any* hospital user, the system should allow patient search and data viewing but restrict editing capabilities, and log all patient data access
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6**

**Property 13: Police incident management**
*For any* police user, the system should provide access to incidents in their jurisdiction, allow claiming and status updates, and track response times
**Validates: Requirements 8.1, 8.2, 8.4, 8.8**

**Property 14: Role-based access control**
*For any* API endpoint or frontend route access attempt, the system should enforce proper permissions based on user role (guest, user, police, hospital, admin)
**Validates: Requirements 13.1, 13.3**

**Property 15: Rate limiting enforcement**
*For any* rapid sequence of API requests, the system should enforce different rate limits based on user type and block excessive requests appropriately
**Validates: Requirements 13.4**

**Property 16: Input validation and sanitization**
*For any* user input across all endpoints, the system should validate data against schemas and sanitize input to prevent injection attacks
**Validates: Requirements 13.5**

**Property 17: Data encryption consistency**
*For any* sensitive data storage and retrieval, the system should encrypt data when storing and decrypt correctly when retrieving, maintaining data integrity
**Validates: Requirements 13.6**

**Property 18: Maps integration functionality**
*For any* location-based operation, the system should integrate correctly with Google Maps/Mapbox for geocoding, reverse geocoding, and location services
**Validates: Requirements 12.1, 12.2, 12.5**

**Property 19: Geospatial query efficiency**
*For any* location-based incident search or proximity detection, the system should use geospatial indexes and return accurate results within specified radius
**Validates: Requirements 15.1, 15.2**

**Property 20: API response consistency**
*For any* API endpoint, the system should return consistent JSON response formats with proper HTTP status codes and error handling
**Validates: Requirements 14.1, 14.2**

## Error Handling

### Error Response Format
All API errors follow a consistent JSON structure:
```javascript
{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human-readable error message",
    details: {}, // Additional error context (optional)
    field: "fieldName" // For validation errors (optional)
  },
  timestamp: "2024-01-01T00:00:00.000Z",
  requestId: "uuid-for-tracking"
}
```

### Error Categories

#### Validation Errors (400 Bad Request)
- Invalid input data format or missing required fields
- File type/size violations for media uploads
- Invalid GeoJSON coordinates or location data
- Constraint violations (email format, phone format, etc.)

#### Authentication Errors (401 Unauthorized)
- Invalid or expired JWT tokens
- Missing authentication credentials
- Guest user attempting restricted actions
- Invalid login credentials

#### Authorization Errors (403 Forbidden)
- Insufficient role permissions for requested action
- Guest user exceeding action limits
- Attempting to access restricted resources
- Cross-role data access violations

#### Resource Errors (404 Not Found)
- Incident, user, or patient not found
- Invalid endpoint routes
- Deleted or inactive resources

#### Conflict Errors (409 Conflict)
- Duplicate email registration attempts
- Concurrent status update conflicts
- Resource state conflicts

#### Rate Limiting Errors (429 Too Many Requests)
- Exceeded API rate limits for user type
- Guest user action limit reached
- Temporary throttling active

#### External Service Errors (502 Bad Gateway)
- Cloudinary upload failures
- Google Maps API failures
- Database connection issues

#### Server Errors (500 Internal Server Error)
- Unexpected system failures
- Encryption/decryption errors
- Database operation failures

### Frontend Error Handling

#### Error Boundary Component
```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Log to monitoring service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### API Error Handler
```javascript
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        // Redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        toast.error('You don\'t have permission to perform this action');
        break;
      case 429:
        toast.error('Too many requests. Please try again later');
        break;
      default:
        toast.error(data.error?.message || 'An unexpected error occurred');
    }
  } else if (error.request) {
    // Network error
    toast.error('Network error. Please check your connection');
  } else {
    // Other error
    toast.error('An unexpected error occurred');
  }
};
```

## Testing Strategy

### Dual Testing Approach

The system requires both **unit tests** and **property-based tests** for comprehensive coverage:

#### Unit Tests
Unit tests verify specific examples, edge cases, and error conditions:
- **Frontend Components**: Test component rendering, user interactions, and state management
- **API Endpoints**: Test specific request/response scenarios with known data
- **Database Operations**: Test CRUD operations with known test data
- **Middleware Functions**: Test authentication, validation, rate limiting with specific scenarios
- **Utility Functions**: Test encryption, validation helpers, proximity calculations
- **Error Conditions**: Test specific error scenarios and edge cases
- **Integration Points**: Test component interactions and external service integrations

#### Property-Based Tests
Property tests verify universal properties across all inputs:
- **Data Integrity**: Test that all data operations preserve correctness across all inputs
- **Security Properties**: Test encryption, validation, sanitization across all possible inputs
- **Business Rules**: Test guest limits, role permissions, status transitions across all scenarios
- **API Consistency**: Test response formats and behavior patterns across all endpoints
- **Geospatial Operations**: Test location queries with various coordinate ranges and edge cases
- **Concurrency Safety**: Test system behavior under concurrent operations
- **Authentication Flow**: Test JWT generation, validation, and refresh across all user types

### Property-Based Testing Configuration

**Testing Framework**: Use **fast-check** for JavaScript property-based testing
- Minimum **100 iterations** per property test for thorough coverage
- Each property test references its design document property
- Tag format: **Feature: emergency-incident-platform, Property {number}: {property_text}**

**Example Property Test Structure**:
```javascript
const fc = require('fast-check');

describe('Property Tests - Emergency Incident Platform', () => {
  test('Property 1: User registration data completeness', () => {
    // Feature: emergency-incident-platform, Property 1: User registration data completeness
    fc.assert(fc.property(
      userRegistrationDataArbitrary(),
      async (userData) => {
        const savedUser = await User.create(userData);
        
        // Verify all fields are stored correctly
        expect(savedUser.fullName).toBeDefined();
        expect(savedUser.email).toBe(userData.email);
        expect(savedUser.emergencyContacts).toHaveLength(userData.emergencyContacts.length);
        expect(savedUser.vehicles).toHaveLength(userData.vehicles.length);
        
        // Verify sensitive data is encrypted
        expect(savedUser.fullName).not.toBe(userData.fullName); // Should be encrypted
        
        // Verify decryption works
        const decryptedName = encryptionService.decrypt(savedUser.fullName);
        expect(decryptedName).toBe(userData.fullName);
      }
    ), { numRuns: 100 });
  });

  test('Property 9: Proximity detection system', () => {
    // Feature: emergency-incident-platform, Property 9: Proximity detection system
    fc.assert(fc.property(
      incidentDataArbitrary(),
      fc.array(incidentDataArbitrary(), { minLength: 1, maxLength: 10 }),
      async (newIncident, existingIncidents) => {
        // Create existing incidents
        await Incident.insertMany(existingIncidents);
        
        // Test proximity detection
        const nearbyIncidents = await checkNearbyIncidents(
          newIncident.geoLocation.coordinates,
          newIncident.type,
          100 // 100 meter radius
        );
        
        // Verify all returned incidents are within 100 meters and same type
        for (const incident of nearbyIncidents) {
          expect(incident.type).toBe(newIncident.type);
          
          const distance = calculateDistance(
            newIncident.geoLocation.coordinates,
            incident.geoLocation.coordinates
          );
          expect(distance).toBeLessThanOrEqual(100);
        }
      }
    ), { numRuns: 100 });
  });
});
```

### Testing Data Generators

**Custom Arbitraries for Property Tests**:
```javascript
// User registration data generator
const userRegistrationDataArbitrary = () => fc.record({
  fullName: fc.string({ minLength: 2, maxLength: 100 }),
  email: fc.emailAddress(),
  phone: fc.string({ minLength: 10, maxLength: 15 }),
  dob: fc.date({ min: new Date('1920-01-01'), max: new Date('2010-01-01') }),
  gender: fc.constantFrom('male', 'female', 'other'),
  address: fc.record({
    street: fc.string({ minLength: 5, maxLength: 200 }),
    city: fc.string({ minLength: 2, maxLength: 50 }),
    state: fc.string({ minLength: 2, maxLength: 50 }),
    pincode: fc.string({ minLength: 5, maxLength: 10 })
  }),
  bloodGroup: fc.constantFrom('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  emergencyContacts: fc.array(fc.record({
    name: fc.string({ minLength: 2, maxLength: 100 }),
    relation: fc.constantFrom('spouse', 'parent', 'sibling', 'friend'),
    phone: fc.string({ minLength: 10, maxLength: 15 })
  }), { minLength: 1, maxLength: 5 })
});

// Incident data generator
const incidentDataArbitrary = () => fc.record({
  title: fc.string({ minLength: 5, maxLength: 200 }),
  description: fc.string({ minLength: 10, maxLength: 2000 }),
  type: fc.constantFrom('Fire', 'Accident', 'Medical', 'Crime'),
  geoLocation: fc.record({
    type: fc.constant('Point'),
    coordinates: fc.tuple(
      fc.float({ min: -180, max: 180 }), // longitude
      fc.float({ min: -90, max: 90 })    // latitude
    )
  })
});

// Geospatial coordinate generator
const coordinatesArbitrary = () => fc.tuple(
  fc.float({ min: -180, max: 180 }), // longitude
  fc.float({ min: -90, max: 90 })    // latitude
);
```

### Testing Guidelines

**Unit Test Focus Areas**:
- Specific UI component behavior with known props and state
- API endpoint behavior with known inputs and expected outputs
- Database model validation with edge cases and boundary values
- Middleware functionality with various authentication scenarios
- Error handling with specific error conditions and recovery
- Integration between frontend and backend components

**Property Test Focus Areas**:
- Universal data integrity across all possible user inputs
- Security properties holding for all possible malicious inputs
- Business rule enforcement across all possible user scenarios
- API consistency across all possible request combinations
- Geospatial functionality with all possible coordinate ranges
- Authentication and authorization across all possible user types and permissions

**Test Environment Setup**:
- Use separate test databases for isolation
- Mock external services (Cloudinary, Google Maps) for unit tests
- Use real external services for integration tests
- Implement cleanup procedures for test isolation
- Use factories and fixtures for consistent test data generation

**Performance Testing**:
- Load testing for high-traffic scenarios
- Stress testing for concurrent user operations
- Database query performance testing
- Media upload performance testing
- Geospatial query performance testing

Both testing approaches are essential and complementary - unit tests catch specific bugs and validate known scenarios, while property tests verify that the system maintains correctness across the entire input space and under all possible conditions.