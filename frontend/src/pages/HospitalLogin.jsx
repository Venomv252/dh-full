import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const HospitalLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    licenseNumber: '',
    facilityName: '',
    department: ''
  });
  const [errors, setErrors] = useState({});
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.licenseNumber) {
      newErrors.licenseNumber = 'Medical license number is required';
    }
    
    if (!formData.facilityName) {
      newErrors.facilityName = 'Facility name is required';
    }
    
    if (!formData.department) {
      newErrors.department = 'Department is required';
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
      const result = await login(formData, 'hospital');
      
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
          <div className="w-20 h-20 bg-green-500/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-green-400/30">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18m0-18l7 7m-7-7l-7 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Hospital Login</h1>
          <p className="text-gray-300 drop-shadow-md">Access patient management system</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Professional Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent backdrop-blur-sm"
                placeholder="doctor@hospital.com"
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
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent backdrop-blur-sm"
                placeholder="Enter your password"
              />
              {errors.password && <p className="mt-1 text-sm text-red-300">{errors.password}</p>}
            </div>

            {/* License Number */}
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-white mb-2">
                Medical License Number
              </label>
              <input
                type="text"
                id="licenseNumber"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent backdrop-blur-sm"
                placeholder="MD123456789"
              />
              {errors.licenseNumber && <p className="mt-1 text-sm text-red-300">{errors.licenseNumber}</p>}
            </div>

            {/* Facility Name */}
            <div>
              <label htmlFor="facilityName" className="block text-sm font-medium text-white mb-2">
                Healthcare Facility
              </label>
              <input
                type="text"
                id="facilityName"
                name="facilityName"
                value={formData.facilityName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent backdrop-blur-sm"
                placeholder="General Hospital"
              />
              {errors.facilityName && <p className="mt-1 text-sm text-red-300">{errors.facilityName}</p>}
            </div>

            {/* Department */}
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-white mb-2">
                Department
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent backdrop-blur-sm"
              >
                <option value="" className="text-gray-900">Select Department</option>
                <option value="emergency" className="text-gray-900">Emergency Department</option>
                <option value="trauma" className="text-gray-900">Trauma Center</option>
                <option value="icu" className="text-gray-900">Intensive Care Unit</option>
                <option value="surgery" className="text-gray-900">Surgery</option>
                <option value="cardiology" className="text-gray-900">Cardiology</option>
                <option value="neurology" className="text-gray-900">Neurology</option>
                <option value="administration" className="text-gray-900">Administration</option>
              </select>
              {errors.department && <p className="mt-1 text-sm text-red-300">{errors.department}</p>}
            </div>

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
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </div>
              ) : (
                'Access Patient System'
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => navigate('/')}
              className="text-green-300 hover:text-green-200 text-sm transition-colors"
            >
              ← Back to Home
            </button>
            <div className="text-gray-400 text-xs">
              For technical support, contact hospital IT
            </div>
          </div>
        </div>

        {/* HIPAA Notice */}
        <div className="mt-6 bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-300">HIPAA Compliance Notice</p>
              <p className="text-xs text-blue-200 mt-1">
                This system contains protected health information. Access is restricted to authorized healthcare personnel only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalLogin;