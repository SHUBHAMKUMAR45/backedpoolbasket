import Banner from '../models/Banner.js';
import ApiError from '../utils/ApiError.js';
import { get, set, del } from '../config/redis.js';
import { CACHE_TTL } from '../utils/constants.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';

export const getBanners = async (activeOnly = true) => {
  const cacheKey = `banners:all:${activeOnly}`;

  // Check Redis Cache
  const cachedData = await get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const filter = {};
  if (activeOnly) {
    const now = new Date();
    filter.isActive = true;
    
    // Banner date window rules: startsAt <= now <= endsAt
    filter.$and = [
      {
        $or: [
          { startsAt: { $exists: false } },
          { startsAt: null },
          { startsAt: { $lte: now } }
        ]
      },
      {
        $or: [
          { endsAt: { $exists: false } },
          { endsAt: null },
          { endsAt: { $gte: now } }
        ]
      }
    ];
  }

  const banners = await Banner.find(filter).sort({ order: 1 });

  // Cache results
  await set(cacheKey, JSON.stringify(banners), CACHE_TTL.MEDIUM);

  return banners;
};

export const createBanner = async (bannerData, imageBuffer, adminId) => {
  if (!imageBuffer) {
    throw new ApiError(400, 'Banner image is required');
  }

  const uploadResult = await uploadImage(imageBuffer, 'banners');

  const banner = await Banner.create({
    ...bannerData,
    image: {
      url: uploadResult.url,
      publicId: uploadResult.publicId
    },
    createdBy: adminId
  });

  // Clear banner caches
  await del('banners:all:true');
  await del('banners:all:false');

  return banner;
};

export const updateBanner = async (id, updates, imageBuffer) => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  const fields = ['title', 'subtitle', 'type', 'linkType', 'linkValue', 'order', 'isActive', 'startsAt', 'endsAt'];
  fields.forEach((f) => {
    if (updates[f] !== undefined) banner[f] = updates[f];
  });

  if (imageBuffer) {
    if (banner.image && banner.image.publicId) {
      try {
        await deleteImage(banner.image.publicId);
      } catch (err) {
        console.error(`Failed to delete old banner image: ${err.message}`);
      }
    }

    const uploadResult = await uploadImage(imageBuffer, 'banners');
    banner.image = {
      url: uploadResult.url,
      publicId: uploadResult.publicId
    };
  }

  await banner.save();

  // Clear caches
  await del('banners:all:true');
  await del('banners:all:false');

  return banner;
};

export const deleteBanner = async (id) => {
  const banner = await Banner.findById(id);
  if (!banner) {
    throw new ApiError(404, 'Banner not found');
  }

  if (banner.image && banner.image.publicId) {
    try {
      await deleteImage(banner.image.publicId);
    } catch (err) {
      console.error(`Failed to delete banner image asset: ${err.message}`);
    }
  }

  await Banner.findByIdAndDelete(id);

  // Clear caches
  await del('banners:all:true');
  await del('banners:all:false');
};
