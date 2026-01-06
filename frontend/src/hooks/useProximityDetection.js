import { useState, useCallback } from 'react';
import { incidentAPI } from '../services/api';

/**
 * Custom hook for proximity detection functionality
 * @param {Object} options - Configuration options
 * @returns {Object} - Proximity detection state and functions
 */
export const useProximityDetection = (options = {}) => {
  const {
    radius = 500, // Default radius in meters
    onNearbyIncidentsFound = null,
    onError = null,
    autoCheck = true
  } = options;

  const [state, setState] = useState({
    isChecking: false,
    nearbyIncidents: [],
    lastCheckedLocation: null,
    error: null
  });

  const checkProximity = useCallback(async (location) => {
    if (!location || (!location.latitude || !location.longitude)) {
      console.warn('Invalid location provided for proximity check');
      return { success: false, error: 'Invalid location' };
    }

    setState(prev => ({
      ...prev,
      isChecking: true,
      error: null
    }));

    try {
      const result = await incidentAPI.checkProximity({
        latitude: location.latitude,
        longitude: location.longitude,
        radius
      });

      if (result.success) {
        const nearbyIncidents = result.data.nearbyIncidents || [];
        
        setState(prev => ({
          ...prev,
          isChecking: false,
          nearbyIncidents,
          lastCheckedLocation: location,
          error: null
        }));

        // Call callback if provided
        if (onNearbyIncidentsFound && nearbyIncidents.length > 0) {
          onNearbyIncidentsFound(nearbyIncidents);
        }

        return {
          success: true,
          nearbyIncidents,
          hasNearbyIncidents: nearbyIncidents.length > 0
        };
      } else {
        const error = result.error || 'Failed to check for nearby incidents';
        setState(prev => ({
          ...prev,
          isChecking: false,
          error
        }));

        if (onError) {
          onError(error);
        }

        return { success: false, error };
      }
    } catch (error) {
      const errorMessage = error.message || 'Network error during proximity check';
      
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: errorMessage
      }));

      if (onError) {
        onError(errorMessage);
      }

      return { success: false, error: errorMessage };
    }
  }, [radius, onNearbyIncidentsFound, onError]);

  const clearNearbyIncidents = useCallback(() => {
    setState(prev => ({
      ...prev,
      nearbyIncidents: [],
      error: null
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isChecking: false,
      nearbyIncidents: [],
      lastCheckedLocation: null,
      error: null
    });
  }, []);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
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
  }, []);

  // Filter incidents by distance
  const filterByDistance = useCallback((incidents, centerLocation, maxDistance = radius) => {
    if (!centerLocation || !incidents) return [];

    return incidents.filter(incident => {
      if (!incident.location?.coordinates) return false;
      
      const [lon, lat] = incident.location.coordinates;
      const distance = calculateDistance(
        centerLocation.latitude,
        centerLocation.longitude,
        lat,
        lon
      );
      
      return distance <= maxDistance;
    }).map(incident => ({
      ...incident,
      distance: calculateDistance(
        centerLocation.latitude,
        centerLocation.longitude,
        incident.location.coordinates[1],
        incident.location.coordinates[0]
      )
    })).sort((a, b) => a.distance - b.distance); // Sort by distance
  }, [radius, calculateDistance]);

  // Check if location has changed significantly
  const hasLocationChanged = useCallback((newLocation, threshold = 100) => {
    if (!state.lastCheckedLocation || !newLocation) return true;
    
    const distance = calculateDistance(
      state.lastCheckedLocation.latitude,
      state.lastCheckedLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );
    
    return distance > threshold;
  }, [state.lastCheckedLocation, calculateDistance]);

  // Smart proximity check that only checks if location changed significantly
  const smartProximityCheck = useCallback(async (location) => {
    if (!autoCheck) {
      return checkProximity(location);
    }

    if (!hasLocationChanged(location)) {
      return {
        success: true,
        nearbyIncidents: state.nearbyIncidents,
        hasNearbyIncidents: state.nearbyIncidents.length > 0,
        cached: true
      };
    }

    return checkProximity(location);
  }, [autoCheck, checkProximity, hasLocationChanged, state.nearbyIncidents]);

  return {
    // State
    ...state,
    hasNearbyIncidents: state.nearbyIncidents.length > 0,
    
    // Actions
    checkProximity,
    smartProximityCheck,
    clearNearbyIncidents,
    reset,
    
    // Utilities
    calculateDistance,
    filterByDistance,
    hasLocationChanged
  };
};

export default useProximityDetection;