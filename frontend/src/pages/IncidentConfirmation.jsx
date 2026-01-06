import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  getIncidentTypeIcon, 
  getPriorityColor 
} from '../utils/incidentUtils';

const IncidentConfirmation = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [incident] = useState(location.state?.incident || null);

  useEffect(() => {
    // If no incident data is passed, redirect back to home
    if (!incident) {
      navigate('/');
    }
  }, [incident, navigate]);

  if (!incident) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Success Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Submitted Successfully</h1>
          <p className="text-gray-600">
            Your incident report has been received and emergency responders have been notified.
          </p>
        </div>

        {/* Incident Details */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Incident Details</h2>
          
          <div className="space-y-4">
            {/* Incident ID */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Incident ID:</span>
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{id}</span>
            </div>

            {/* Type */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Type:</span>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getIncidentTypeIcon(incident.type)}</span>
                <span className="capitalize">{incident.type}</span>
              </div>
            </div>

            {/* Priority */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Priority:</span>
              <span className={`px-2 py-1 rounded-full text-sm font-medium bg-${getPriorityColor(incident.priority)}-100 text-${getPriorityColor(incident.priority)}-800 capitalize`}>
                {incident.priority}
              </span>
            </div>

            {/* Location */}
            <div className="py-2 border-b border-gray-100">
              <span className="text-gray-600 block mb-1">Location:</span>
              <span className="text-sm">{incident.location?.address || 'Location provided'}</span>
            </div>

            {/* Description */}
            <div className="py-2">
              <span className="text-gray-600 block mb-1">Description:</span>
              <p className="text-sm text-gray-800">{incident.description}</p>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What happens next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Emergency responders in your area have been automatically notified</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Response teams will be dispatched based on the priority level</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>You will receive updates on the incident status if contact information was provided</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>Keep your phone available in case responders need to contact you</span>
            </li>
          </ul>
        </div>

        {/* Emergency Notice */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-800">Important Reminder</p>
              <p className="text-xs text-red-700 mt-1">
                If this is a life-threatening emergency, please call your local emergency number immediately. 
                Do not rely solely on this reporting system for critical situations.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Return to Home
          </button>
          <button
            onClick={() => navigate('/report-incident')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Report Another Incident
          </button>
        </div>

        {/* Support Information */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Need help or have questions about your report?</p>
          <p>Contact support: support@emergency-platform.com</p>
        </div>
      </div>
    </div>
  );
};

export default IncidentConfirmation;