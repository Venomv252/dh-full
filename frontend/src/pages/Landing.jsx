import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ReportIncidentModal from '../components/ReportIncidentModal';

const Landing = () => {
  const [showReportModal, setShowReportModal] = useState(false);
  const { isAuthenticated, user, logout, getUserDisplayName, getRoleDisplayName } = useAuth();
  const navigate = useNavigate();

  const handleRoleLogin = (role) => {
    // Navigate to role-specific login page
    navigate(`/login/${role}`);
  };

  const handleReportIncident = () => {
    setShowReportModal(true);
  };

  return (
    <div className="min-h-screen gradient-bg hero-pattern relative overflow-hidden">
      {/* Authentication Status Bar */}
      {isAuthenticated && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="text-white">
                <p className="text-sm font-medium">{getUserDisplayName()}</p>
                <p className="text-xs text-gray-300">{getRoleDisplayName()}</p>
              </div>
              <button
                onClick={() => logout()}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 px-3 py-1 rounded-md text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
      <div className="absolute top-1/3 right-20 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl"></div>
      <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-cyan-400/10 rounded-full blur-xl"></div>
      <div className="absolute top-1/2 left-10 w-16 h-16 bg-indigo-400/8 rounded-full blur-lg"></div>
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-2xl">
            Emergency Incident
            <br />
            <span className="text-cyan-400 drop-shadow-lg">Reporting Platform</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto drop-shadow-lg">
            Fast, reliable emergency reporting system connecting citizens with first responders
          </p>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {/* User Login */}
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => handleRoleLogin('user')}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Login as User</h3>
                <p className="text-gray-600 text-sm text-center">
                  Citizens and general public
                </p>
              </div>
            </button>
          </div>

          {/* Police Login */}
          <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button
              onClick={() => handleRoleLogin('police')}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Login as Police</h3>
                <p className="text-gray-600 text-sm text-center">
                  Law enforcement officers
                </p>
              </div>
            </button>
          </div>

          {/* Hospital Login */}
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <button
              onClick={() => handleRoleLogin('hospital')}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m0-18l7 7m-7-7l-7 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Login as Hospital</h3>
                <p className="text-gray-600 text-sm text-center">
                  Healthcare facilities
                </p>
              </div>
            </button>
          </div>

          {/* Report Incident */}
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <button
              onClick={handleReportIncident}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group pulse-slow"
            >
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-4 group-hover:bg-red-400 transition-colors">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-2">Report an Incident</h3>
                <p className="text-red-100 text-sm text-center">
                  Emergency reporting
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Admin Access - Discrete button */}
        <div className="flex justify-center mb-16">
          <button
            onClick={() => handleRoleLogin('admin')}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium py-2 px-6 rounded-lg border border-white/30 transition-all duration-300 text-sm"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>System Administration</span>
            </div>
          </button>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="text-center text-white animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="w-16 h-16 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-400/30">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 drop-shadow-lg">Fast Response</h3>
            <p className="text-gray-300 drop-shadow-md">
              Instant notifications to emergency responders in your area
            </p>
          </div>

          <div className="text-center text-white animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <div className="w-16 h-16 bg-purple-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-400/30">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 drop-shadow-lg">Location Tracking</h3>
            <p className="text-gray-300 drop-shadow-md">
              Precise GPS location sharing for accurate emergency response
            </p>
          </div>

          <div className="text-center text-white animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <div className="w-16 h-16 bg-cyan-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-400/30">
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 drop-shadow-lg">Secure & Reliable</h3>
            <p className="text-gray-300 drop-shadow-md">
              End-to-end encryption and secure data handling
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-white animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <p className="mb-4 drop-shadow-lg">
            Available 24/7 for emergency situations
          </p>
          <p className="text-sm text-gray-400 drop-shadow-md">
            For life-threatening emergencies, call your local emergency number immediately
          </p>
        </div>
      </div>

      {/* Report Incident Modal */}
      {showReportModal && (
        <ReportIncidentModal 
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
};

export default Landing;