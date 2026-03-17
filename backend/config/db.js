'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connects to MongoDB. Only emails are stored — Lead is the only model.
 */
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    logger.info(`Connecting to MongoDB... (URI starts with: ${uri ? uri.substring(0, 20) : 'undefined'}...)`);
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () =>
  logger.warn('MongoDB disconnected — reconnecting...')
);
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

module.exports = connectDB;
