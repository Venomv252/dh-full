/**
 * Emergency Incident Reporting Platform - Server Entry Point
 * 
 * Main server file that starts the Express application
 */

const app = require('./src/app');

// Start the server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
🚨 Emergency Incident Platform API Server Started
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🕒 Started at: ${new Date().toISOString()}
📋 Health Check: http://localhost:${PORT}/health
🛡️  Security: Comprehensive security middleware enabled
🗄️  Database: MongoDB connection established
📊 Monitoring: Request logging and error tracking active
  `);
});

// Enhanced graceful shutdown handling
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ Server closed successfully');
    
    // Close database connections
    const mongoose = require('mongoose');
    mongoose.connection.close(() => {
      console.log('✅ Database connection closed');
      process.exit(0);
    });
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;