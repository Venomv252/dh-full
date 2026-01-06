import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { hospitalAPI } from '../services/api';

const HospitalDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('phone');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // API hooks for dashboard data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    execute: fetchDashboard
  } = useApi(hospitalAPI.getDashboard);

  const {
    data: searchResults,
    isLoading: searchLoading,
    execute: searchPatients
  } = useApi(hospitalAPI.searchPatients);

  const {
    data: patientData,
    isLoading: patientLoading,
    execute: fetchPatientData
  } = useApi(hospitalAPI.getPatientData);

  // Load dashboard data on mount
  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const searchParams = {
      type: searchType,
      query: searchQuery.trim()
    };

    await searchPatients(searchParams);
  };

  const handlePatientSelect = async (patientId) => {
    await fetchPatientData(patientId);
    setSelectedPatient(patientId);
  };

  const handleAdmitPatient = async (patientData) => {
    try {
      const result = await hospitalAPI.admitPatient(patientData);
      if (result.success) {
        // Refresh dashboard data
        fetchDashboard();
        setSelectedPatient(null);
      }
    } catch (error) {
      console.error('Failed to admit patient:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      stable: 'bg-green-500',
      critical: 'bg-red-500',
      serious: 'bg-orange-500',
      fair: 'bg-yellow-500',
      discharged: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m0-18l7 7m-7-7l-7 7" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Hospital Dashboard</h1>
                <p className="text-sm text-gray-600">
                  {user?.licenseNumber} - {user?.facilityName} - {user?.department}
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
              { id: 'search', name: 'Patient Search', icon: 'search' },
              { id: 'admissions', name: 'Current Admissions', icon: 'users' },
              { id: 'emergency', name: 'Emergency Contacts', icon: 'phone' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Current Patients
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.currentPatients || 0}
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
                        Critical Patients
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.criticalPatients || 0}
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
                        Discharges Today
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.dischargesToday || 0}
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
                        Avg. Stay (Days)
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.averageStay || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Admissions */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Recent Admissions
                </h3>
                <div className="space-y-3">
                  {dashboardData?.recentAdmissions?.map((admission, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{admission.patientName}</p>
                        <p className="text-sm text-gray-600">{admission.condition}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(admission.status)}`}>
                          {admission.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{admission.admittedAt}</p>
                      </div>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500">No recent admissions</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-6">
            {/* Search Form */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Patient Search
                </h3>
                
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <label htmlFor="searchType" className="block text-sm font-medium text-gray-700">
                        Search By
                      </label>
                      <select
                        id="searchType"
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="phone">Phone Number</option>
                        <option value="governmentId">Government ID</option>
                        <option value="name">Full Name</option>
                        <option value="medicalId">Medical Record ID</option>
                      </select>
                    </div>
                    
                    <div className="flex-2">
                      <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700">
                        Search Query
                      </label>
                      <input
                        type="text"
                        id="searchQuery"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Enter ${searchType === 'phone' ? 'phone number' : searchType === 'governmentId' ? 'government ID' : searchType === 'name' ? 'full name' : 'medical record ID'}`}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={searchLoading}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md font-medium"
                      >
                        {searchLoading ? 'Searching...' : 'Search'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* HIPAA Notice */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>HIPAA Notice:</strong> All patient searches are logged and monitored. 
                        Access patient information only when necessary for treatment, payment, or healthcare operations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Results */}
            {searchResults && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Search Results
                  </h3>
                  
                  {searchResults.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.map((patient) => (
                        <div key={patient.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-lg font-medium text-gray-900">
                                {patient.fullName}
                              </h4>
                              <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">DOB:</span> {patient.dateOfBirth}
                                </div>
                                <div>
                                  <span className="font-medium">Phone:</span> {patient.phone}
                                </div>
                                <div>
                                  <span className="font-medium">Medical ID:</span> {patient.medicalId}
                                </div>
                                <div>
                                  <span className="font-medium">Last Visit:</span> {patient.lastVisit}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handlePatientSelect(patient.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No patients found matching your search criteria.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'admissions' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Current Admissions
              </h3>
              
              {dashboardData?.currentAdmissions?.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.currentAdmissions.map((admission) => (
                    <div key={admission.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-lg font-medium text-gray-900">
                              {admission.patientName}
                            </h4>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(admission.status)}`}>
                              {admission.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Room:</span> {admission.room}
                            </div>
                            <div>
                              <span className="font-medium">Admitted:</span> {admission.admittedAt}
                            </div>
                            <div>
                              <span className="font-medium">Condition:</span> {admission.condition}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Notes:</span> {admission.notes}
                          </p>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => handlePatientSelect(admission.patientId)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                          >
                            View Details
                          </button>
                          
                          <button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                          >
                            Update Status
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No current admissions.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Emergency Contacts & Protocols
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Emergency Numbers</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Emergency Services:</span>
                      <span className="text-sm font-medium text-red-600">911</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Hospital Security:</span>
                      <span className="text-sm font-medium">ext. 2911</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Poison Control:</span>
                      <span className="text-sm font-medium">1-800-222-1222</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Blood Bank:</span>
                      <span className="text-sm font-medium">ext. 3456</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Department Contacts</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">ICU:</span>
                      <span className="text-sm font-medium">ext. 4001</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Surgery:</span>
                      <span className="text-sm font-medium">ext. 4002</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Radiology:</span>
                      <span className="text-sm font-medium">ext. 4003</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Lab:</span>
                      <span className="text-sm font-medium">ext. 4004</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && patientData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Patient Information
                </h3>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Full Name:</span>
                    <p className="text-sm text-gray-900 mt-1">{patientData.fullName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Date of Birth:</span>
                    <p className="text-sm text-gray-900 mt-1">{patientData.dateOfBirth}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Phone:</span>
                    <p className="text-sm text-gray-900 mt-1">{patientData.phone}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Medical ID:</span>
                    <p className="text-sm text-gray-900 mt-1">{patientData.medicalId}</p>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Medical History:</span>
                  <div className="mt-2 space-y-1">
                    {patientData.medicalHistory?.map((item, index) => (
                      <p key={index} className="text-sm text-gray-900">• {item}</p>
                    )) || <p className="text-sm text-gray-500">No medical history available</p>}
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Allergies:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {patientData.allergies?.join(', ') || 'No known allergies'}
                  </p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Emergency Contact:</span>
                  <p className="text-sm text-gray-900 mt-1">
                    {patientData.emergencyContact?.name} - {patientData.emergencyContact?.phone}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm font-medium"
                >
                  Close
                </button>
                
                <button
                  onClick={() => handleAdmitPatient(patientData)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                >
                  Admit Patient
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HospitalDashboard;