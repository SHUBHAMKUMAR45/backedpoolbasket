import admin from 'firebase-admin';
import environment from './environment.js';
import logger from '../utils/logger.js';

let firebaseApp = null;
const FCM_SERVER_KEY = environment.FCM_SERVER_KEY;

export const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!fcmToken) {
    logger.warn('FCM send skipped: No device token provided.');
    return null;
  }

  // If no FCM config is found or in development mode, log mock message
  if (!FCM_SERVER_KEY) {
    logger.info(`[Mock FCM Push Notification]
      Token: ${fcmToken}
      Title: ${title}
      Body: ${body}
      Data: ${JSON.stringify(data)}
    `);
    return { success: true, messageId: `mock_msg_${Date.now()}` };
  }

  try {
    if (!firebaseApp) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(FCM_SERVER_KEY))
      });
    }

    const message = {
      notification: {
        title,
        body
      },
      data: Object.keys(data).reduce((acc, key) => {
        // FCM data payloads must contain string values only
        acc[key] = String(data[key]);
        return acc;
      }, {}),
      token: fcmToken
    };

    const response = await admin.messaging().send(message);
    logger.info(`FCM notification successfully dispatched to ${fcmToken}: ${response}`);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error(`FCM transmission failure for token ${fcmToken}: ${error.message}`);
    // Always fail gracefully instead of throwing to prevent blocking order or transactional operations
    return { success: false, error: error.message };
  }
};
