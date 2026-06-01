import http from 'http';
import app from './src/app.js';
import connectDB from './src/config/database.js';
import environment from './src/config/environment.js';
import logger from './src/utils/logger.js';

const PORT = environment.PORT || 5000;

// Handle uncaught exceptions globally
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down server...');
  logger.error(err);
  process.exit(1);
});

const startServer = async () => {
  try {
    // 1. Establish database connection first
    await connectDB();

    // 2. Start HTTP server
    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${environment.NODE_ENV} mode`);
    });

    // Handle unhandled rejections globally
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! Shutting down server...');
      logger.error(err);
      server.close(() => {
        process.exit(1);
      });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
