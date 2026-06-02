import mongoose from 'mongoose';
import environment from './environment.js';
import logger from '../utils/logger.js';

const MONGODB_URI = environment.MONGODB_URI;

if (!MONGODB_URI) {
  logger.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      logger.info(`Attempting MongoDB connection (attempt ${retries + 1}/${maxRetries})...`);
      const connectionInstance = await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      logger.info(`MongoDB connected successfully! Host: ${connectionInstance.connection.host}`);
      return connectionInstance;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection error (attempt ${retries}/${maxRetries}): ${error.message}`);
      if (retries >= maxRetries) {
        throw new Error('Failed to connect to MongoDB after maximum retries.');
      }
      // Wait for 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

// Monitor connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose default connection open to DB.');
});

mongoose.connection.on('error', (err) => {
  logger.error(`Mongoose default connection error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose default connection disconnected.');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('Mongoose default connection disconnected through app termination.');
  process.exit(0);
});

export default connectDB;
