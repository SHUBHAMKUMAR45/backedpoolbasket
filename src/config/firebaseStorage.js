import admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import environment from './environment.js';
import logger from '../utils/logger.js';

// Parse the service account from environment
const FIREBASE_SERVICE_ACCOUNT = environment.FIREBASE_SERVICE_ACCOUNT;
const FIREBASE_STORAGE_BUCKET = environment.FIREBASE_STORAGE_BUCKET;

let bucket = null;

if (FIREBASE_SERVICE_ACCOUNT && FIREBASE_STORAGE_BUCKET) {
  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    // Check if default app is already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: FIREBASE_STORAGE_BUCKET
      });
    }
    bucket = admin.storage().bucket();
    logger.info('Firebase Storage initialized successfully.');
  } catch (error) {
    logger.error('Failed to initialize Firebase Storage:', error);
  }
} else {
  logger.warn('Firebase Storage credentials missing. File uploads will be mocked.');
}

/**
 * Uploads an image buffer or base64 string to Firebase Storage
 * @param {string|Buffer} fileData - Base64 string or buffer
 * @param {string} folder - Destination folder
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadImage = async (fileData, folder = 'general') => {
  if (!bucket) {
    logger.warn('Mock upload to Firebase Storage (no credentials)');
    return {
      url: `https://mock-firebase-storage.com/${folder}/${Date.now()}`,
      public_id: `mock_id_${Date.now()}`
    };
  }

  try {
    let buffer;
    if (typeof fileData === 'string' && fileData.startsWith('data:image')) {
      const base64Data = fileData.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = fileData;
    }

    const filename = `${folder}/${uuidv4()}`;
    const file = bucket.file(filename);

    await file.save(buffer, {
      metadata: { contentType: 'image/jpeg' }, // Simplification: could detect from base64
      public: true,
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Get the public URL
    const url = `https://storage.googleapis.com/${bucket.name}/${filename}`;

    return {
      url,
      publicId: filename // Firebase filename acts as publicId
    };
  } catch (error) {
    logger.error('Error uploading to Firebase Storage:', error);
    throw new Error('Image upload failed');
  }
};

/**
 * Deletes an image from Firebase Storage
 * @param {string} public_id - The file path/name in storage
 * @returns {Promise<boolean>}
 */
export const deleteImage = async (public_id) => {
  if (!bucket) {
    logger.warn(`Mock delete from Firebase Storage (no credentials) for ${public_id}`);
    return true;
  }

  try {
    const file = bucket.file(public_id);
    const [exists] = await file.exists();
    if (exists) {
      await file.delete();
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting image ${public_id} from Firebase Storage:`, error);
    return false; // Soft fail on delete errors
  }
};
