/**
 * Maps service for handling geocoding, reverse geocoding, and other map-related operations
 */

// Configuration
const MAPS_CONFIG = {
  defaultCenter: { lat: 40.7128, lng: -74.0060 }, // NYC
  defaultZoom: 13,
  geocodingCacheTimeout: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  retryDelay: 1000
};

// Cache for geocoding results
const geocodingCache = new Map();

/**
 * Initialize Google Maps API
 * @returns {Promise<boolean>} - Whether initialization was successful
 */
export const initializeMaps = async () => {
  return new Promise((resolve) => {
    if (window.google && window.google.maps) {
      resolve(true);
      return;
    }

    // For development, use mock implementation
    // In production, load actual Google Maps API
    setTimeout(() => {
      // Mock Google Maps API is already loaded in GoogleMap component
      resolve(true);
    }, 100);
  });
};

/**
 * Get current user location
 * @param {Object} options - Geolocation options
 * @returns {Promise<Object>} - Location object with latitude and longitude
 */
export const getCurrentLocation = (options = {}) => {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
    ...options
  };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        const errorMessages = {
          1: 'Location access denied by user',
          2: 'Location information unavailable',
          3: 'Location request timed out'
        };
        
        reject(new Error(errorMessages[error.code] || 'Unknown geolocation error'));
      },
      defaultOptions
    );
  });
};

/**
 * Watch user location changes
 * @param {Function} callback - Callback function for location updates
 * @param {Object} options - Geolocation options
 * @returns {number} - Watch ID for clearing the watch
 */
export const watchLocation = (callback, options = {}) => {
  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000, // 1 minute
    ...options
  };

  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by this browser');
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });
    },
    (error) => {
      callback(null, error);
    },
    defaultOptions
  );
};

/**
 * Clear location watch
 * @param {number} watchId - Watch ID returned by watchLocation
 */
