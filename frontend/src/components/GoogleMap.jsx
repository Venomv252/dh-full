import { useEffect, useRef, useState, useCallback } from 'react';

const GoogleMap = ({
  center = { lat: 40.7128, lng: -74.0060 }, // Default to NYC
  zoom = 13,
  height = '400px',
  width = '100%',
  markers = [],
  onMapClick = null,
  onMarkerClick = null,
  showUserLocation = true,
  enableLocationPicker = false,
  selectedLocation = null,
  onLocationSelect = null,
  mapOptions = {},
  className = ''
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userLocationMarkerRef = useRef(null);
  const selectedLocationMarkerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps) {
      setIsLoaded(true);
      return;
    }

    // For development, we'll use a mock implementation
    // In production, you would load the actual Google Maps API
    const mockGoogleMaps = () => {
      window.google = {
        maps: {
          Map: class MockMap {
            constructor(element, options) {
              this.element = element;
              this.options = options;
              this.listeners = {};
              
              // Create a simple visual representation
              element.innerHTML = `
                <div style="
                  width: 100%; 
                  height: 100%; 
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  color: white;
                  font-family: Arial, sans-serif;
                  position: relative;
                  overflow: hidden;
                ">
                  <div style="text-align: center; z-index: 2;">
                    <div style="font-size: 24px; margin-bottom: 8px;">🗺️</div>
                    <div style="font-size: 14px; opacity: 0.9;">Interactive Map</div>
                    <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
                      ${options.center ? `${options.center.lat.toFixed(4)}, ${options.center.lng.toFixed(4)}` : 'Loading...'}
                    </div>
                  </div>
                  <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grid\" width=\"10\" height=\"10\" patternUnits=\"userSpaceOnUse\"><path d=\"M 10 0 L 0 0 0 10\" fill=\"none\" stroke=\"white\" stroke-width=\"0.5\" opacity=\"0.1\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grid)\"/></svg>');
                    opacity: 0.3;
                  "></div>
                </div>
              `;
              
              // Add click handler
              element.addEventListener('click', (e) => {
                if (this.listeners.click) {
                  const rect = element.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  // Mock lat/lng calculation
                  const lat = options.center.lat + (0.5 - y / rect.height) * 0.01;
                  const lng = options.center.lng + (x / rect.width - 0.5) * 0.01;
                  
                  this.listeners.click.forEach(callback => {
                    callback({
                      latLng: {
                        lat: () => lat,
                        lng: () => lng
                      }
                    });
                  });
                }
              });
            }
            
            addListener(event, callback) {
              if (!this.listeners[event]) {
                this.listeners[event] = [];
              }
              this.listeners[event].push(callback);
            }
            
            setCenter(center) {
              this.options.center = center;
              // Update display
              const coordsDiv = this.element.querySelector('div div:last-child');
              if (coordsDiv) {
                coordsDiv.textContent = `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`;
              }
            }
            
            setZoom(zoom) {
              this.options.zoom = zoom;
            }
            
            panTo(center) {
              this.setCenter(center);
            }
          },
          
          Marker: class MockMarker {
            constructor(options) {
              this.options = options;
              this.listeners = {};
              this.visible = true;
              
              if (options.map) {
                this.addToMap(options.map);
              }
            }
            
            addToMap(map) {
              // In a real implementation, this would add the marker to the map
              console.log('Mock marker added to map', this.options);
            }
            
            setMap(map) {
              this.options.map = map;
              if (map) {
                this.addToMap(map);
              }
            }
            
            setPosition(position) {
              this.options.position = position;
            }
            
            setVisible(visible) {
              this.visible = visible;
            }
            
            addListener(event, callback) {
              if (!this.listeners[event]) {
                this.listeners[event] = [];
              }
              this.listeners[event].push(callback);
            }
          },
          
          InfoWindow: class MockInfoWindow {
            constructor(options = {}) {
              this.options = options;
              this.isOpen = false;
            }
            
            open(map, marker) {
              this.isOpen = true;
              console.log('Mock InfoWindow opened', this.options);
            }
            
            close() {
              this.isOpen = false;
            }
            
            setContent(content) {
              this.options.content = content;
            }
          },
          
          event: {
            addListener: (instance, event, callback) => {
              if (instance.addListener) {
                instance.addListener(event, callback);
              }
            }
          }
        }
      };
      
      setIsLoaded(true);
    };

    // Simulate loading delay
    setTimeout(mockGoogleMaps, 500);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    try {
      const mapOptions = {
        center,
        zoom,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        ...mapOptions
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);

      // Add click listener for location picker
      if (enableLocationPicker && onLocationSelect) {
        window.google.maps.event.addListener(mapInstanceRef.current, 'click', (event) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onLocationSelect({ latitude: lat, longitude: lng });
        });
      }

      // Add general click listener
      if (onMapClick) {
        window.google.maps.event.addListener(mapInstanceRef.current, 'click', (event) => {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          onMapClick({ latitude: lat, longitude: lng });
        });
      }

    } catch (err) {
      console.error('Error initializing Google Maps:', err);
      setError('Failed to initialize map');
    }
  }, [isLoaded, center, zoom, enableLocationPicker, onLocationSelect, onMapClick]);

  // Update map center when center prop changes
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.setCenter(center);
    }
  }, [center]);

  // Handle markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData, index) => {
      const marker = new window.google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: mapInstanceRef.current,
        title: markerData.title || `Marker ${index + 1}`,
        icon: markerData.icon || null
      });

      // Add click listener
      if (onMarkerClick) {
        window.google.maps.event.addListener(marker, 'click', () => {
          onMarkerClick(markerData, index);
        });
      }

      // Add info window if content provided
      if (markerData.infoContent) {
        const infoWindow = new window.google.maps.InfoWindow({
          content: markerData.infoContent
        });

        window.google.maps.event.addListener(marker, 'click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers, isLoaded, onMarkerClick]);

  // Handle user location
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded || !showUserLocation) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Remove existing user location marker
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setMap(null);
          }

          // Add user location marker
          userLocationMarkerRef.current = new window.google.maps.Marker({
            position: userLocation,
            map: mapInstanceRef.current,
            title: 'Your Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="white" stroke-width="2"/>
                  <circle cx="12" cy="12" r="3" fill="white"/>
                </svg>
              `),
              scaledSize: new window.google.maps.Size(24, 24)
            }
          });
        },
        (error) => {
          console.warn('Error getting user location:', error);
        }
      );
    }
  }, [isLoaded, showUserLocation]);

  // Handle selected location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Remove existing selected location marker
    if (selectedLocationMarkerRef.current) {
      selectedLocationMarkerRef.current.setMap(null);
      selectedLocationMarkerRef.current = null;
    }

    // Add selected location marker
    if (selectedLocation) {
      selectedLocationMarkerRef.current = new window.google.maps.Marker({
        position: { lat: selectedLocation.latitude, lng: selectedLocation.longitude },
        map: mapInstanceRef.current,
        title: 'Selected Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32),
          anchor: new window.google.maps.Point(16, 32)
        }
      });

      // Center map on selected location
      mapInstanceRef.current.panTo({ lat: selectedLocation.latitude, lng: selectedLocation.longitude });
    }
  }, [selectedLocation, isLoaded]);

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg ${className}`}
        style={{ height, width }}
      >
        <div className="text-center text-gray-600">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-50 border border-gray-200 rounded-lg ${className}`}
        style={{ height, width }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ height, width }}
    />
  );
};

export default GoogleMap;