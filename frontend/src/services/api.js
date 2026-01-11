import axios from 'axios';

// Environment configuration
const isDevelopment = import.meta.env.VITE_NODE_ENV === 'development' || import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Logging utility
const logger = {
  info: (message, data = null) => {
    if (isDevelopment) {
      console.log(`[API] ${message}`, data || '');
    }
  },
  error: (message, error = null) => {
    if (isDevelopment) {
      console.error(`[API ERROR] ${message}`, error || '');
    }
  },
  warn: (message, data = null) => {
    if (isDevelopment) {
      console.warn(`[API WARNING] ${message}`, data || '');
    }
  }
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor with logging and auth token
api.interceptors.request.use(
  (config) => {
    // Add timestamp for request tracking
    config.metadata = { startTime: new Date() };
    
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    logger.info(`${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    logger.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

// Response interceptor with logging, error handling, and token refresh
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    const duration = new Date() - response.config.metadata.startTime;
    
    // Log successful response
    logger.info(`${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const duration = originalRequest?.metadata ? new Date() - originalRequest.metadata.startTime : 0;
    
    // Log error response
    if (error.response) {
      logger.error(
        `${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - ${error.response.status} (${duration}ms)`,
        {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        }
      );
    } else if (error.request) {
      logger.error(`Network error for ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
        message: error.message,
        code: error.code
      });
    } else {
      logger.error('Request setup error', error.message);
    }

    // Handle 401 Unauthorized with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          logger.info('Attempting token refresh...');
          
          const response = await api.post('/auth/refresh', {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data;
          
          // Update stored tokens
          localStorage.setItem('auth_token', token);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }
          
          logger.info('Token refresh successful');
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        logger.error('Token refresh failed', refreshError);
        
        // Clear auth data and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        
        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
          window.location.href = '/';
        }
        
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors with retry logic
    if (!error.response && originalRequest && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
      logger.warn(`Retrying request due to network error: ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`);
      
      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Generic API error handler
const handleApiError = (error, context = '') => {
  const errorInfo = {
    context,
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    timestamp: new Date().toISOString()
  };
  
  logger.error(`API Error in ${context}`, errorInfo);
  
  // Return standardized error format
  return {
    success: false,
    error: error.response?.data?.message || error.message || 'An unexpected error occurred',
    status: error.response?.status,
    details: error.response?.data
  };
};

// Generic API wrapper with error handling
const apiCall = async (apiFunction, context = '') => {
  try {
    const response = await apiFunction();
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return handleApiError(error, context);
  }
};

// Authentication API calls
export const authAPI = {
  login: async (credentials, userType = 'user') => {
    return apiCall(
      () => api.post('/auth/login', { ...credentials, userType }),
      'authAPI.login'
    );
  },

  logout: async () => {
    return apiCall(
      () => api.post('/auth/logout'),
      'authAPI.logout'
    );
  },

  refreshToken: async (refreshToken) => {
    return apiCall(
      () => api.post('/auth/refresh', { refreshToken }),
      'authAPI.refreshToken'
    );
  },

  register: async (userData) => {
    return apiCall(
      () => api.post('/auth/register', userData),
      'authAPI.register'
    );
  },

  resetPassword: async (email) => {
    return apiCall(
      () => api.post('/auth/reset-password', { email }),
      'authAPI.resetPassword'
    );
  },

  verifyEmail: async (token) => {
    return apiCall(
      () => api.post('/auth/verify-email', { token }),
      'authAPI.verifyEmail'
    );
  },
};

// User API calls
export const userAPI = {
  getProfile: async () => {
    return apiCall(
      () => api.get('/users/profile'),
      'userAPI.getProfile'
    );
  },

  updateProfile: async (userData) => {
    return apiCall(
      () => api.put('/users/profile', userData),
      'userAPI.updateProfile'
    );
  },

  getIncidents: async (filters = {}) => {
    return apiCall(
      () => api.get('/users/incidents', { params: filters }),
      'userAPI.getIncidents'
    );
  },

  changePassword: async (passwordData) => {
    return apiCall(
      () => api.put('/users/password', passwordData),
      'userAPI.changePassword'
    );
  },

  deleteAccount: async () => {
    return apiCall(
      () => api.delete('/users/account'),
      'userAPI.deleteAccount'
    );
  },
};

// Guest API calls
export const guestAPI = {
  create: async (guestData) => {
    return apiCall(
      () => api.post('/guests/create', guestData),
      'guestAPI.create'
    );
  },

  getStatus: async (guestId) => {
    return apiCall(
      () => api.get(`/guests/${guestId}/status`),
      'guestAPI.getStatus'
    );
  },

  convertToUser: async (guestId, userData) => {
    return apiCall(
      () => api.post(`/guests/${guestId}/convert`, userData),
      'guestAPI.convertToUser'
    );
  },
};

// Incident API calls
export const incidentAPI = {
  create: async (incidentData) => {
    return apiCall(
      () => api.post('/incidents', incidentData),
      'incidentAPI.create'
    );
  },

  getAll: async (filters = {}) => {
    return apiCall(
      () => api.get('/incidents', { params: filters }),
      'incidentAPI.getAll'
    );
  },

  getById: async (id) => {
    return apiCall(
      () => api.get(`/incidents/${id}`),
      'incidentAPI.getById'
    );
  },

  update: async (id, updateData) => {
    return apiCall(
      () => api.put(`/incidents/${id}`, updateData),
      'incidentAPI.update'
    );
  },

  upvote: async (id) => {
    return apiCall(
      () => api.post(`/incidents/${id}/upvote`),
      'incidentAPI.upvote'
    );
  },

  removeUpvote: async (id) => {
    return apiCall(
      () => api.delete(`/incidents/${id}/upvote`),
      'incidentAPI.removeUpvote'
    );
  },

  checkProximity: async (location) => {
    return apiCall(
      () => api.post('/incidents/check-proximity', { location }),
      'incidentAPI.checkProximity'
    );
  },

  uploadMedia: async (incidentId, mediaFiles) => {
    const formData = new FormData();
    mediaFiles.forEach((file, index) => {
      formData.append(`media_${index}`, file);
    });

    return apiCall(
      () => api.post(`/incidents/${incidentId}/media`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
      'incidentAPI.uploadMedia'
    );
  },

  getByLocation: async (latitude, longitude, radius = 1000) => {
    return apiCall(
      () => api.get('/incidents/by-location', {
        params: { latitude, longitude, radius }
      }),
      'incidentAPI.getByLocation'
    );
  },
};

// Police API calls
export const policeAPI = {
  getDashboard: async () => {
    return apiCall(
      () => api.get('/police/dashboard'),
      'policeAPI.getDashboard'
    );
  },

  claimIncident: async (incidentId) => {
    return apiCall(
      () => api.post(`/police/incidents/${incidentId}/claim`),
      'policeAPI.claimIncident'
    );
  },

  updateIncidentStatus: async (incidentId, status, notes) => {
    return apiCall(
      () => api.put(`/police/incidents/${incidentId}/status`, { status, notes }),
      'policeAPI.updateIncidentStatus'
    );
  },

  getAssignedIncidents: async () => {
    return apiCall(
      () => api.get('/police/incidents/assigned'),
      'policeAPI.getAssignedIncidents'
    );
  },

  getIncidentsByJurisdiction: async (jurisdictionId) => {
    return apiCall(
      () => api.get(`/police/incidents/jurisdiction/${jurisdictionId}`),
      'policeAPI.getIncidentsByJurisdiction'
    );
  },

  addIncidentNote: async (incidentId, note) => {
    return apiCall(
      () => api.post(`/police/incidents/${incidentId}/notes`, { note }),
      'policeAPI.addIncidentNote'
    );
  },

  requestBackup: async (incidentId, backupType, priority) => {
    return apiCall(
      () => api.post(`/police/incidents/${incidentId}/backup`, { backupType, priority }),
      'policeAPI.requestBackup'
    );
  },
};

// Hospital API calls
export const hospitalAPI = {
  searchPatients: async (searchParams) => {
    return apiCall(
      () => api.post('/hospital/patients/search', searchParams),
      'hospitalAPI.searchPatients'
    );
  },

  getPatientData: async (patientId) => {
    return apiCall(
      () => api.get(`/hospital/patients/${patientId}`),
      'hospitalAPI.getPatientData'
    );
  },

  admitPatient: async (patientData) => {
    return apiCall(
      () => api.post('/hospital/patients/admit', patientData),
      'hospitalAPI.admitPatient'
    );
  },

  getDashboard: async () => {
    return apiCall(
      () => api.get('/hospital/dashboard'),
      'hospitalAPI.getDashboard'
    );
  },

  updatePatientStatus: async (patientId, status, notes) => {
    return apiCall(
      () => api.put(`/hospital/patients/${patientId}/status`, { status, notes }),
      'hospitalAPI.updatePatientStatus'
    );
  },

  getPatientHistory: async (patientId) => {
    return apiCall(
      () => api.get(`/hospital/patients/${patientId}/history`),
      'hospitalAPI.getPatientHistory'
    );
  },

  dischargePatient: async (patientId, dischargeData) => {
    return apiCall(
      () => api.post(`/hospital/patients/${patientId}/discharge`, dischargeData),
      'hospitalAPI.dischargePatient'
    );
  },
};

// Admin API calls
export const adminAPI = {
  getDashboard: async () => {
    return apiCall(
      () => api.get('/admin/dashboard'),
      'adminAPI.getDashboard'
    );
  },

  getUsers: async (filters = {}) => {
    return apiCall(
      () => api.get('/admin/users', { params: filters }),
      'adminAPI.getUsers'
    );
  },

  updateUser: async (userId, updateData) => {
    return apiCall(
      () => api.put(`/admin/users/${userId}`, updateData),
      'adminAPI.updateUser'
    );
  },

  banUser: async (userId, reason) => {
    return apiCall(
      () => api.post(`/admin/users/${userId}/ban`, { reason }),
      'adminAPI.banUser'
    );
  },

  unbanUser: async (userId) => {
    return apiCall(
      () => api.post(`/admin/users/${userId}/unban`),
      'adminAPI.unbanUser'
    );
  },

  getSystemStats: async () => {
    return apiCall(
      () => api.get('/admin/stats'),
      'adminAPI.getSystemStats'
    );
  },

  exportData: async (type, filters = {}) => {
    return apiCall(
      () => api.get(`/admin/export/${type}`, {
        params: filters,
        responseType: 'blob',
      }),
      'adminAPI.exportData'
    );
  },

  getAuditLogs: async (filters = {}) => {
    return apiCall(
      () => api.get('/admin/audit-logs', { params: filters }),
      'adminAPI.getAuditLogs'
    );
  },

  updateSystemConfig: async (configData) => {
    return apiCall(
      () => api.put('/admin/config', configData),
      'adminAPI.updateSystemConfig'
    );
  },

  getSystemHealth: async () => {
    return apiCall(
      () => api.get('/admin/health'),
      'adminAPI.getSystemHealth'
    );
  },

  manageIncident: async (incidentId, action, data = {}) => {
    return apiCall(
      () => api.post(`/admin/incidents/${incidentId}/${action}`, data),
      'adminAPI.manageIncident'
    );
  },
};

// Utility functions for common operations
export const apiUtils = {
  // Check if API is available
  healthCheck: async () => {
    return apiCall(
      () => api.get('/health'),
      'apiUtils.healthCheck'
    );
  },

  // Upload file with progress tracking
  uploadFile: async (file, endpoint, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    };

    return apiCall(
      () => api.post(endpoint, formData, config),
      'apiUtils.uploadFile'
    );
  },

  // Download file
  downloadFile: async (endpoint, filename) => {
    return apiCall(
      async () => {
        const response = await api.get(endpoint, { responseType: 'blob' });
        
        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        return response;
      },
      'apiUtils.downloadFile'
    );
  },

  // Batch API calls with error handling
  batchCall: async (apiCalls) => {
    const results = await Promise.allSettled(apiCalls);
    
    return results.map((result, index) => ({
      index,
      success: result.status === 'fulfilled',
      data: result.status === 'fulfilled' ? result.value : null,
      error: result.status === 'rejected' ? result.reason : null,
    }));
  },
};

// Export the configured axios instance for direct use if needed
export { api, logger };

export default api;