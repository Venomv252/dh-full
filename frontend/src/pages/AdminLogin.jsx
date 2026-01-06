import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const AdminLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminCode: '',
    twoFactorCode: ''
  });
  const [errors, setErrors] = useState({});
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    // Clear auth error when user starts typing
    if (error) {
      clearError();
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.adminCode) {
      newErrors.adminCode = 'Admin access code is required';
    }
    
    if (showTwoFactor && !formData.twoFactorCode) {
      newErrors.twoFactorCode = '2FA code is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      if (!showTwoFactor) {
        // First step - show 2FA (simulate 2FA requirement)
        setShowTwoFactor(true);
        return;
      }
      
      // Second step - complete login with 2FA
      const result = await login(formData, 'admin');
      
      if (!result.success) {
        setErrors({ submit: result.error || 'Login failed. Please check your credentials.' });
      }
      // Navigation is handled by the useAuth hook
      
    } catch (error) {
      setErrors({ submit: 'Login failed. Please check your credentials.' });
    }
  };

  return (
    <div className="min-h-screen gradient-bg hero-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-purple-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-400/30">
            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Admin Login</h1>
          <p className="text-gray-300 drop-shadow-md">
            {showTwoFactor ? 'Enter your 2FA code' : 'System administration access'}
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {!showTwoFactor ? (
              <>
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm"
                    placeholder="admin@emergency-platform.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-300">{errors.email}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm"
                    placeholder="Enter your secure password"
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-300">{errors.password}</p>}
                </div>

                {/* Admin Code */}
                <div>
                  <label htmlFor="adminCode" className="block text-sm font-medium text-white mb-2">
                    Admin Access Code
                  </label>
                  <input
                    type="password"
                    id="adminCode"
                    name="adminCode"
                    value={formData.adminCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm"
                    placeholder="Enter admin access code"
                  />
                  {errors.adminCode && <p className="mt-1 text-sm text-red-300">{errors.adminCode}</p>}
                </div>
              </>
            ) : (
              /* Two Factor Authentication */
              <div>
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-white mb-2">
                  Two-Factor Authentication Code
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  name="twoFactorCode"
                  value={formData.twoFactorCode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength="6"
                />
                {errors.twoFactorCode && <p className="mt-1 text-sm text-red-300">{errors.twoFactorCode}</p>}
                <p className="mt-2 text-xs text-gray-300">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            {/* Submit Error */}
            {(errors.submit || error) && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
                <p className="text-red-300 text-sm">{errors.submit || error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {showTwoFactor ? 'Verifying...' : 'Authenticating...'}
                </div>
              ) : (
                showTwoFactor ? 'Verify & Access System' : 'Continue to 2FA'
              )}
            </button>

            {/* Back Button for 2FA */}
            {showTwoFactor && (
              <button
                type="button"
                onClick={() => setShowTwoFactor(false)}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                ← Back to Login
              </button>
            )}
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => navigate('/')}
              className="text-purple-300 hover:text-purple-200 text-sm transition-colors"
            >
              ← Back to Home
            </button>
            <div className="text-gray-400 text-xs">
              For admin support, contact system administrator
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-red-500/20 border border-red-400/30 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-300">High Security Zone</p>
              <p className="text-xs text-red-200 mt-1">
                All administrative actions are logged and monitored. Unauthorized access attempts will be reported.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;