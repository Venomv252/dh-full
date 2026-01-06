import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useApi } from '../hooks/useApi';
import { adminAPI } from '../services/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFilters, setUserFilters] = useState({ role: 'all', status: 'all' });

  // API hooks for dashboard data
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    execute: fetchDashboard
  } = useApi(adminAPI.getDashboard);

  const {
    data: systemStats,
    isLoading: statsLoading,
    execute: fetchSystemStats
  } = useApi(adminAPI.getSystemStats);

  const {
    data: users,
    isLoading: usersLoading,
    execute: fetchUsers
  } = useApi(adminAPI.getUsers);

  const {
    data: auditLogs,
    isLoading: auditLoading,
    execute: fetchAuditLogs
  } = useApi(adminAPI.getAuditLogs);

  // Load dashboard data on mount
  useEffect(() => {
    fetchDashboard();
    fetchSystemStats();
    fetchUsers();
    fetchAuditLogs({ limit: 50 });
  }, []);

  const handleUserAction = async (userId, action, reason = '') => {
    try {
      let result;
      switch (action) {
        case 'ban':
          result = await adminAPI.banUser(userId, reason);
          break;
        case 'unban':
          result = await adminAPI.unbanUser(userId);
          break;
        default:
          return;
      }

      if (result.success) {
        // Refresh users list
        fetchUsers(userFilters);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  const handleExportData = async (type) => {
    try {
      await adminAPI.exportData(type);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-500',
      inactive: 'bg-gray-500',
      banned: 'bg-red-500',
      pending: 'bg-yellow-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'text-purple-600 bg-purple-100',
      police: 'text-blue-600 bg-blue-100',
      hospital: 'text-green-600 bg-green-100',
      user: 'text-gray-600 bg-gray-100'
    };
    return colors[role] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">
                  System Administration Panel
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
              { id: 'users', name: 'User Management', icon: 'users' },
              { id: 'incidents', name: 'Incident Management', icon: 'exclamation' },
              { id: 'analytics', name: 'Analytics', icon: 'trending' },
              { id: 'audit', name: 'Audit Logs', icon: 'document' },
              { id: 'system', name: 'System Health', icon: 'server' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
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
                        Total Users
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.totalUsers || 0}
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
                        Active Incidents
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardLoading ? '...' : dashboardData?.activeIncidents || 0}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        System Uptime
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' : systemStats?.uptime || '99.9%'}
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Response Time
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statsLoading ? '...' : systemStats?.avgResponseTime || '2.3s'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* System Health Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    System Health
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Database', status: 'healthy', value: '99.9%' },
                      { name: 'API Server', status: 'healthy', value: '99.8%' },
                      { name: 'File Storage', status: 'healthy', value: '100%' },
                      { name: 'External APIs', status: 'warning', value: '98.5%' }
                    ].map((service, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            service.status === 'healthy' ? 'bg-green-500' : 
                            service.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-900">{service.name}</span>
                        </div>
                        <span className="text-sm text-gray-600">{service.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {dashboardData?.recentActivity?.map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
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
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* User Filters */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    User Management
                  </h3>
                  
                  <div className="flex space-x-4">
                    <select
                      value={userFilters.role}
                      onChange={(e) => setUserFilters(prev => ({ ...prev, role: e.target.value }))}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="all">All Roles</option>
                      <option value="user">Users</option>
                      <option value="police">Police</option>
                      <option value="hospital">Hospital</option>
                      <option value="admin">Admin</option>
                    </select>
                    
                    <select
                      value={userFilters.status}
                      onChange={(e) => setUserFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="banned">Banned</option>
                    </select>
                    
                    <button
                      onClick={() => fetchUsers(userFilters)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Filter
                    </button>
                  </div>
                </div>
                
                {usersLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                ) : users?.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-lg font-medium text-gray-900">
                                {user.fullName}
                              </h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                {user.role}
                              </span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(user.status)}`}>
                                {user.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 mt-2 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Email:</span> {user.email}
                              </div>
                              <div>
                                <span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">Last Active:</span> {user.lastActive}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-medium"
                            >
                              View Details
                            </button>
                            
                            {user.status === 'active' ? (
                              <button
                                onClick={() => handleUserAction(user.id, 'ban', 'Administrative action')}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium"
                              >
                                Ban User
                              </button>
                            ) : user.status === 'banned' ? (
                              <button
                                onClick={() => handleUserAction(user.id, 'unban')}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                              >
                                Unban User
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    No users found matching the selected filters.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Usage Statistics
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Daily Active Users</span>
                      <span className="text-lg font-medium text-gray-900">
                        {systemStats?.dailyActiveUsers || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Incidents Reported Today</span>
                      <span className="text-lg font-medium text-gray-900">
                        {systemStats?.incidentsToday || 0}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Average Response Time</span>
                      <span className="text-lg font-medium text-gray-900">
                        {systemStats?.avgResponseTime || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Data Export
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleExportData('users')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      Export User Data
                    </button>
                    <button
                      onClick={() => handleExportData('incidents')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      Export Incident Data
                    </button>
                    <button
                      onClick={() => handleExportData('audit')}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium"
                    >
                      Export Audit Logs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Audit Logs
              </h3>
              
              {auditLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : auditLogs?.length > 0 ? (
                <div className="space-y-2">
                  {auditLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{log.action}</p>
                        <p className="text-xs text-gray-600">{log.details}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{log.user}</p>
                        <p className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No audit logs available.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  User Details
                </h3>
                <button
                  onClick={() => setSelectedUser(null)}
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
                    <p className="text-sm text-gray-900 mt-1">{selectedUser.fullName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <p className="text-sm text-gray-900 mt-1">{selectedUser.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Role:</span>
                    <span className={`ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Status:</span>
                    <span className={`ml-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Joined:</span>
                  <p className="text-sm text-gray-900 mt-1">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Last Active:</span>
                  <p className="text-sm text-gray-900 mt-1">{selectedUser.lastActive}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedUser(null)}
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

export default AdminDashboard;