# Requirements Document

## Introduction

The Emergency Incident Reporting Platform is a complete full-stack application that enables citizens, emergency responders, and healthcare facilities to report, track, and manage emergency incidents. The system includes a Node.js/Express backend API, React frontend application, and supports multiple user types including guests, registered users, police, hospitals, and administrators. It provides real-time incident reporting with media uploads, geolocation services, proximity detection, and comprehensive emergency response workflows.

## Glossary

- **System**: The complete Emergency Incident Reporting Platform (frontend + backend)
- **Backend**: Node.js/Express API server with MongoDB database
- **Frontend**: React application with Vite and Tailwind CSS
- **User**: A registered citizen with full profile and unlimited actions
- **Guest**: An anonymous user with limited actions (max 10)
- **Police**: Emergency responder with incident dispatch and response capabilities
- **Hospital**: Healthcare facility user with patient search and medical access
- **Admin**: System administrator with full platform management access
- **Incident**: An emergency event report with location, media, and response tracking
- **Status**: Incident lifecycle state (reported → dispatched → arrived → resolved)
- **Proximity Detection**: System check for similar incidents within 100 meters
- **Cloudinary**: Third-party service for image and video upload management
- **Maps Integration**: Google Maps or Mapbox for location services
- **Action**: Any user interaction (report, upvote, dispatch, etc.)

## Requirements

### Requirement 1: Landing Page and User Authentication

**User Story:** As a person accessing the platform, I want a clear landing page with multiple login options, so that I can access the appropriate interface for my role.

#### Acceptance Criteria

1. WHEN a user visits the landing page, THE System SHALL display buttons for "Login as User", "Login as Police", "Login as Hospital", and "Report an Incident (Guest)"
2. WHEN a user clicks "Report Incident", THE System SHALL show a popup with options "Continue as Guest" and "Login / Register"
3. WHEN a user selects "Continue as Guest", THE System SHALL create a guest session and redirect to incident reporting
4. WHEN a user selects "Login / Register", THE System SHALL redirect to the appropriate authentication form
5. THE System SHALL implement JWT-based authentication for all user types
6. WHEN a user logs in successfully, THE System SHALL redirect to their role-specific dashboard
7. THE System SHALL maintain user sessions and handle token refresh automatically
8. WHEN authentication fails, THE System SHALL display clear error messages and retry options

### Requirement 2: User Registration and Profile Management

**User Story:** As a person who wants to report incidents, I want to register with comprehensive personal and medical details, so that emergency responders have complete information when needed.

#### Acceptance Criteria

1. WHEN a user registers, THE System SHALL store fullName, dob, gender, phone, email, address (street, city, state, pincode), bloodGroup, medicalConditions, allergies, emergencyContacts array, vehicles array, and insurance details
2. WHEN storing user data, THE System SHALL validate all required fields and data formats
3. WHEN storing sensitive medical data, THE System SHALL encrypt the information for security
4. THE System SHALL ensure email addresses are unique across all users
5. WHEN a user provides emergency contacts, THE System SHALL store name, relation, and phone for each contact
6. WHEN a user provides vehicle information, THE System SHALL store vehicleNumber, type, and model for each vehicle
7. WHEN a user provides insurance details, THE System SHALL store provider, policyNumber, and validTill date
8. THE System SHALL provide a user dashboard for profile management and incident history

### Requirement 3: Guest User Management

**User Story:** As a person in an emergency situation, I want to report incidents without registration, so that I can quickly get help without delays.

#### Acceptance Criteria

1. WHEN a guest accesses the system, THE System SHALL auto-generate a unique guestId and track via IP address
2. THE System SHALL track actionCount for each guest user with a maximum of 10 actions
3. WHEN a guest performs an action, THE System SHALL increment their actionCount and update lastActiveAt
4. WHEN a guest reaches 10 actions, THE System SHALL display a registration prompt and block further actions
5. THE System SHALL allow guests to report incidents and upvote existing incidents
6. WHEN a guest reaches the action limit, THE System SHALL provide clear messaging about registration benefits
7. THE System SHALL track guest sessions and maintain state across browser sessions

### Requirement 4: Incident Reporting with Media Upload

**User Story:** As a user or guest, I want to report emergency incidents with photos, videos, and location data, so that responders have complete situational awareness.

#### Acceptance Criteria

