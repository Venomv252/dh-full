import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { policeAPI, incidentAPI } from '../services/api';

const PoliceDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIncident, setSelectedIncident] = useState(null);

  // API hooks for dashboard data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    execute: fetchDashboard
  } = useApi(policeAPI.getDashboard);

  const {
    data: assignedIncidents,
    isLoading: incidentsLoading,
    execute: fetchAssignedIncidents
  } = useApi(policeAPI.getAssignedIncidents);

  const {
    data: nearbyIncidents,
    isLoading: nearbyLoading,
    execute: fetchNearbyIncidents
  } = useApi(incidentAPI.getAll);

  // Load dashboard data on mount
  useEffect(() => {
    fetchDashboard();
    fetchAssignedIncidents();
    fetchNearbyIncidents({ status: 'reported', limit: 10 });
  }, []);

  const handleClaimIncident = async (incidentId) => {
    try {
      const result = await policeAPI.claimIncident(incidentId);
      if (result.success) {
        // Refresh data
        fetchAssignedIncidents();
        fetchNearbyIncidents({ status: 'reported', limit: 10 });
      }
    } catch (error) {
      console.error('Failed to claim incident:', error);
    }
  };

  const handleUpdateStatus = async (incidentId, status, notes = '') => {
    try {
      const result = await policeAPI.updateIncidentStatus(incidentId, status, notes);
      if (result.success) {
        // Refresh data
        fetchAssignedIncidents();
        setSelectedIncident(null);
      }
    } catch (error) {
      console.error('Failed to update incident status:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      reported: 'bg-red-500',
      assigned: 'bg-yellow-500',
      'in-progress': 'bg-blue-500',
      resolved: 'bg-green-500',
      closed: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Police Dashboard</h1>
                <p className="text-sm text-gray-600">
                  Officer {user?.badgeNumber} - {user?.department}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => logout()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: 'chart' },
              { id: 'incidents', name: 'My Incidents', icon: 'clipboard' },
              { id: 'available', name: 'Available Incidents', icon: 'exclamation' },
              { id: 'map', name: 'Incident Map', icon: 'map' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Assigned Incidents
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.assignedCount || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        In Progress
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.inProgressCount || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Resolved Today
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.resolvedToday || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        High Priority
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.highPriorityCount || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {dashboardData?.recentActivity?.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(activity.type)}`}></div>
                      <span className="text-sm text-gray-600">{activity.message}</span>
                      <span className="text-xs text-gray-400">{activity.timestamp}</span>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  My Assigned Incidents
                </h3>
                
                {incidentsLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : assignedIncidents?.length > 0 ? (
                  <div className="space-y-4">
                    {assignedIncidents.map((incident) => (
                      <div key={incident.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(incident.status)}`}>
                                {incident.status}
                              </span>
                              <span className={`text-sm font-medium ${getPriorityColor(incident.priority)}`}>
                                {incident.priority?.toUpperCase()}
                              </span>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mt-1">
                              {incident.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {incident.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>📍 {incident.location?.address}</span>
                              <span>🕒 {new Date(incident.createdAt).toLocaleString()}</span>
                              <span>👤 {incident.reportedBy?.name}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => setSelectedIncident(incident)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              View Details
                            </button>
                            
                            {incident.status === 'assigned' && (
                              <button
                                onClick={() => handleUpdateStatus(incident.id, 'in-progress')}
                                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-medium"
                              >
                                Start Response
                              </button>
                            )}
                            
                            {incident.status === 'in-progress' && (
                              <button
                                onClick={() => handleUpdateStatus(incident.id, 'resolved')}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                              >
                                Mark Resolved
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No incidents assigned to you at the moment.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'available' && (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Available Incidents in Your Area
                </h3>
                
                {nearbyLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : nearbyIncidents?.length > 0 ? (
                  <div className="space-y-4">
                    {nearbyIncidents.map((incident) => (
                      <div key={incident.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(incident.status)}`}>
                                {incident.status}
                              </span>
                              <span className={`text-sm font-medium ${getPriorityColor(incident.priority)}`}>
                                {incident.priority?.toUpperCase()}
                              </span>
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mt-1">
                              {incident.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {incident.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>📍 {incident.location?.address}</span>
                              <span>🕒 {new Date(incident.createdAt).toLocaleString()}</span>
                              <span>👍 {incident.upvotes || 0} upvotes</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2">
                            <button
                              onClick={() => setSelectedIncident(incident)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              View Details
                            </button>
                            
                            <button
                              onClick={() => handleClaimIncident(incident.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              Claim Incident
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No available incidents in your area.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Incident Map
              </h3>
              <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-gray-500">Interactive map will be implemented with Google Maps integration</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Incident Details
                </h3>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedIncident.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{selectedIncident.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(selectedIncident.status)}`}>
                      {selectedIncident.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Priority:</span>
                    <span className={`ml-2 text-sm font-medium ${getPriorityColor(selectedIncident.priority)}`}>
                      {selectedIncident.priority?.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Location:</span>
                  <p className="text-sm text-gray-900 mt-1">{selectedIncident.location?.address}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Reported by:</span>
                  <p className="text-sm text-gray-900 mt-1">{selectedIncident.reportedBy?.name}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Reported at:</span>
                  <p className="text-sm text-gray-900 mt-1">{new Date(selectedIncident.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliceDashboard;