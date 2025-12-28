/**
 * Database Configuration
 * Handles MongoDB connection setup and management
 */

const mongoose = require('mongoose');
const { initializeIndexes } = require('./database-indexes');

/**
 * Connect to MongoDB database
 * @param {string} uri - MongoDB connection URI
 * @param {boolean} createIndexes - Whether to create indexes after connection
 * @returns {Promise} - MongoDB connection promise
 */
const connectDB = async (uri = process.env.MONGODB_URI, createIndexes = true) => {
  try {
    const options = {
      // Connection options for production readiness
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const conn = await mongoose.connect(uri, options);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create comprehensive database indexes after successful connection
    if (createIndexes) {
      try {
        await initializeIndexes();
        console.log('✓ Database indexes initialized');
      } catch (error) {
        console.error('⚠️  Index initialization failed:', error.message);
        // Don't fail the connection for index issues
      }
    }
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 * @returns {Promise} - Disconnection promise
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB
};