1. WHEN creating an incident, THE System SHALL collect title, description, type (Fire, Accident, Medical, Crime), location coordinates, and media files
2. THE System SHALL integrate with Cloudinary for secure image and video upload
3. WHEN a user uploads media, THE System SHALL return secure URLs and store them with the incident
4. THE System SHALL capture GPS coordinates automatically and allow manual location adjustment via map interface
5. THE System SHALL validate incident data and provide real-time feedback during form completion
6. THE System SHALL set initial status to "reported" and auto-generate timestamps
7. WHEN storing location data, THE System SHALL use GeoJSON format for database storage
8. THE System SHALL support multiple media files per incident with size and format validation

### Requirement 5: Proximity Detection and Duplicate Prevention

**User Story:** As a user reporting an incident, I want the system to detect nearby similar incidents, so that I can avoid creating duplicates and instead support existing reports.

#### Acceptance Criteria

1. WHEN a user submits an incident, THE System SHALL check for existing incidents within 100 meters of the same type
2. WHEN a similar incident exists nearby, THE System SHALL display a popup asking "A similar incident already exists. Is this the same event?"
3. WHEN a user confirms it's the same event, THE System SHALL redirect them to upvote the existing incident
4. WHEN a user confirms it's a different event, THE System SHALL create the new incident as requested
5. THE System SHALL use geospatial queries to efficiently detect proximity matches
6. THE System SHALL consider incident type and time proximity (within last 24 hours) for duplicate detection
7. THE System SHALL display the existing incident details in the confirmation popup for user reference

### Requirement 6: Incident Status Workflow and Response Management

**User Story:** As an emergency responder, I want to track incident status through the complete response lifecycle, so that all stakeholders know the current response state.

#### Acceptance Criteria

1. THE System SHALL support incident status progression: reported → dispatched → arrived → resolved
2. WHEN police, fire, or hospital users access an incident, THE System SHALL allow status updates based on their role
3. WHEN a responder marks an incident as "dispatched", THE System SHALL log the responder details and timestamp
4. WHEN a responder arrives on scene, THE System SHALL allow status update to "arrived" with location verification
5. WHEN an incident is resolved, THE System SHALL require resolution details and final status update
6. THE System SHALL maintain a complete audit log of all status changes with user attribution
7. THE System SHALL send notifications to relevant parties when status changes occur
8. THE System SHALL prevent unauthorized status changes based on user roles and current status

### Requirement 7: Hospital Module and Patient Management

**User Story:** As a hospital user, I want to search for patient information and manage medical records, so that I can provide appropriate emergency care.

#### Acceptance Criteria

1. WHEN a hospital user logs in, THE System SHALL provide access to patient search functionality
2. THE System SHALL allow patient search by phone number and government ID
3. WHEN a patient is found, THE System SHALL display medical history, emergency contacts, blood group, and allergies
4. THE System SHALL restrict hospital users from editing patient data (read-only access)
5. THE System SHALL allow hospital users to mark patients as "admitted" with admission details
6. THE System SHALL log all patient data access for audit and privacy compliance
7. THE System SHALL ensure hospital users can only access medical incidents and patient data
8. THE System SHALL provide hospital dashboard with current patients and incident statistics

### Requirement 8: Police and Emergency Responder Interface

**User Story:** As a police officer or emergency responder, I want to view and manage incident responses, so that I can coordinate effective emergency response.

#### Acceptance Criteria

1. WHEN police users log in, THE System SHALL display a dashboard with active incidents in their jurisdiction
2. THE System SHALL allow police users to claim incidents for dispatch and response
3. THE System SHALL provide incident details including location, media, reporter information, and current status
4. THE System SHALL allow police users to update incident status and add response notes
5. THE System SHALL display incidents on an interactive map with real-time updates
6. THE System SHALL provide filtering options by incident type, status, and time range
7. THE System SHALL allow police users to communicate with other responders on the same incident
8. THE System SHALL track response times and generate performance metrics

### Requirement 9: Admin Panel and System Management

**User Story:** As a system administrator, I want comprehensive platform oversight and user management capabilities, so that I can maintain system integrity and performance.

#### Acceptance Criteria

1. WHEN an admin logs in, THE System SHALL provide a comprehensive dashboard with system analytics
2. THE System SHALL display incident statistics, response times, and department performance metrics
3. THE System SHALL allow admins to view the complete incident lifecycle and response history
4. THE System SHALL provide user management capabilities including account suspension and role changes
5. THE System SHALL allow admins to ban malicious users and manage abuse reports
6. THE System SHALL display real-time system health metrics and database performance
7. THE System SHALL provide data export capabilities for reporting and analysis
8. THE System SHALL allow configuration of system parameters like action limits and proximity thresholds

### Requirement 10: Frontend React Application

**User Story:** As a user of any type, I want a responsive and intuitive web interface, so that I can efficiently interact with the emergency reporting system.

