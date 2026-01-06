import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleLogout = async () => {
    await logout('/');
  };

  return (
    <div className="min-h-screen gradient-bg hero-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Error Icon */}
        <div className="w-24 h-24 bg-red-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 border border-red-400/30">
          <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Error Message */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
            Access Denied
          </h1>
          
          <p className="text-gray-300 mb-6 drop-shadow-md">
            You don't have permission to access this page. This area is restricted to authorized personnel only.
          </p>

          {user && (
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 mb-6">
              <p className="text-blue-300 text-sm">
                <span className="font-semibold">Current Role:</span> {user.role}
              </p>
              <p className="text-blue-300 text-sm">
                <span className="font-semibold">Email:</span> {user.email}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGoHome}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Go to Home Page
            </button>
            
            {user && (
              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Logout & Switch Account
              </button>
            )}
          </div>
        </div>

        {/* Help Information */}
        <div className="mt-6 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-yellow-300">Need Access?</p>
              <p className="text-xs text-yellow-200 mt-1">
                Contact your system administrator or department supervisor to request appropriate permissions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;