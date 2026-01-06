import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getIncidentTypeIcon, 
  getPriorityColor, 
  formatDistance, 
  formatTimeAgo 
} from '../utils/incidentUtils';

const ProximityDetectionModal = ({ 
  isOpen, 
  onClose, 
  nearbyIncidents = [], 
  currentLocation,
  onContinueWithNew,
  onSelectExisting 
}) => {
  const navigate = useNavigate();
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen || nearbyIncidents.length === 0) return null;

  const handleViewDetails = (incident) => {
    setSelectedIncident(incident);
    setShowDetails(true);
  };

  const handleUpvoteExisting = (incident) => {
    if (onSelectExisting) {
      onSelectExisting(incident);
    } else {
      navigate(`/incident/${incident.id}?action=upvote`);
    }
  };

  const handleContinueNew = () => {
    if (onContinueWithNew) {
      onContinueWithNew();
    }
    onClose();
  };

  const renderIncidentCard = (incident, index) => (
    <div key={incident.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getIncidentTypeIcon(incident.type)}</span>
          <div>
            <h4 className="font-medium text-gray-900 capitalize">{incident.type} Emergency</h4>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${getPriorityColor(incident.priority)}-100 text-${getPriorityColor(incident.priority)}-800 capitalize`}>
                {incident.priority}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistance(incident.distance)} away
              </span>
              <span className="text-xs text-gray-500">
                {formatTimeAgo(incident.createdAt)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          </svg>
          <span className="text-sm text-gray-600">{incident.upvotes || 0}</span>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3 line-clamp-2">
        {incident.description}
      </p>

      <div className="flex items-center justify-between">
        <button
          onClick={() => handleViewDetails(incident)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View Details
        </button>
        <div className="flex space-x-2">
          <button
            onClick={() => handleUpvoteExisting(incident)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1 rounded transition-colors"
          >
            This is the same incident
          </button>
        </div>
      </div>
    </div>
  );

  if (showDetails && selectedIncident) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Incident Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Incident Info */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getIncidentTypeIcon(selectedIncident.type)}</span>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 capitalize">
                    {selectedIncident.type} Emergency
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium bg-${getPriorityColor(selectedIncident.priority)}-100 text-${getPriorityColor(selectedIncident.priority)}-800 capitalize`}>
                      {selectedIncident.priority} Priority
                    </span>
                    <span className="text-sm text-gray-500">
                      {formatDistance(selectedIncident.distance)} from your location
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                <p className="text-gray-700">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Reported</h5>
                  <p className="text-sm text-gray-600">{formatTimeAgo(selectedIncident.createdAt)}</p>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Status</h5>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedIncident.status === 'active' ? 'bg-green-100 text-green-800' :
                    selectedIncident.status === 'responding' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  } capitalize`}>
                    {selectedIncident.status || 'Active'}
                  </span>
                </div>
              </div>

              {selectedIncident.location?.address && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-1">Location</h5>
                  <p className="text-sm text-gray-600">{selectedIncident.location.address}</p>
                </div>
              )}

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <span className="text-sm text-gray-600">{selectedIncident.upvotes || 0} confirmations</span>
                </div>
                {selectedIncident.responders && (
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm text-gray-600">{selectedIncident.responders} responders assigned</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => handleUpvoteExisting(selectedIncident)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                This is the same incident
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Back to List
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Similar Incidents Detected</h3>
              <p className="text-gray-600 mt-1">
                We found {nearbyIncidents.length} similar incident{nearbyIncidents.length > 1 ? 's' : ''} in your area
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900">Help us avoid duplicate reports</p>
                <p className="text-sm text-blue-700 mt-1">
                  If you see an incident that matches what you're reporting, please confirm it instead of creating a new report. 
                  This helps emergency responders coordinate more effectively.
                </p>
              </div>
            </div>
          </div>

          {/* Nearby Incidents List */}
          <div className="space-y-4 mb-6">
            <h4 className="font-medium text-gray-900">Nearby Incidents:</h4>
            <div className="grid gap-4">
              {nearbyIncidents.map((incident, index) => renderIncidentCard(incident, index))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleContinueNew}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              None of these match - Continue with new report
            </button>
            <button
              onClick={onClose}
              className="sm:w-auto bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Not sure? You can always create a new report. Emergency responders will handle any duplicates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProximityDetectionModal;