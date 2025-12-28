/**
 * Authentication Controller
 * Handles JWT token generation, validation, and refresh
 * Supports different user types and role-based authentication
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Guest = require('../models/Guest');
const { USER_ROLES, ERROR_CODES, HTTP_STATUS } = require('../config/constants');
const { generateUserToken, refreshToken } = require('../middleware/auth');

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();

/**
 * Login endpoint for all user types
 * POST /api/auth/login
 * 
 * Authenticates users and returns JWT token with role-based information
 */
const login = async (req, res, next) => {
  try {
    const { email, password, userType = 'user' } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      error.code = ERROR_CODES.MISSING_REQUIRED_FIELD;
      error.details = {
        requiredFields: ['email', 'password'],
        providedFields: Object.keys(req.body)
      };
      throw error;
    }
    
    // Find user by email
    const user = await User.findByEmail(email);
    
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }
    
    // Check if user account is active
    if (!user.isActive) {
      const error = new Error('Account is deactivated. Please contact support.');
      error.statusCode = 403;
      error.code = ERROR_CODES.ACCOUNT_DEACTIVATED;
      throw error;
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_CREDENTIALS;
      throw error;
    }
    
    // Check if user role matches requested user type (optional validation)
    if (userType !== 'user' && user.role !== userType) {
      const error = new Error(`User is not authorized as ${userType}`);
      error.statusCode = 403;
      error.code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
      error.details = {
        userRole: user.role,
        requestedType: userType
      };
      throw error;
    }
    
    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT token
    const token = generateUserToken(user);
    
    // Generate refresh token (longer expiration)
    const refreshTokenValue = generateUserToken(user, '7d');
    
    // Prepare user data for response (no sensitive information)
    const userData = {
      userId: user._id,
      email: user.email,
      role: user.role,
      fullName: user.getDecryptedField('fullName'),
      lastLogin: user.lastLogin,
      profileComplete: !!(
        user.fullName && 
        user.dob && 
        user.phone && 
        user.address?.street
      )
    };
    
    // Determine dashboard URL based on role
    const dashboardUrls = {
      [USER_ROLES.USER]: '/dashboard/user',
      [USER_ROLES.POLICE]: '/dashboard/police',
      [USER_ROLES.HOSPITAL]: '/dashboard/hospital',
      [USER_ROLES.ADMIN]: '/dashboard/admin'
    };
    
    const response = {
      success: true,
      data: {
        user: userData,
        token,
        refreshToken: refreshTokenValue,
        expiresIn: '24h',
        dashboardUrl: dashboardUrls[user.role] || '/dashboard/user'
      },
      message: `Login successful. Welcome back, ${userData.fullName || userData.email}!`
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Logout endpoint
 * POST /api/auth/logout
 * 
 * Invalidates JWT token by adding it to blacklist
 */
const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.substring(7) 
        : authHeader;
      
      // Add token to blacklist
      tokenBlacklist.add(token);
      
      // In production, you might want to store this in Redis with expiration
      // or in a database table for persistent blacklisting
    }
    
    const response = {
      success: true,
      data: {
        loggedOut: true,
        timestamp: new Date().toISOString()
      },
      message: 'Logout successful'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Token refresh endpoint
 * POST /api/auth/refresh
 * 
 * Refreshes JWT token using refresh token
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken: refreshTokenValue } = req.body;
    
    if (!refreshTokenValue) {
      const error = new Error('Refresh token is required');
      error.statusCode = 400;
      error.code = ERROR_CODES.MISSING_REQUIRED_FIELD;
      throw error;
    }
    
    // Check if refresh token is blacklisted
    if (tokenBlacklist.has(refreshTokenValue)) {
      const error = new Error('Refresh token has been invalidated');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_TOKEN;
      throw error;
    }
    
    try {
      // Generate new access token using refresh token
      const newToken = await refreshToken(refreshTokenValue);
      
      // Generate new refresh token
      const jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
      const decoded = jwt.verify(refreshTokenValue, jwtSecret, { ignoreExpiration: true });
      
      // Get fresh user data
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }
      
      const newRefreshToken = generateUserToken(user, '7d');
      
      // Blacklist old refresh token
      tokenBlacklist.add(refreshTokenValue);
      
      const response = {
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresIn: '24h',
          user: {
            userId: user._id,
            email: user.email,
            role: user.role
          }
        },
        message: 'Token refreshed successfully'
      };
      
      res.status(HTTP_STATUS.OK).json(response);
      
    } catch (refreshError) {
      const error = new Error('Invalid or expired refresh token');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_TOKEN;
      error.details = { reason: refreshError.message };
      throw error;
    }
    
  } catch (error) {
    next(error);
  }
};

