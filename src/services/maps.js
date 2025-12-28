/**
 * Google Maps Service
 * 
 * Handles geocoding, reverse geocoding, distance calculations,
 * and location validation for the emergency incident platform
 */

const axios = require('axios');
const { MAPS_CONFIG, buildApiUrl, validateMapsConfig } = require('../config/maps');

// Validate configuration on startup
const configValidation = validateMapsConfig();
if (!configValidation.isValid) {
  console.warn('⚠️ Google Maps service may not function properly due to configuration issues');
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - First coordinate {lat, lng}
 * @param {Object} coord2 - Second coordinate {lat, lng}
 * @returns {number} Distance in meters
 */
const calculateDistance = (coord1, coord2) => {
  try {
    const R = 6371000; // Earth's radius in meters
    const lat1Rad = coord1.lat * Math.PI / 180;
    const lat2Rad = coord2.lat * Math.PI / 180;
    const deltaLatRad = (coord2.lat - coord1.lat) * Math.PI / 180;
    const deltaLngRad = (coord2.lng - coord1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Distance calculation error:', error);
    throw new Error(`Failed to calculate distance: ${error.message}`);
  }
};

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} Validation result
 */
const validateCoordinates = (lat, lng) => {
  const errors = [];
  const { VALIDATION } = MAPS_CONFIG;
  
  // Check if coordinates are numbers
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    errors.push('Coordinates must be numbers');
  }
  
  // Check latitude range
  if (lat < VALIDATION.MIN_LATITUDE || lat > VALIDATION.MAX_LATITUDE) {
    errors.push(`Latitude must be between ${VALIDATION.MIN_LATITUDE} and ${VALIDATION.MAX_LATITUDE}`);
  }
  
  // Check longitude range
  if (lng < VALIDATION.MIN_LONGITUDE || lng > VALIDATION.MAX_LONGITUDE) {
    errors.push(`Longitude must be between ${VALIDATION.MIN_LONGITUDE} and ${VALIDATION.MAX_LONGITUDE}`);
  }
  
  // Check for NaN or Infinity
  if (!isFinite(lat) || !isFinite(lng)) {
    errors.push('Coordinates must be finite numbers');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    coordinates: errors.length === 0 ? { lat, lng } : null
  };
};

/**
 * Geocode an address to coordinates
 * @param {string} address - Address to geocode
 * @param {Object} options - Geocoding options
 * @returns {Promise<Object>} Geocoding result
 */
const geocodeAddress = async (address, options = {}) => {
  try {
    if (!address || typeof address !== 'string') {
      throw new Error('Address must be a non-empty string');
    }
    
    if (address.length > MAPS_CONFIG.VALIDATION.ADDRESS_MAX_LENGTH) {
      throw new Error(`Address exceeds maximum length of ${MAPS_CONFIG.VALIDATION.ADDRESS_MAX_LENGTH} characters`);
    }
    
    const params = {
      address: address.trim(),
      language: options.language || MAPS_CONFIG.GEOCODING.LANGUAGE,
      region: options.region || MAPS_CONFIG.GEOCODING.REGION,
      ...options
    };
    
    const url = buildApiUrl('geocode', params);
    
    const response = await axios.get(url, {
      timeout: MAPS_CONFIG.FALLBACK.TIMEOUT_MS
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      const location = result.geometry.location;
      
      return {
        success: true,
        coordinates: {
          lat: location.lat,
          lng: location.lng
        },
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components,
        placeId: result.place_id,
        locationType: result.geometry.location_type,
        viewport: result.geometry.viewport,
        types: result.types
      };
    } else {
      const errorMessage = getGeocodingErrorMessage(response.data.status);
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    console.error('Geocoding error:', error);
    
    if (MAPS_CONFIG.FALLBACK.ENABLE_FALLBACK) {
      console.log('Using fallback coordinates for geocoding failure');
      return {
        success: false,
        error: error.message,
        fallback: true,
        coordinates: MAPS_CONFIG.FALLBACK.DEFAULT_COORDINATES,
        formattedAddress: 'Location unavailable (using fallback)'
      };
    }
    
    throw new Error(`Geocoding failed: ${error.message}`);
  }
};

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} options - Reverse geocoding options
 * @returns {Promise<Object>} Reverse geocoding result
 */
const reverseGeocode = async (lat, lng, options = {}) => {
  try {
    // Validate coordinates first
    const validation = validateCoordinates(lat, lng);
    if (!validation.isValid) {
      throw new Error(`Invalid coordinates: ${validation.errors.join(', ')}`);
    }
    
    const params = {
      latlng: `${lat},${lng}`,
      language: options.language || MAPS_CONFIG.GEOCODING.LANGUAGE,
      result_type: options.resultType || MAPS_CONFIG.GEOCODING.RESULT_TYPE,
      location_type: options.locationType || MAPS_CONFIG.GEOCODING.LOCATION_TYPE,
      ...options
    };
    
    const url = buildApiUrl('geocode', params);
    
    const response = await axios.get(url, {
      timeout: MAPS_CONFIG.FALLBACK.TIMEOUT_MS
    });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      
      return {
        success: true,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components,
        placeId: result.place_id,
        types: result.types,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        }
      };
    } else {
      const errorMessage = getGeocodingErrorMessage(response.data.status);
      throw new Error(errorMessage);
    }
    
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    
    if (MAPS_CONFIG.FALLBACK.ENABLE_FALLBACK) {
      console.log('Using fallback address for reverse geocoding failure');
      return {
        success: false,
        error: error.message,
        fallback: true,
        formattedAddress: `Coordinates: ${lat}, ${lng}`,
        coordinates: { lat, lng }
      };
    }
    
    throw new Error(`Reverse geocoding failed: ${error.message}`);
  }
};

