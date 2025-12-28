/**
 * Emergency Incident Reporting Platform - Main Application
 * 
 * A Node.js backend system for emergency incident reporting and management
 * with geolocation support, role-based access control, and comprehensive security.
 */

require('dotenv').config();
const express = require('express');
const { connectDB } = require('./config/database');
const { securityMiddleware } = require('./config/security');
const { HTTP_STATUS } = require('./config/constants');
const { errorHandler, initializeErrorHandling } = require('./middleware/errorHandler');

// Initialize error handling for unhandled rejections and exceptions
initializeErrorHandling();

// Initialize Express application
const app = express();

// Connect to MongoDB
connectDB();

// Security middleware (Helmet, CORS)
app.use(securityMiddleware);

// Body parsing middleware with error handling
app.use(express.json({ 
  limit: '10mb',
  // Handle JSON parsing errors
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      const error = new Error('Invalid JSON format');
      error.statusCode = 400;
      error.code = 'INVALID_JSON';
      throw error;
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  // Handle URL encoding errors
  verify: (req, res, buf) => {
    if (buf && buf.length && !buf.toString().match(/^[\w\-\.\~\%\!\*\'\(\)\;\:\@\&\=\+\$\,\/\?\#\[\]]*$/)) {
      const error = new Error('Invalid URL encoding');
      error.statusCode = 400;
      error.code = 'INVALID_ENCODING';
      throw error;
    }
  }
}));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Emergency Incident Platform API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Import route modules
const authRoutes = require('./routes/auth');
const guestRoutes = require('./routes/guestRoutes');
const userRoutes = require('./routes/userRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
// const policeRoutes = require('./routes/police'); // TODO: Create police routes
// const hospitalRoutes = require('./routes/hospital'); // TODO: Create hospital routes
const adminRoutes = require('./routes/adminRoutes');
const mediaRoutes = require('./routes/media');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/guest', guestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
// app.use('/api/police', policeRoutes); // TODO: Create police routes
// app.use('/api/hospital', hospitalRoutes); // TODO: Create hospital routes
app.use('/api/admin', adminRoutes);
app.use('/api/media', mediaRoutes);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      type: 'resource',
      details: {
        method: req.method,
        path: req.originalUrl,
        suggestion: 'Please check the API documentation for valid endpoints'
      }
    },
    timestamp: new Date().toISOString(),
  });
});

// Comprehensive error handling middleware
app.use(errorHandler);

module.exports = app;