#### Acceptance Criteria

1. THE System SHALL provide a React frontend application built with Vite and styled with Tailwind CSS
2. THE System SHALL implement responsive design that works on desktop, tablet, and mobile devices
3. THE System SHALL provide role-specific dashboards and navigation based on user authentication
4. THE System SHALL integrate Google Maps or Mapbox for interactive location selection and incident visualization
5. THE System SHALL implement real-time updates for incident status changes and new reports
6. THE System SHALL provide intuitive forms with validation feedback and error handling
7. THE System SHALL implement loading states and optimistic updates for better user experience
8. THE System SHALL follow accessibility guidelines and provide keyboard navigation support

### Requirement 11: Media Integration with Cloudinary

**User Story:** As a user reporting an incident, I want to easily upload photos and videos, so that responders have visual context for the emergency.

#### Acceptance Criteria

1. THE System SHALL integrate with Cloudinary for secure media upload and storage
2. WHEN a user selects media files, THE System SHALL validate file types (images and videos only)
3. THE System SHALL provide upload progress indicators and handle upload failures gracefully
4. WHEN media is uploaded successfully, THE System SHALL store secure Cloudinary URLs in the database
5. THE System SHALL implement image optimization and automatic format conversion for performance
6. THE System SHALL provide media preview functionality before and after upload
7. THE System SHALL set appropriate file size limits and provide clear error messages for violations
8. THE System SHALL ensure uploaded media is properly associated with incidents and user accounts

### Requirement 12: Maps Integration and Geolocation

**User Story:** As a user reporting or viewing incidents, I want accurate location services and map visualization, so that emergency responders can find the exact location quickly.

#### Acceptance Criteria

1. THE System SHALL integrate with Google Maps or Mapbox for location services
2. WHEN a user reports an incident, THE System SHALL automatically detect their current location via GPS
3. THE System SHALL allow users to manually adjust location by clicking on an interactive map
4. THE System SHALL display all incidents on a map view with appropriate markers and clustering
5. THE System SHALL provide address geocoding and reverse geocoding capabilities
6. THE System SHALL implement location-based incident filtering and search functionality
7. THE System SHALL ensure location accuracy and provide fallback options when GPS is unavailable
8. THE System SHALL display incident proximity and travel directions for responders

### Requirement 13: Role-Based Access Control and Security

**User Story:** As a system administrator, I want comprehensive security measures and role-based access control, so that sensitive data is protected and system access is properly managed.

#### Acceptance Criteria

1. THE System SHALL support roles: guest, user, police, hospital, and admin with distinct permissions
2. THE System SHALL implement JWT-based authentication with secure token management
3. THE System SHALL enforce role-based access control for all API endpoints and frontend routes
4. THE System SHALL implement rate limiting with different limits for each user type
5. THE System SHALL validate and sanitize all user input to prevent injection attacks
6. THE System SHALL encrypt sensitive medical and personal data in the database
7. THE System SHALL implement secure headers, CORS configuration, and HTTPS enforcement
8. THE System SHALL provide audit logging for all sensitive operations and data access

### Requirement 14: API Design and Backend Architecture

**User Story:** As a frontend developer, I want well-designed RESTful APIs, so that I can build responsive and reliable user interfaces.

#### Acceptance Criteria

1. THE System SHALL provide RESTful API endpoints following standard HTTP methods and status codes
2. THE System SHALL implement consistent JSON response formats with proper error handling
3. THE System SHALL provide comprehensive API documentation with examples and schemas
4. THE System SHALL implement API versioning and backward compatibility measures
5. THE System SHALL use MongoDB with Mongoose ODM for data persistence and validation
6. THE System SHALL implement proper database indexing for performance optimization
7. THE System SHALL follow MVC architecture pattern with clear separation of concerns
8. THE System SHALL provide environment-based configuration and deployment readiness

### Requirement 15: System Performance and Scalability

**User Story:** As a system administrator, I want the platform to perform well under load, so that it remains reliable during emergency situations.

#### Acceptance Criteria

1. THE System SHALL implement efficient database queries with proper indexing strategies
2. THE System SHALL use geospatial indexes for location-based queries and proximity detection
3. THE System SHALL implement caching strategies for frequently accessed data
4. THE System SHALL optimize media delivery through Cloudinary's CDN capabilities
5. THE System SHALL implement connection pooling and database optimization techniques
6. THE System SHALL provide monitoring and logging for performance analysis
7. THE System SHALL handle concurrent users and high-traffic scenarios gracefully
8. THE System SHALL implement graceful degradation when external services are unavailable