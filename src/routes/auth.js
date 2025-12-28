/**
 * Authentication Routes
 * Handles JWT-based authentication for all user types
 * Provides login, logout, token refresh, and password reset functionality
 */

const express = require('express');
const router = express.Router();

// Import controllers
const {
  login,
  logout,
  refresh,
  verifyToken,
  forgotPassword,
  resetPassword,
  getAuthStats
} = require('../controllers/authController');

// Import middleware
const { authenticate, requireUserAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { rateLimiters } = require('../middleware/rateLimiter');
const { validators } = require('../middleware/validation');

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT token
 * @access  Public
 * @body    { email, password, userType? }
 */
router.post('/login', 
  rateLimiters.auth,
  validators.loginValidation,
  login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and blacklist token
 * @access  Private (requires valid token)
 * @headers Authorization: Bearer <token>
 */
router.post('/logout',
  authenticate,
  logout
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token using refresh token
 * @access  Public
 * @body    { refreshToken }
 */
router.post('/refresh',
  rateLimiters.auth,
  validators.refreshTokenValidation,
  refresh
);

/**
 * @route   GET /api/auth/verify-token
 * @desc    Verify if current JWT token is valid
 * @access  Private (requires valid token)
 * @headers Authorization: Bearer <token>
 */
router.get('/verify-token',
  authenticate,
  verifyToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset (sends email with reset link)
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password',
  rateLimiters.passwordReset,
  validators.emailValidation,
  forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using reset token
 * @access  Public
 * @body    { token, newPassword }
 */
router.post('/reset-password',
  rateLimiters.passwordReset,
  validators.passwordResetValidation,
  resetPassword
);

/**
 * @route   GET /api/auth/stats
 * @desc    Get authentication statistics (admin only)
 * @access  Private (Admin only)
 * @headers Authorization: Bearer <token>
 */
router.get('/stats',
  authenticate,
  requireUserAuth,
  requireRole(['admin']),
  getAuthStats
);

module.exports = router;