/**
 * Utility functions for incident-related operations
 */

// Incident type configurations
export const INCIDENT_TYPES = {
  medical: { 
    label: 'Medical Emergency', 
    icon: '🏥', 
    color: 'red',
    description: 'Medical emergencies requiring immediate attention'
  },
  fire: { 
    label: 'Fire', 
    icon: '🔥', 
    color: 'orange',
    description: 'Fire incidents and related emergencies'
  },
  accident: { 
    label: 'Traffic Accident', 
    icon: '🚗', 
    color: 'yellow',
    description: 'Vehicle accidents and traffic incidents'
  },
  crime: { 
    label: 'Crime in Progress', 
    icon: '🚨', 
    color: 'red',
    description: 'Criminal activities requiring police response'
  },
  natural: { 
    label: 'Natural Disaster', 
    icon: '🌪️', 
    color: 'purple',
    description: 'Natural disasters and weather emergencies'
  },
  utility: { 
    label: 'Utility Emergency', 
    icon: '⚡', 
    color: 'blue',
    description: 'Power outages, gas leaks, and utility issues'
  },
  other: { 
    label: 'Other Emergency', 
    icon: '⚠️', 
    color: 'gray',
    description: 'Other emergency situations'
  }
};

// Priority level configurations
export const PRIORITY_LEVELS = {
  low: { 
    label: 'Low Priority', 
    color: 'green', 
    description: 'Non-urgent situation',
    responseTime: '30-60 minutes'
  },
  medium: { 
    label: 'Medium Priority', 
    color: 'yellow', 
    description: 'Requires attention',
    responseTime: '15-30 minutes'
  },
  high: { 
    label: 'High Priority', 
    color: 'orange', 
    description: 'Urgent situation',
    responseTime: '5-15 minutes'
  },
  critical: { 
    label: 'Critical', 
    color: 'red', 
    description: 'Life-threatening emergency',
    responseTime: 'Immediate'
  }
};

// Status configurations
export const INCIDENT_STATUSES = {
  reported: {
    label: 'Reported',
    color: 'blue',
    description: 'Incident has been reported and is being processed'
  },
  active: {
    label: 'Active',
    color: 'green',
    description: 'Incident is confirmed and active'
  },
  responding: {
    label: 'Responding',
    color: 'yellow',
    description: 'Emergency responders are en route'
  },
  onScene: {
    label: 'On Scene',
    color: 'orange',
    description: 'Responders have arrived at the scene'
  },
  resolved: {
    label: 'Resolved',
    color: 'gray',
    description: 'Incident has been resolved'
  },
  cancelled: {
    label: 'Cancelled',
    color: 'red',
    description: 'Incident was cancelled or determined to be false'
  }
};

/**
 * Get incident type icon
 * @param {string} type - Incident type
 * @returns {string} - Icon emoji
 */
export const getIncidentTypeIcon = (type) => {
  return INCIDENT_TYPES[type]?.icon || '⚠️';
};

/**
 * Get incident type label
 * @param {string} type - Incident type
 * @returns {string} - Human readable label
 */
export const getIncidentTypeLabel = (type) => {
  return INCIDENT_TYPES[type]?.label || 'Unknown';
};

/**
 * Get priority color class
 * @param {string} priority - Priority level
 * @returns {string} - Tailwind color class
 */
export const getPriorityColor = (priority) => {
  return PRIORITY_LEVELS[priority]?.color || 'gray';
};

/**
 * Get priority label
 * @param {string} priority - Priority level
 * @returns {string} - Human readable label
 */
export const getPriorityLabel = (priority) => {
  return PRIORITY_LEVELS[priority]?.label || 'Unknown';
};

/**
 * Get status color class
 * @param {string} status - Incident status
 * @returns {string} - Tailwind color class
 */
export const getStatusColor = (status) => {
  return INCIDENT_STATUSES[status]?.color || 'gray';
};

/**
 * Get status label
 * @param {string} status - Incident status
 * @returns {string} - Human readable label
 */
export const getStatusLabel = (status) => {
  return INCIDENT_STATUSES[status]?.label || 'Unknown';
};

/**
 * Format distance in human readable format
 * @param {number} distance - Distance in meters
 * @returns {string} - Formatted distance
 */
