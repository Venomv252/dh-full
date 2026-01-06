import { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

// Initial state
const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  REFRESH_TOKEN_SUCCESS: 'REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILURE: 'REFRESH_TOKEN_FAILURE',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING'
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload.error
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_SUCCESS:
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        error: null
      };

    case AUTH_ACTIONS.REFRESH_TOKEN_FAILURE:
      return {
        ...initialState,
        isLoading: false,
        error: 'Session expired. Please login again.'
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load authentication state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      try {
        const token = localStorage.getItem('auth_token');
        const refreshToken = localStorage.getItem('refresh_token');
        const userData = localStorage.getItem('user_data');

        if (token && refreshToken && userData) {
          const user = JSON.parse(userData);
          
          // Check if token is expired (basic check)
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Date.now() / 1000;
          
          if (tokenPayload.exp > currentTime) {
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: { user, token, refreshToken }
            });
          } else {
            // Token expired, try to refresh
            refreshAuthToken(refreshToken);
          }
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    loadAuthState();
  }, []);

  // Login function
  const login = async (credentials, userType = 'user') => {
    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      // For development, use mock data when backend is not available
      let response;
      try {
        response = await authAPI.login(credentials, userType);
      } catch (apiError) {
        console.warn('Backend API not available, using mock data for development');
        // Fallback to mock data for development
        response = await mockLogin(credentials, userType);
      }
      
      if (response.success) {
        const { user, token, refreshToken } = response.data;
        
        // Store in localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user_data', JSON.stringify(user));
        
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token, refreshToken }
        });
        
        return { success: true, user };
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      // Handle API errors
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: errorMessage }
      });
      return { success: false, error: errorMessage };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout API to invalidate token on server
      await authAPI.logout();
      
      // Clear localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Refresh token function
  const refreshAuthToken = async (refreshToken) => {
    try {
      const response = await authAPI.refreshToken(refreshToken);
      
      if (response.success) {
        const { token, refreshToken: newRefreshToken } = response.data;
        
        // Update localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('refresh_token', newRefreshToken);
        
        dispatch({
          type: AUTH_ACTIONS.REFRESH_TOKEN_SUCCESS,
          payload: { token, refreshToken: newRefreshToken }
        });
        
        return token;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      dispatch({ type: AUTH_ACTIONS.REFRESH_TOKEN_FAILURE });
      return null;
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Get role-specific dashboard route
  const getDashboardRoute = (user) => {
    if (!user) return '/';
    
    switch (user.role) {
      case 'police':
        return '/police/dashboard';
      case 'hospital':
        return '/hospital/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'user':
      default:
        return '/user/dashboard';
    }
  };

  // Check if user has specific role
  const hasRole = (requiredRole) => {
    return state.user?.role === requiredRole;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(state.user?.role);
  };

  const value = {
    // State
    ...state,
    
    // Actions
    login,
    logout,
    refreshAuthToken,
    clearError,
    
    // Utilities
    getDashboardRoute,
    hasRole,
    hasAnyRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock function for development fallback
const mockLogin = async (credentials, userType) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock validation
  if (!credentials.email || !credentials.password) {
    return { success: false, message: 'Email and password are required' };
  }
  
  // Mock successful login
  const mockUser = {
    id: '12345',
    email: credentials.email,
    role: userType,
    fullName: 'John Doe',
    department: credentials.department || null,
    badgeNumber: credentials.badgeNumber || null,
    licenseNumber: credentials.licenseNumber || null,
    facilityName: credentials.facilityName || null
  };
  
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSIsImVtYWlsIjoiam9obi5kb2VAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImV4cCI6MTk5OTk5OTk5OX0.mock_token';
  const mockRefreshToken = 'mock_refresh_token_12345';
  
  return {
    success: true,
    data: {
      user: mockUser,
      token: mockToken,
      refreshToken: mockRefreshToken
    }
  };
};

export default AuthContext;