/**
 * Verify token endpoint
 * GET /api/auth/verify-token
 * 
 * Verifies if current JWT token is valid
 */
const verifyToken = async (req, res, next) => {
  try {
    // This endpoint requires authentication middleware to run first
    if (!req.isAuthenticated || !req.user) {
      const error = new Error('No valid authentication found');
      error.statusCode = 401;
      error.code = ERROR_CODES.UNAUTHORIZED_ACCESS;
      throw error;
    }
    
    const response = {
      success: true,
      data: {
        valid: true,
        user: {
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role,
          userType: req.user.userType
        },
        expiresAt: req.user.exp ? new Date(req.user.exp * 1000) : null
      },
      message: 'Token is valid'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Password reset request endpoint
 * POST /api/auth/forgot-password
 * 
 * Initiates password reset process (placeholder for email integration)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      const error = new Error('Email is required');
      error.statusCode = 400;
      error.code = ERROR_CODES.MISSING_REQUIRED_FIELD;
      throw error;
    }
    
    // Find user by email
    const user = await User.findByEmail(email);
    
    // Always return success to prevent email enumeration attacks
    // In production, send actual password reset email if user exists
    
    if (user) {
      // Generate password reset token (placeholder)
      const resetToken = jwt.sign(
        { userId: user._id, purpose: 'password_reset' },
        process.env.JWT_SECRET || 'development-secret-key',
        { expiresIn: '1h' }
      );
      
      // In production: Send email with reset link containing resetToken
      console.log(`Password reset token for ${email}: ${resetToken}`);
      
      // Store reset token in user document (optional)
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();
    }
    
    const response = {
      success: true,
      data: {
        emailSent: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      },
      message: 'Password reset request processed'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

/**
 * Password reset endpoint
 * POST /api/auth/reset-password
 * 
 * Resets password using reset token
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      const error = new Error('Reset token and new password are required');
      error.statusCode = 400;
      error.code = ERROR_CODES.MISSING_REQUIRED_FIELD;
      throw error;
    }
    
    // Validate password strength (basic validation)
    if (newPassword.length < 8) {
      const error = new Error('Password must be at least 8 characters long');
      error.statusCode = 400;
      error.code = ERROR_CODES.INVALID_INPUT;
      throw error;
    }
    
    try {
      // Verify reset token
      const jwtSecret = process.env.JWT_SECRET || 'development-secret-key';
      const decoded = jwt.verify(token, jwtSecret);
      
      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid token purpose');
      }
      
      // Find user and check if reset token is still valid
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (user.passwordResetToken !== token || 
          !user.passwordResetExpires || 
          user.passwordResetExpires < new Date()) {
        throw new Error('Reset token is invalid or expired');
      }
      
      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Update user password and clear reset token
      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      const response = {
        success: true,
        data: {
          passwordReset: true,
          userId: user._id
        },
        message: 'Password reset successful. Please login with your new password.'
      };
      
      res.status(HTTP_STATUS.OK).json(response);
      
    } catch (tokenError) {
      const error = new Error('Invalid or expired reset token');
      error.statusCode = 401;
      error.code = ERROR_CODES.INVALID_TOKEN;
      error.details = { reason: tokenError.message };
      throw error;
    }
    
  } catch (error) {
    next(error);
  }
};

/**
 * Check if token is blacklisted
 * @param {string} token - JWT token to check
 * @returns {boolean} - True if token is blacklisted
 */
const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

/**
 * Get authentication statistics (Admin only)
 * GET /api/auth/stats
 * 
 * Returns authentication-related statistics
 */
const getAuthStats = async (req, res, next) => {
  try {
    // Get login statistics
    const [
      totalUsers,
      recentLogins,
      activeUsers,
      usersByRole
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      }),
      User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }),
      User.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
            recentLogins: {
              $sum: {
                $cond: [
                  { $gte: ['$lastLogin', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);
    
    // Format role statistics
    const roleStats = {};
    usersByRole.forEach(stat => {
      roleStats[stat._id] = {
        total: stat.count,
        recentLogins: stat.recentLogins
      };
    });
    
    const response = {
      success: true,
      data: {
        totalActiveUsers: totalUsers,
        recentLogins24h: recentLogins,
        activeUsers7d: activeUsers,
        blacklistedTokens: tokenBlacklist.size,
        roleDistribution: roleStats,
        loginRate: {
          daily: Math.round((recentLogins / totalUsers) * 100) || 0,
          weekly: Math.round((activeUsers / totalUsers) * 100) || 0
        }
      },
      message: 'Authentication statistics retrieved successfully'
    };
    
    res.status(HTTP_STATUS.OK).json(response);
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  refresh,
  verifyToken,
  forgotPassword,
  resetPassword,
  getAuthStats,
  isTokenBlacklisted
};