export const formatDistance = (distance) => {
  if (distance < 1000) {
    return `${Math.round(distance)}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};

/**
 * Format time ago in human readable format
 * @param {string|Date} timestamp - Timestamp
 * @returns {string} - Formatted time ago
 */
export const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((now - time) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} - Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

/**
 * Validate incident form data
 * @param {Object} formData - Form data to validate
 * @param {boolean} isGuest - Whether user is a guest
 * @returns {Object} - Validation errors
 */
export const validateIncidentForm = (formData, isGuest = false) => {
  const errors = {};

  // Required fields
  if (!formData.type) {
    errors.type = 'Please select an incident type';
  }

  if (!formData.description?.trim()) {
    errors.description = 'Please provide a description of the incident';
  } else if (formData.description.length < 10) {
    errors.description = 'Description must be at least 10 characters long';
  } else if (formData.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }

  // Location validation
  if (!formData.location?.latitude && !formData.location?.manualAddress?.trim()) {
    errors.location = 'Please provide a location (GPS or manual address)';
  }

  // Contact info validation for guests
  if (isGuest) {
    if (!formData.contactInfo?.phone?.trim()) {
      errors.contactPhone = 'Phone number is required for guest reporting';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.contactInfo.phone)) {
      errors.contactPhone = 'Please enter a valid phone number';
    }

    if (!formData.contactInfo?.name?.trim()) {
      errors.contactName = 'Name is required for guest reporting';
    } else if (formData.contactInfo.name.length < 2) {
      errors.contactName = 'Name must be at least 2 characters long';
    }

    if (formData.contactInfo?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactInfo.email)) {
      errors.contactEmail = 'Please enter a valid email address';
    }
  }

  // Media validation
  if (formData.media?.length > 10) {
    errors.media = 'Maximum 10 media files allowed';
  }

  return errors;
};

/**
 * Prepare incident data for API submission
 * @param {Object} formData - Form data
 * @param {Object} user - User object (if authenticated)
 * @param {string} guestId - Guest ID (if guest user)
 * @returns {Object} - Prepared incident data
 */
export const prepareIncidentData = (formData, user = null, guestId = null) => {
  const isAuthenticated = !!user;
  
  return {
    type: formData.type,
    description: formData.description.trim(),
    priority: formData.priority || 'medium',
    location: {
      type: 'Point',
      coordinates: formData.location.latitude && formData.location.longitude 
        ? [formData.location.longitude, formData.location.latitude]
        : null,
      address: formData.location.address || formData.location.manualAddress?.trim()
    },
    media: formData.media || [],
    reportedBy: isAuthenticated ? user.id : guestId,
    reporterType: isAuthenticated ? 'user' : 'guest',
    contactInfo: (!isAuthenticated && formData.contactInfo) ? {
      name: formData.contactInfo.name?.trim(),
      phone: formData.contactInfo.phone?.trim(),
      email: formData.contactInfo.email?.trim() || null
    } : null,
    metadata: {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      source: 'web_app'
    }
  };
};

/**
 * Check if two locations are within a certain distance
 * @param {Object} location1 - First location {latitude, longitude}
 * @param {Object} location2 - Second location {latitude, longitude}
 * @param {number} maxDistance - Maximum distance in meters
 * @returns {boolean} - Whether locations are within distance
 */
export const areLocationsNear = (location1, location2, maxDistance = 500) => {
  if (!location1?.latitude || !location1?.longitude || 
      !location2?.latitude || !location2?.longitude) {
    return false;
  }

  const distance = calculateDistance(
    location1.latitude,
    location1.longitude,
    location2.latitude,
    location2.longitude
  );

  return distance <= maxDistance;
};

/**
 * Get expected response time based on priority
 * @param {string} priority - Priority level
 * @returns {string} - Expected response time
 */
export const getExpectedResponseTime = (priority) => {
  return PRIORITY_LEVELS[priority]?.responseTime || 'Unknown';
};

/**
 * Sort incidents by priority and time
 * @param {Array} incidents - Array of incidents
 * @returns {Array} - Sorted incidents
 */
export const sortIncidentsByPriority = (incidents) => {
  const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  
  return [...incidents].sort((a, b) => {
    // First sort by priority
    const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    
    // Then sort by creation time (newest first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
};

/**
 * Filter incidents by various criteria
 * @param {Array} incidents - Array of incidents
 * @param {Object} filters - Filter criteria
 * @returns {Array} - Filtered incidents
 */
export const filterIncidents = (incidents, filters = {}) => {
  return incidents.filter(incident => {
    // Type filter
    if (filters.type && incident.type !== filters.type) {
      return false;
    }
    
    // Priority filter
    if (filters.priority && incident.priority !== filters.priority) {
      return false;
    }
    
    // Status filter
    if (filters.status && incident.status !== filters.status) {
      return false;
    }
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      const incidentDate = new Date(incident.createdAt);
      if (filters.startDate && incidentDate < new Date(filters.startDate)) {
        return false;
      }
      if (filters.endDate && incidentDate > new Date(filters.endDate)) {
        return false;
      }
    }
    
    // Location filter (within radius)
    if (filters.location && filters.radius) {
      if (!incident.location?.coordinates) return false;
      
      const distance = calculateDistance(
        filters.location.latitude,
        filters.location.longitude,
        incident.location.coordinates[1],
        incident.location.coordinates[0]
      );
      
      if (distance > filters.radius) return false;
    }
    
    return true;
  });
};