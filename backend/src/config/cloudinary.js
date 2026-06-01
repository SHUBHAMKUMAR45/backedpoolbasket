import { v2 as cloudinary } from 'cloudinary';
import environment from './environment.js';
import logger from '../utils/logger.js';

cloudinary.config({
  cloud_name: environment.CLOUDINARY_CLOUD_NAME || '',
  api_key: environment.CLOUDINARY_API_KEY || '',
  api_secret: environment.CLOUDINARY_API_SECRET || '',
});

export const uploadImage = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    // If not configured, fall back to mock image in dev mode
    const isMock = !environment.CLOUDINARY_CLOUD_NAME || 
                   environment.CLOUDINARY_CLOUD_NAME === 'your-cloud-name';
                   
    if (environment.NODE_ENV !== 'production' && isMock) {
      logger.warn('Cloudinary not configured. Returning mock image details.');
      return resolve({
        url: 'https://images.unsplash.com/photo-1548610762-7c6afe24c261?w=400',
        publicId: `mock_public_id_${Date.now()}`
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `phool_basket/${folder}` },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload error: ${error.message}`);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

export const deleteImage = async (publicId) => {
  const isMock = !environment.CLOUDINARY_CLOUD_NAME || 
                 environment.CLOUDINARY_CLOUD_NAME === 'your-cloud-name' ||
                 publicId.startsWith('mock_');

  if (environment.NODE_ENV !== 'production' && isMock) {
    logger.warn(`Mock Cloudinary delete called for publicId: ${publicId}`);
    return { result: 'ok' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    logger.error(`Cloudinary deletion error: ${error.message}`);
    throw error;
  }
};
