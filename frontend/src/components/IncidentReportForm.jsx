import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { incidentAPI, guestAPI } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useProximityDetection } from '../hooks/useProximityDetection';
import ProximityDetectionModal from './ProximityDetectionModal';
import LocationPicker from './LocationPicker';
import { validateIncidentForm, prepareIncidentData } from '../utils/incidentUtils';

const IncidentReportForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const isGuestMode = searchParams.get('mode') === 'guest';
  
  // Form state
  const [formData, setFormData] = useState({
    type: '',
    description: '',
    priority: 'medium',
    location: {
      latitude: null,
      longitude: null,
      address: '',
      manualAddress: ''
    },
    media: [],
    contactInfo: {
      phone: '',
      email: '',
      name: ''
    }
  });

  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, loading, success, error
  const [mediaUploading, setMediaUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [guestId, setGuestId] = useState(null);

  // Refs
  const fileInputRef = useRef(null);

  // API hooks
  const { execute: createIncident } = useApi(incidentAPI.create);
  const { execute: createGuest } = useApi(guestAPI.create);

  // Proximity detection
  const {
    nearbyIncidents,
    hasNearbyIncidents,
    isChecking: isCheckingProximity,
    smartProximityCheck,
    clearNearbyIncidents
  } = useProximityDetection({
    radius: 500,
    onNearbyIncidentsFound: (incidents) => {
      console.log('Nearby incidents found:', incidents);
    },
    onError: (error) => {
      console.error('Proximity check error:', error);
    }
  });

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showProximityModal, setShowProximityModal] = useState(false);

  // Incident types
  const incidentTypes = [
    { value: 'medical', label: 'Medical Emergency', icon: '🏥', color: 'red' },
    { value: 'fire', label: 'Fire', icon: '🔥', color: 'orange' },
    { value: 'accident', label: 'Traffic Accident', icon: '🚗', color: 'yellow' },
    { value: 'crime', label: 'Crime in Progress', icon: '🚨', color: 'red' },
    { value: 'natural', label: 'Natural Disaster', icon: '🌪️', color: 'purple' },
    { value: 'utility', label: 'Utility Emergency', icon: '⚡', color: 'blue' },
    { value: 'other', label: 'Other Emergency', icon: '⚠️', color: 'gray' }
  ];

  // Priority levels
  const priorityLevels = [
    { value: 'low', label: 'Low Priority', color: 'green', description: 'Non-urgent situation' },
    { value: 'medium', label: 'Medium Priority', color: 'yellow', description: 'Requires attention' },
    { value: 'high', label: 'High Priority', color: 'orange', description: 'Urgent situation' },
    { value: 'critical', label: 'Critical', color: 'red', description: 'Life-threatening emergency' }
  ];
  // Initialize guest session if needed
  useEffect(() => {
    if (isGuestMode && !isAuthenticated) {
      initializeGuestSession();
    }
  }, [isGuestMode, isAuthenticated]);

  // Get user location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const initializeGuestSession = async () => {
    try {
      const result = await createGuest({
        ipAddress: await getClientIP(),
        userAgent: navigator.userAgent
      });
      
      if (result.success) {
        setGuestId(result.data.guestId);
      }
    } catch (error) {
      console.error('Failed to create guest session:', error);
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setErrors(prev => ({ ...prev, location: 'Geolocation is not supported by this browser' }));
      return;
    }

    setLocationStatus('loading');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get address
          const address = await reverseGeocode(latitude, longitude);
          
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              latitude,
              longitude,
              address
            }
          }));
          
          setLocationStatus('success');
          
          // Check for nearby incidents
          await performProximityCheck(latitude, longitude);
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          setFormData(prev => ({
            ...prev,
            location: {
              ...prev.location,
              latitude,
              longitude,
              address: 'Address lookup failed'
            }
          }));
          setLocationStatus('success');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('error');
        setErrors(prev => ({ 
          ...prev, 
          location: 'Unable to get your location. Please enter address manually.' 
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const reverseGeocode = async (latitude, longitude) => {
    // Mock reverse geocoding - in production, use Google Maps Geocoding API
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  };

  const performProximityCheck = async (latitude, longitude) => {
    try {
      const result = await smartProximityCheck({
        latitude,
        longitude
      });
      
      if (result.success && result.hasNearbyIncidents) {
        setShowProximityModal(true);
      }
    } catch (error) {
      console.error('Proximity check failed:', error);
    }
  };
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleLocationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
    
    if (errors.location) {
      setErrors(prev => ({ ...prev, location: null }));
    }
  };

  const handleContactChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setErrors(prev => ({ 
        ...prev, 
        media: 'Some files were rejected. Only images and videos under 50MB are allowed.' 
      }));
    }

    setFormData(prev => ({
      ...prev,
      media: [...prev.media, ...validFiles]
    }));
  };

  const removeMedia = (index) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = validateIncidentForm(formData, isGuestMode || !isAuthenticated);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare incident data using utility function
      const incidentData = prepareIncidentData(formData, user, guestId);

      // Upload media files if any
      if (formData.media.length > 0) {
        setMediaUploading(true);
        // Mock media upload - in production, integrate with Cloudinary
        await uploadMediaFiles(formData.media);
      }

      // Create incident
      const result = await createIncident(incidentData);
      
      if (result.success) {
        // Success - redirect to confirmation page
        navigate(`/incident-confirmation/${result.data.id}`, {
          state: { incident: result.data }
        });
      } else {
        setErrors({ submit: result.error || 'Failed to submit incident report' });
      }
    } catch (error) {
      console.error('Incident submission error:', error);
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
      setMediaUploading(false);
    }
  };

  const uploadMediaFiles = async (files) => {
    // Mock upload with progress tracking
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(prev => ({ ...prev, [i]: 0 }));
      
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(prev => ({ ...prev, [i]: progress }));
      }
    }
  };

  const handleProximityChoice = (choice, selectedIncident = null) => {
    if (choice === 'same' && selectedIncident) {
      // Redirect to existing incident for upvoting
      navigate(`/incident/${selectedIncident.id}?action=upvote`);
    } else {
      // Continue with new incident
      setShowProximityModal(false);
      clearNearbyIncidents();
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Report an Incident</h1>
              <p className="text-gray-600 mt-2">
                {isGuestMode ? 'Reporting as guest' : 'Reporting as registered user'}
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Incident Type */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Incident Type</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incidentTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleInputChange('type', type.value)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    formData.type === type.value
                      ? `border-${type.color}-500 bg-${type.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <h3 className="font-medium text-gray-900">{type.label}</h3>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {errors.type && (
              <p className="text-red-600 text-sm mt-2">{errors.type}</p>
            )}
          </div>

          {/* Priority Level */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Priority Level</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {priorityLevels.map((priority) => (
                <button
                  key={priority.value}
                  type="button"
                  onClick={() => handleInputChange('priority', priority.value)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    formData.priority === priority.value
                      ? `border-${priority.color}-500 bg-${priority.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-gray-900">{priority.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{priority.description}</p>
                </button>
              ))}
            </div>
          </div>
          {/* Description */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Please provide a detailed description of the incident..."
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">
                {formData.description.length}/1000 characters
              </span>
              {errors.description && (
                <p className="text-red-600 text-sm">{errors.description}</p>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Location</h2>
            
            {/* GPS Location Status */}
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                {locationStatus === 'loading' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Getting your location...</span>
                  </>
                )}
                {locationStatus === 'success' && (
                  <>
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-600">Location detected</span>
                  </>
                )}
                {locationStatus === 'error' && (
                  <>
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-red-600">Location unavailable</span>
                  </>
                )}
              </div>
            </div>

            {/* Current Location Display */}
            {formData.location.address && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Current Location</p>
                    <p className="text-sm text-blue-700">{formData.location.address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Location Options */}
            <div className="space-y-4">
              {/* Manual Address Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manual Address (if GPS is unavailable or incorrect)
                </label>
                <input
                  type="text"
                  value={formData.location.manualAddress}
                  onChange={(e) => handleLocationChange('manualAddress', e.target.value)}
                  placeholder="Enter address manually..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Map Location Picker Button */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Or select location on map for precise coordinates
                </span>
                <button
                  type="button"
                  onClick={() => setShowLocationPicker(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span>Select on Map</span>
                  </div>
                </button>
              </div>

              {/* Selected Coordinates Display */}
              {formData.location.latitude && formData.location.longitude && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-green-900">Precise coordinates selected</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>

            {errors.location && (
              <p className="text-red-600 text-sm mt-2">{errors.location}</p>
            )}
          </div>
          {/* Media Upload */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Media (Optional)</h2>
            <p className="text-gray-600 mb-4">
              Upload photos or videos to help responders understand the situation better.
            </p>

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            >
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600">Click to upload photos or videos</p>
              <p className="text-sm text-gray-500 mt-2">Max 50MB per file</p>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Media Preview */}
            {formData.media.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {formData.media.map((file, index) => (
                  <div key={index} className="relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Progress */}
                    {uploadProgress[index] !== undefined && uploadProgress[index] < 100 && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="text-white text-sm">
                          {uploadProgress[index]}%
                        </div>
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeMedia(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {errors.media && (
              <p className="text-red-600 text-sm mt-2">{errors.media}</p>
            )}
          </div>
          {/* Contact Information (for guests) */}
          {(isGuestMode || !isAuthenticated) && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <p className="text-gray-600 mb-4">
                We need your contact information to follow up on this incident.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.contactInfo.name}
                    onChange={(e) => handleContactChange('name', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.contactName && (
                    <p className="text-red-600 text-sm mt-1">{errors.contactName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactInfo.phone}
                    onChange={(e) => handleContactChange('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.contactPhone && (
                    <p className="text-red-600 text-sm mt-1">{errors.contactPhone}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.contactInfo.email}
                    onChange={(e) => handleContactChange('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-800">{errors.submit}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || mediaUploading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isSubmitting || mediaUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>
                    {mediaUploading ? 'Uploading media...' : 'Submitting report...'}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Submit Incident Report</span>
                </>
              )}
            </button>

            <p className="text-sm text-gray-500 text-center mt-4">
              By submitting this report, you confirm that the information provided is accurate to the best of your knowledge.
            </p>
          </div>
        </form>
      </div>
      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Select Location on Map</h3>
                <button
                  onClick={() => setShowLocationPicker(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <LocationPicker
                initialLocation={formData.location.latitude && formData.location.longitude ? {
                  latitude: formData.location.latitude,
                  longitude: formData.location.longitude
                } : null}
                onLocationSelect={(location) => {
                  if (location) {
                    setFormData(prev => ({
                      ...prev,
                      location: {
                        ...prev.location,
                        latitude: location.latitude,
                        longitude: location.longitude
                      }
                    }));
                    // Trigger proximity check
                    performProximityCheck(location.latitude, location.longitude);
                  }
                }}
                height="500px"
              />
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowLocationPicker(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proximity Detection Modal */}
      <ProximityDetectionModal
        isOpen={showProximityModal}
        onClose={() => setShowProximityModal(false)}
        nearbyIncidents={nearbyIncidents}
        currentLocation={formData.location}
        onContinueWithNew={() => handleProximityChoice('different')}
        onSelectExisting={(incident) => handleProximityChoice('same', incident)}
      />
    </div>
  );
};

export default IncidentReportForm;