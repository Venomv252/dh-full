import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * ProtectedRoute component for role-based route protection
 * Redirects unauthorized users to appropriate login pages
 */
const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  requiredRoles = [], 
  requireAuth = true,
  fallbackPath = '/'
}) => {
  const { isAuthenticated, isLoading, hasRole, hasAnyRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Store the attempted location for redirect after login
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // If specific role is required
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // If any of the specified roles is required
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // User is authorized, render the protected content
  return children;
};

export default ProtectedRoute;