/**
 * Find nearby incidents within proximity threshold
 * @param {Object} coordinates - Center coordinates {lat, lng}
 * @param {Array} incidents - Array of incidents with geoLocation
 * @param {number} radiusMeters - Search radius in meters
 * @returns {Array} Nearby incidents with distances
 */
const findNearbyIncidents = (coordinates, incidents, radiusMeters = MAPS_CONFIG.DISTANCE.PROXIMITY_THRESHOLD) => {
  try {
    const validation = validateCoordinates(coordinates.lat, coordinates.lng);
    if (!validation.isValid) {
      throw new Error(`Invalid coordinates: ${validation.errors.join(', ')}`);
    }
    
    if (!Array.isArray(incidents)) {
      throw new Error('Incidents must be an array');
    }
    
    if (radiusMeters > MAPS_CONFIG.DISTANCE.MAX_SEARCH_RADIUS) {
      throw new Error(`Search radius cannot exceed ${MAPS_CONFIG.DISTANCE.MAX_SEARCH_RADIUS} meters`);
    }
    
    const nearbyIncidents = [];
    
    for (const incident of incidents) {
      if (!incident.geoLocation || !incident.geoLocation.coordinates) {
        continue; // Skip incidents without valid coordinates
      }
      
      const incidentCoords = {
        lat: incident.geoLocation.coordinates[1], // GeoJSON format: [lng, lat]
        lng: incident.geoLocation.coordinates[0]
      };
      
      const distance = calculateDistance(coordinates, incidentCoords);
      
      if (distance <= radiusMeters) {
        nearbyIncidents.push({
          ...incident,
          distance: distance,
          distanceFormatted: formatDistance(distance)
        });
      }
    }
    
    // Sort by distance (closest first)
    nearbyIncidents.sort((a, b) => a.distance - b.distance);
    
    return nearbyIncidents;
    
  } catch (error) {
    console.error('Find nearby incidents error:', error);
    throw new Error(`Failed to find nearby incidents: ${error.message}`);
  }
};

/**
 * Check if location is within service area
 * @param {Object} coordinates - Coordinates to check {lat, lng}
 * @param {Array} serviceAreas - Array of service area polygons
 * @returns {boolean} Whether location is within service area
 */
const isWithinServiceArea = (coordinates, serviceAreas = []) => {
  try {
    const validation = validateCoordinates(coordinates.lat, coordinates.lng);
    if (!validation.isValid) {
      return false;
    }
    
    // If no service areas defined, assume global coverage
    if (!serviceAreas || serviceAreas.length === 0) {
      return true;
    }
    
    // Simple point-in-polygon check (can be enhanced with more sophisticated algorithms)
    for (const area of serviceAreas) {
      if (pointInPolygon(coordinates, area.polygon)) {
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('Service area check error:', error);
    return false; // Fail safe - assume not in service area
  }
};

/**
 * Format distance for display
 * @param {number} distanceMeters - Distance in meters
 * @returns {string} Formatted distance string
 */
const formatDistance = (distanceMeters) => {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  } else {
    return `${(distanceMeters / 1000).toFixed(1)}km`;
  }
};

/**
 * Get error message for geocoding status
 * @param {string} status - Google Maps API status
 * @returns {string} Human-readable error message
 */
const getGeocodingErrorMessage = (status) => {
  const errorMessages = {
    'ZERO_RESULTS': 'No results found for the provided address',
    'OVER_QUERY_LIMIT': 'API query limit exceeded',
    'REQUEST_DENIED': 'API request denied - check API key',
    'INVALID_REQUEST': 'Invalid request parameters',
    'UNKNOWN_ERROR': 'Unknown error occurred'
  };
  
  return errorMessages[status] || `Geocoding failed with status: ${status}`;
};

/**
 * Simple point-in-polygon algorithm (ray casting)
 * @param {Object} point - Point coordinates {lat, lng}
 * @param {Array} polygon - Array of polygon vertices [{lat, lng}, ...]
 * @returns {boolean} Whether point is inside polygon
 */
const pointInPolygon = (point, polygon) => {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (((polygon[i].lat > point.lat) !== (polygon[j].lat > point.lat)) &&
        (point.lng < (polygon[j].lng - polygon[i].lng) * (point.lat - polygon[i].lat) / (polygon[j].lat - polygon[i].lat) + polygon[i].lng)) {
      inside = !inside;
    }
  }
  
  return inside;
};

/**
 * Batch geocode multiple addresses
 * @param {Array} addresses - Array of addresses to geocode
 * @param {Object} options - Geocoding options
 * @returns {Promise<Array>} Array of geocoding results
 */
const batchGeocode = async (addresses, options = {}) => {
  try {
    if (!Array.isArray(addresses)) {
      throw new Error('Addresses must be an array');
    }
    
    const results = [];
    const batchSize = options.batchSize || 10;
    const delay = options.delay || 100; // ms between requests
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(address => 
        geocodeAddress(address, options).catch(error => ({
          success: false,
          error: error.message,
          address
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Batch geocoding error:', error);
    throw new Error(`Batch geocoding failed: ${error.message}`);
  }
};

module.exports = {
  calculateDistance,
  validateCoordinates,
  geocodeAddress,
  reverseGeocode,
  findNearbyIncidents,
  isWithinServiceArea,
  formatDistance,
  batchGeocode,
  pointInPolygon
};