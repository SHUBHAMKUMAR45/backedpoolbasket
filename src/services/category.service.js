import Category from '../models/Category.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import { get, set, del } from '../config/redis.js';
import { REDIS_KEYS, CACHE_TTL } from '../utils/constants.js';
import { uploadImage, deleteImage } from '../config/firebaseStorage.js';
import mongoose from 'mongoose';

export const getCategories = async () => {
  // 1. Attempt cache retrieval
  const cachedData = await get(REDIS_KEYS.CATEGORIES);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // 2. Fetch from DB on cache miss
  const categories = await Category.find({ isActive: true })
    .sort({ order: 1 })
    .select('name slug image order parentCategory');

  // 3. Write to cache
  await set(REDIS_KEYS.CATEGORIES, JSON.stringify(categories), CACHE_TTL.LONG);

  return categories;
};

export const getCategory = async (identifier) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);
  
  const filter = isObjectId ? { _id: identifier } : { slug: identifier };
  const category = await Category.findOne({ ...filter, isActive: true });

  if (!category) {
    throw new ApiError(404, 'Category not found or inactive');
  }

  return category;
};

export const createCategory = async ({ name, description, imageBuffer, originalname, parentCategory }) => {
  // Check for name duplicates
  const duplicate = await Category.findOne({ name });
  if (duplicate) {
    throw new ApiError(409, `Category with name "${name}" already exists`);
  }

  let imageData = null;

  // Upload image to Cloudinary if provided
  if (imageBuffer) {
    imageData = await uploadImage(imageBuffer, 'categories');
  } else {
    throw new ApiError(400, 'Category image is required');
  }

  const category = await Category.create({
    name,
    description,
    image: {
      url: imageData.url,
      publicId: imageData.publicId
    },
    parentCategory: parentCategory || null
  });

  // Clear categories cache
  await del(REDIS_KEYS.CATEGORIES);

  return category;
};

export const updateCategory = async (id, updates, imageBuffer) => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  if (updates.name) {
    const duplicate = await Category.findOne({ name: updates.name, _id: { $ne: id } });
    if (duplicate) {
      throw new ApiError(409, `Category with name "${updates.name}" already exists`);
    }
    category.name = updates.name;
  }

  if (updates.description !== undefined) category.description = updates.description;
  if (updates.parentCategory !== undefined) category.parentCategory = updates.parentCategory || null;
  if (updates.isActive !== undefined) category.isActive = updates.isActive;
  if (updates.order !== undefined) category.order = updates.order;

  // Process image updates
  if (imageBuffer) {
    if (category.image && category.image.publicId) {
      try {
        await deleteImage(category.image.publicId);
      } catch (err) {
        // Log deletion failure but don't halt operation
        console.error(`Failed to delete old category image: ${err.message}`);
      }
    }

    const uploadResult = await uploadImage(imageBuffer, 'categories');
    category.image = {
      url: uploadResult.url,
      publicId: uploadResult.publicId
    };
  }

  await category.save();

  // Invalidate cache
  await del(REDIS_KEYS.CATEGORIES);

  return category;
};

export const deleteCategory = async (id) => {
  // Verify no active products reference this category
  const referencedProducts = await Product.countDocuments({ category: id, isActive: true });
  if (referencedProducts > 0) {
    throw new ApiError(
      400,
      `Cannot delete category. It is referenced by ${referencedProducts} active products.`
    );
  }

  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  // Delete image assets
  if (category.image && category.image.publicId) {
    try {
      await deleteImage(category.image.publicId);
    } catch (err) {
      console.error(`Failed to delete category image: ${err.message}`);
    }
  }

  // Soft delete category by deactivating it
  category.isActive = false;
  await category.save();

  // Clear cache
  await del(REDIS_KEYS.CATEGORIES);
};