export const clearLocationWatch = (watchId) => {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Geocode an address to coordinates
 * @param {string} address - Address to geocode
 * @returns {Promise<Object>} - Location object with latitude and longitude
 */
export const geocodeAddress = async (address) => {
  if (!address || typeof address !== 'string') {
    throw new Error('Invalid address provided');
  }

  const cacheKey = `geocode_${address.toLowerCase().trim()}`;
  
  // Check cache first
  if (geocodingCache.has(cacheKey)) {
    const cached = geocodingCache.get(cacheKey);
    if (Date.now() - cached.timestamp < MAPS_CONFIG.geocodingCacheTimeout) {
      return cached.data;
    }
    geocodingCache.delete(cacheKey);
  }

  try {
    // Mock geocoding implementation
    // In production, use Google Maps Geocoding API
    const mockResult = await mockGeocode(address);
    
    // Cache the result
    geocodingCache.set(cacheKey, {
      data: mockResult,
      timestamp: Date.now()
    });
    
    return mockResult;
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`);
  }
};

/**
 * Reverse geocode coordinates to address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string>} - Address string
 */
export const reverseGeocode = async (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Invalid coordinates provided');
  }

  const cacheKey = `reverse_${latitude.toFixed(6)}_${longitude.toFixed(6)}`;
  
  // Check cache first
  if (geocodingCache.has(cacheKey)) {
    const cached = geocodingCache.get(cacheKey);
    if (Date.now() - cached.timestamp < MAPS_CONFIG.geocodingCacheTimeout) {
      return cached.data;
    }
    geocodingCache.delete(cacheKey);
  }

  try {
    // Mock reverse geocoding implementation
    // In production, use Google Maps Geocoding API
    const mockResult = await mockReverseGeocode(latitude, longitude);
    
    // Cache the result
    geocodingCache.set(cacheKey, {
      data: mockResult,
      timestamp: Date.now()
    });
    
    return mockResult;
  } catch (error) {
    throw new Error(`Reverse geocoding failed: ${error.message}`);
  }
};

/**
 * Calculate distance between two points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} - Distance in meters
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
};

/**
 * Calculate bearing between two points
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} - Bearing in degrees
 */
export const calculateBearing = (lat1, lng1, lat2, lng2) => {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);

  return (θ * 180 / Math.PI + 360) % 360; // Convert to degrees and normalize
};

/**
 * Check if a point is within a circular area
 * @param {Object} point - Point to check {latitude, longitude}
 * @param {Object} center - Center of circle {latitude, longitude}
 * @param {number} radius - Radius in meters
 * @returns {boolean} - Whether point is within the area
 */
export const isPointInCircle = (point, center, radius) => {
  const distance = calculateDistance(
    center.latitude,
    center.longitude,
    point.latitude,
    point.longitude
  );
  return distance <= radius;
};

/**
 * Get bounds for a set of coordinates
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {Object} - Bounds object with north, south, east, west
 */
export const getBounds = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  let north = coordinates[0].latitude;
  let south = coordinates[0].latitude;
  let east = coordinates[0].longitude;
  let west = coordinates[0].longitude;

  coordinates.forEach(coord => {
    north = Math.max(north, coord.latitude);
    south = Math.min(south, coord.latitude);
    east = Math.max(east, coord.longitude);
    west = Math.min(west, coord.longitude);
  });

  return { north, south, east, west };
};

/**
 * Get center point of a set of coordinates
 * @param {Array} coordinates - Array of {latitude, longitude} objects
 * @returns {Object} - Center point {latitude, longitude}
 */
export const getCenter = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return MAPS_CONFIG.defaultCenter;
  }

  if (coordinates.length === 1) {
    return {
      latitude: coordinates[0].latitude,
      longitude: coordinates[0].longitude
    };
  }

  const bounds = getBounds(coordinates);
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2
  };
};

/**
 * Format coordinates for display
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} precision - Number of decimal places
 * @returns {string} - Formatted coordinates
 */
export const formatCoordinates = (latitude, longitude, precision = 6) => {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {boolean} - Whether coordinates are valid
 */
export const validateCoordinates = (latitude, longitude) => {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees
 * @returns {number} - Radians
 */
export const degreesToRadians = (degrees) => {
  return degrees * Math.PI / 180;
};

/**
 * Convert radians to degrees
 * @param {number} radians - Radians
 * @returns {number} - Degrees
 */
export const radiansToDegrees = (radians) => {
  return radians * 180 / Math.PI;
};

// Mock implementations for development
const mockGeocode = async (address) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock geocoding based on common patterns
  const mockLocations = {
    'new york': { latitude: 40.7128, longitude: -74.0060 },
    'los angeles': { latitude: 34.0522, longitude: -118.2437 },
    'chicago': { latitude: 41.8781, longitude: -87.6298 },
    'houston': { latitude: 29.7604, longitude: -95.3698 },
    'phoenix': { latitude: 33.4484, longitude: -112.0740 }
  };

  const lowerAddress = address.toLowerCase();
  for (const [city, coords] of Object.entries(mockLocations)) {
    if (lowerAddress.includes(city)) {
      return coords;
    }
  }

  // Default to NYC with some random offset
  return {
    latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
    longitude: -74.0060 + (Math.random() - 0.5) * 0.1
  };
};

const mockReverseGeocode = async (latitude, longitude) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock address generation
  const streetNumber = Math.floor(Math.random() * 9999) + 1;
  const streetNames = ['Main St', 'Oak Ave', 'Park Blvd', 'First St', 'Broadway', 'Center St'];
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  
  return `${streetNumber} ${streetName}, City, State ${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`;
};

// Clear cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of geocodingCache.entries()) {
    if (now - value.timestamp > MAPS_CONFIG.geocodingCacheTimeout) {
      geocodingCache.delete(key);
    }
  }
}, MAPS_CONFIG.geocodingCacheTimeout);

export default {
  initializeMaps,
  getCurrentLocation,
  watchLocation,
  clearLocationWatch,
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  calculateBearing,
  isPointInCircle,
  getBounds,
  getCenter,
  formatCoordinates,
  validateCoordinates,
  degreesToRadians,
  radiansToDegrees
};