import { useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

/**
 * Custom hook for authentication operations
 * Provides convenient methods for login, logout, and auth state management
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  const navigate = useNavigate();

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login: contextLogin,
    logout: contextLogout,
    clearError,
    getDashboardRoute,
    hasRole,
    hasAnyRole
  } = context;

  // Enhanced login with navigation
  const login = useCallback(async (credentials, userType = 'user', redirectTo = null) => {
    const result = await contextLogin(credentials, userType);
    
    if (result.success) {
      // Navigate to appropriate dashboard or specified route
      const route = redirectTo || getDashboardRoute(result.user);
      navigate(route);
    }
    
    return result;
  }, [contextLogin, navigate, getDashboardRoute]);

  // Enhanced logout with navigation
  const logout = useCallback(async (redirectTo = '/') => {
    await contextLogout();
    navigate(redirectTo);
  }, [contextLogout, navigate]);

  // Login with role-specific handling
  const loginAsRole = useCallback(async (credentials, role) => {
    return await login(credentials, role);
  }, [login]);

  // Check if user is authenticated and has specific role
  const isAuthorized = useCallback((requiredRole) => {
    return isAuthenticated && hasRole(requiredRole);
  }, [isAuthenticated, hasRole]);

  // Check if user is authenticated and has any of the specified roles
  const isAuthorizedForAny = useCallback((roles) => {
    return isAuthenticated && hasAnyRole(roles);
  }, [isAuthenticated, hasAnyRole]);

  // Get user display name
  const getUserDisplayName = useCallback(() => {
    if (!user) return '';
    
    return user.fullName || user.email || 'User';
  }, [user]);

  // Get user role display name
  const getRoleDisplayName = useCallback(() => {
    if (!user?.role) return '';
    
    const roleNames = {
      user: 'Citizen',
      police: 'Police Officer',
      hospital: 'Healthcare Professional',
      admin: 'Administrator'
    };
    
    return roleNames[user.role] || user.role;
  }, [user]);

  // Check if token is about to expire (within 5 minutes)
  const isTokenExpiringSoon = useCallback(() => {
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      return (expirationTime - currentTime) < fiveMinutes;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired if we can't parse
    }
  }, [token]);

  // Get user permissions based on role
  const getPermissions = useCallback(() => {
    if (!user?.role) return [];
    
    const permissions = {
      user: ['report_incident', 'view_own_incidents', 'upvote_incidents'],
      police: [
        'view_all_incidents',
        'claim_incidents',
        'update_incident_status',
        'view_incident_details',
        'manage_responses'
      ],
      hospital: [
        'search_patients',
        'view_patient_data',
        'admit_patients',
        'view_medical_incidents'
      ],
      admin: [
        'manage_users',
        'view_analytics',
        'system_configuration',
        'view_audit_logs',
        'manage_incidents',
        'export_data'
      ]
    };
    
    return permissions[user.role] || [];
  }, [user]);

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    const userPermissions = getPermissions();
    return userPermissions.includes(permission);
  }, [getPermissions]);

  return {
    // Auth state
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    
    // Auth actions
    login,
    logout,
    loginAsRole,
    clearError,
    
    // Role and permission checks
    hasRole,
    hasAnyRole,
    isAuthorized,
    isAuthorizedForAny,
    hasPermission,
    getPermissions,
    
    // Utility functions
    getUserDisplayName,
    getRoleDisplayName,
    getDashboardRoute,
    isTokenExpiringSoon
  };
};

export default useAuth;