import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { incidentAPI, guestAPI } from '../services/api';
import { useApi } from '../hooks/useApi';
import { 
  getIncidentTypeIcon, 
  getPriorityColor, 
  formatTimeAgo 
} from '../utils/incidentUtils';

const IncidentUpvote = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const shouldAutoUpvote = searchParams.get('action') === 'upvote';

  const [incident, setIncident] = useState(null);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [guestId, setGuestId] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);

  // API hooks
  const { execute: getIncident, isLoading } = useApi(incidentAPI.getById);
  const { execute: upvoteIncident } = useApi(incidentAPI.upvote);
  const { execute: createGuest } = useApi(guestAPI.create);

  useEffect(() => {
    if (id) {
      loadIncident();
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      initializeGuestSession();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (shouldAutoUpvote && incident && !hasUpvoted) {
      handleUpvote();
    }
  }, [shouldAutoUpvote, incident, hasUpvoted]);

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

  const loadIncident = async () => {
    try {
      const result = await getIncident(id);
      if (result.success) {
        setIncident(result.data);
        // Check if user has already upvoted
        const currentUserId = isAuthenticated ? user?.id : guestId;
        setHasUpvoted(result.data.upvotedBy?.includes(currentUserId) || false);
      } else {
        console.error('Failed to load incident:', result.error);
        navigate('/');
      }
    } catch (error) {
      console.error('Error loading incident:', error);
      navigate('/');
    }
  };

  const handleUpvote = async () => {
    if (hasUpvoted || isUpvoting) return;

    setIsUpvoting(true);
    try {
      const upvoteData = {
        userId: isAuthenticated ? user.id : guestId,
        userType: isAuthenticated ? 'user' : 'guest',
        additionalInfo: additionalInfo.trim() || null
      };

      const result = await upvoteIncident(id, upvoteData);
      
      if (result.success) {
        setHasUpvoted(true);
        setIncident(prev => ({
          ...prev,
          upvotes: (prev.upvotes || 0) + 1
        }));
        
        // Show success and redirect after delay
        setTimeout(() => {
          navigate('/incident-confirmation/upvote', {
            state: { 
              incident: { ...incident, upvotes: (incident.upvotes || 0) + 1 },
              action: 'upvote'
            }
          });
        }, 1500);
      } else {
        console.error('Failed to upvote incident:', result.error);
      }
    } catch (error) {
      console.error('Error upvoting incident:', error);
    } finally {
      setIsUpvoting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading incident details...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Incident not found</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Confirm Incident</h1>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600">
            Help us confirm this incident by adding your verification
          </p>
        </div>

        {/* Incident Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start space-x-4 mb-4">
            <span className="text-4xl">{getIncidentTypeIcon(incident.type)}</span>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 capitalize mb-2">
                {incident.type} Emergency
              </h2>
              <div className="flex items-center space-x-3 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${getPriorityColor(incident.priority)}-100 text-${getPriorityColor(incident.priority)}-800 capitalize`}>
                  {incident.priority} Priority
                </span>
                <span className="text-sm text-gray-500">
                  Reported {formatTimeAgo(incident.createdAt)}
                </span>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <span className="text-sm text-gray-600">{incident.upvotes || 0} confirmations</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700">{incident.description}</p>
          </div>

          {incident.location?.address && (
            <div className="flex items-start space-x-2 mb-4">
              <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                <h3 className="font-medium text-gray-900">Location</h3>
                <p className="text-sm text-gray-600">{incident.location.address}</p>
              </div>
            </div>
          )}

          {incident.status && (
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                incident.status === 'active' ? 'bg-green-100 text-green-800' :
                incident.status === 'responding' ? 'bg-blue-100 text-blue-800' :
                incident.status === 'resolved' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              } capitalize`}>
                {incident.status}
              </span>
            </div>
          )}
        </div>

        {/* Additional Information */}
        {!hasUpvoted && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Additional Information</h3>
              <button
                onClick={() => setShowAdditionalInfo(!showAdditionalInfo)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                {showAdditionalInfo ? 'Hide' : 'Add Details'}
              </button>
            </div>

            {showAdditionalInfo && (
              <div>
                <p className="text-gray-600 mb-3">
                  Do you have additional information about this incident that could help responders?
                </p>
                <textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Optional: Add any additional details you observed..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  This information will be shared with emergency responders
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {hasUpvoted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank you for confirming!</h3>
              <p className="text-gray-600 mb-4">
                Your confirmation helps emergency responders prioritize their response.
              </p>
              <button
                onClick={() => navigate('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Return Home
              </button>
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Is this the same incident you wanted to report?
                </h3>
                <p className="text-gray-600">
                  By confirming, you help emergency responders understand the severity and scope of the situation.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleUpvote}
                  disabled={isUpvoting}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  {isUpvoting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Yes, confirm this incident</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => navigate('/report-incident')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  No, report a different incident
                </button>
              </div>

              <p className="text-sm text-gray-500 text-center mt-4">
                Your confirmation is anonymous and helps improve emergency response coordination.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentUpvote;