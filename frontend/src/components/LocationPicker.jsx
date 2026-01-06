import { useState, useEffect } from 'react';
import GoogleMap from './GoogleMap';

const LocationPicker = ({
  initialLocation = null,
  onLocationSelect,
  height = '400px',
  width = '100%',
  zoom = 15,
  showCurrentLocation = true,
  className = ''
}) => {
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [mapCenter, setMapCenter] = useState(initialLocation || { lat: 40.7128, lng: -74.0060 });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [address, setAddress] = useState('');

  // Get current location on mount if no initial location
  useEffect(() => {
    if (!initialLocation && showCurrentLocation) {
      getCurrentLocation();
    }
  }, [initialLocation, showCurrentLocation]);

  // Update address when location changes
  useEffect(() => {
    if (selectedLocation) {
      reverseGeocode(selectedLocation.latitude, selectedLocation.longitude);
    }
  }, [selectedLocation]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        
        setSelectedLocation(location);
        setMapCenter({ lat: location.latitude, lng: location.longitude });
        setIsGettingLocation(false);
        
        if (onLocationSelect) {
          onLocationSelect(location);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationError(getGeolocationErrorMessage(error));
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const getGeolocationErrorMessage = (error) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location permissions.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information unavailable.';
      case error.TIMEOUT:
        return 'Location request timed out.';
      default:
        return 'An unknown error occurred while getting location.';
    }
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Mock reverse geocoding - in production, use Google Maps Geocoding API
      const mockAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      setAddress(mockAddress);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setAddress('Address lookup failed');
    }
  };

  const handleMapClick = (location) => {
    setSelectedLocation(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleClearLocation = () => {
    setSelectedLocation(null);
    setAddress('');
    if (onLocationSelect) {
      onLocationSelect(null);
    }
  };

  const handleUseCurrentLocation = () => {
    getCurrentLocation();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUseCurrentLocation}
            disabled={isGettingLocation}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            {isGettingLocation ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Getting location...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Use Current Location</span>
              </>
            )}
          </button>
          
          {selectedLocation && (
            <button
              onClick={handleClearLocation}
              className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Clear</span>
            </button>
          )}
        </div>

        {selectedLocation && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Selected:</span> {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </div>
        )}
      </div>

      {/* Error Message */}
      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Location Error</p>
              <p className="text-sm text-red-700">{locationError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-900">How to select location</p>
            <p className="text-sm text-blue-700">
              Click anywhere on the map to select a location, or use the "Use Current Location" button to automatically detect your position.
            </p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <GoogleMap
          center={mapCenter}
          zoom={zoom}
          height={height}
          width={width}
          onMapClick={handleMapClick}
          selectedLocation={selectedLocation}
          enableLocationPicker={true}
          onLocationSelect={handleMapClick}
          showUserLocation={showCurrentLocation}
          className="border border-gray-300 rounded-lg"
        />
        
        {/* Crosshair overlay for better UX */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="text-gray-400 opacity-50">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 2v20M2 12h20" />
            </svg>
          </div>
        </div>
      </div>

      {/* Selected Location Info */}
      {selectedLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Location Selected</p>
              <div className="mt-1 space-y-1">
                <p className="text-sm text-green-700">
                  <span className="font-medium">Coordinates:</span> {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
                {address && (
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Address:</span> {address}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accuracy Note */}
      <div className="text-xs text-gray-500 text-center">
        <p>
          Location accuracy may vary based on your device and GPS signal strength. 
          For best results, ensure location services are enabled.
        </p>
      </div>
    </div>
  );
};

export default LocationPicker;