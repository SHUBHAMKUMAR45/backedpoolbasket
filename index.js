import { onRequest } from "firebase-functions/v2/https";
import app from "./src/app.js";
import connectDB from "./src/config/database.js";
import logger from "./src/utils/logger.js";

// Initialize database connection
// In serverless environments, we reuse the connection if it already exists
let dbInitialized = false;

const initDb = async () => {
  if (!dbInitialized) {
    try {
      await connectDB();
      dbInitialized = true;
      logger.info('Database connected for Firebase Functions');
    } catch (error) {
      logger.error('Database connection failed:', error);
    }
  }
};

// Expose the Express app as a Firebase Cloud Function named 'api'
export const api = onRequest(
  {
    region: "us-central1", // You can change this to "asia-south1" if preferred
    memory: "512MiB",
    maxInstances: 10,
    cors: true
  },
  async (req, res) => {
    // Ensure DB is connected before serving the request
    await initDb();
    
    // Pass the request to the Express app
    return app(req, res);
  }
);
