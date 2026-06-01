import Product from '../models/Product.js';
import Category from '../models/Category.js';
import ApiError from '../utils/ApiError.js';
import { get, set, del } from '../config/redis.js';
import { REDIS_KEYS, CACHE_TTL, PAGINATION } from '../utils/constants.js';
import { uploadImage, deleteImage } from '../config/cloudinary.js';
import mongoose from 'mongoose';

export const getProducts = async (query) => {
  const page = parseInt(query.page || PAGINATION.DEFAULT_PAGE, 10);
  const limit = parseInt(query.limit || PAGINATION.DEFAULT_LIMIT, 10);
  const { category, search, sort, minPrice, maxPrice, isExpress, isSameDay, isFeatured } = query;

  // Build sorted queries for deterministic cache key creation
  const normalizedQuery = { page, limit, category, search, sort, minPrice, maxPrice, isExpress, isSameDay, isFeatured };
  const sortedKeys = Object.keys(normalizedQuery).sort();
  const cacheMap = {};
  sortedKeys.forEach((k) => {
    if (normalizedQuery[k] !== undefined) cacheMap[k] = normalizedQuery[k];
  });
  
  const cacheKey = `${REDIS_KEYS.PRODUCTS_LIST}${JSON.stringify(cacheMap)}`;

  // Check Redis Cache
  const cachedData = await get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  // Build filters
  const filter = { isActive: true };

  // Category filter lookup (resolves slug or ID)
  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.category = category;
    } else {
      const foundCategory = await Category.findOne({ slug: category, isActive: true });
      if (foundCategory) {
        filter.category = foundCategory._id;
      } else {
        return {
          products: [],
          pagination: { page, limit, total: 0, pages: 0, hasNext: false, hasPrev: false }
        };
      }
    }
  }

  // Price range filters
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = parseFloat(maxPrice);
  }

  // Delivery type & spotlight filters
  if (isExpress === 'true' || isExpress === true) {
    filter.isExpressDelivery = true;
  }
  if (isSameDay === 'true' || isSameDay === true) {
    filter.isSameDayDelivery = true;
  }
  if (isFeatured === 'true' || isFeatured === true) {
    filter.isFeatured = true;
  }

  // MongoDB text index search
  if (search) {
    filter.$text = { $search: search };
  }

  // Construct sorts
  let sortCriteria = { createdAt: -1 };
  if (sort) {
    if (sort === 'price_asc') {
      sortCriteria = { price: 1 };
    } else if (sort === 'price_desc') {
      sortCriteria = { price: -1 };
    } else if (sort === 'rating') {
      sortCriteria = { 'ratings.average': -1 };
    } else if (sort === 'newest') {
      sortCriteria = { createdAt: -1 };
    }
  }

  // Paginated search queries
  const skip = (page - 1) * limit;
  const total = await Product.countDocuments(filter);
  const products = await Product.find(filter)
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit)
    .populate('category', 'name slug');

  const pages = Math.ceil(total / limit);

  const result = {
    products,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    }
  };

  // Cache results
  await set(cacheKey, JSON.stringify(result), CACHE_TTL.SHORT);

  return result;
};

export const getProduct = async (idOrSlug) => {
  const isObjectId = mongoose.Types.ObjectId.isValid(idOrSlug);
  const cacheKey = `${REDIS_KEYS.PRODUCT_CACHE}${idOrSlug}`;

  // Check Redis Cache
  const cachedData = await get(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const filter = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };
  const product = await Product.findOne({ ...filter, isActive: true }).populate('category', 'name slug');

  if (!product) {
    throw new ApiError(404, 'Product not found or inactive');
  }

  // Cache results
  await set(cacheKey, JSON.stringify(product), CACHE_TTL.MEDIUM);

  return product;
};

export const createProduct = async (productData, imageBuffers, userId) => {
  // Validate category
  const categoryExists = await Category.findOne({ _id: productData.category, isActive: true });
  if (!categoryExists) {
    throw new ApiError(404, 'Category not found or deactivated');
  }

  // Check upload limits
  if (!imageBuffers || imageBuffers.length === 0) {
    throw new ApiError(400, 'At least one product image is required');
  }

  // Upload images to Cloudinary
  const uploadPromises = imageBuffers.map((buf) => uploadImage(buf, 'products'));
  const uploadResults = await Promise.all(uploadPromises);

  const images = uploadResults.map((res, index) => ({
    url: res.url,
    publicId: res.publicId,
    isPrimary: index === 0 // first image is primary
  }));

  const product = await Product.create({
    ...productData,
    images,
    createdBy: userId
  });

  // Invalidate list caches using wildcards
  await del(`${REDIS_KEYS.PRODUCTS_LIST}*`);

  return product;
};

export const updateProduct = async (id, updates, imageBuffers) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Category validity check if provided
  if (updates.category) {
    const categoryExists = await Category.findOne({ _id: updates.category, isActive: true });
    if (!categoryExists) {
      throw new ApiError(404, 'Category not found or deactivated');
    }
  }

  // Update plain fields
  const fields = [
    'name',
    'description',
    'shortDescription',
    'price',
    'compareAtPrice',
    'category',
    'stock',
    'sku',
    'isExpressDelivery',
    'isSameDayDelivery',
    'isFeatured',
    'isActive'
  ];

  fields.forEach((f) => {
    if (updates[f] !== undefined) product[f] = updates[f];
  });

  if (updates.tags) {
    product.tags = typeof updates.tags === 'string' ? JSON.parse(updates.tags) : updates.tags;
  }

  // Process new image additions
  if (imageBuffers && imageBuffers.length > 0) {
    const uploadPromises = imageBuffers.map((buf) => uploadImage(buf, 'products'));
    const uploadResults = await Promise.all(uploadPromises);

    const newImages = uploadResults.map((res) => ({
      url: res.url,
      publicId: res.publicId,
      isPrimary: product.images.length === 0 // primary if no prior images
    }));

    product.images.push(...newImages);
  }

  await product.save();

  // Invalidate product details and list caches
  await del(`${REDIS_KEYS.PRODUCT_CACHE}${id}`);
  if (product.slug) {
    await del(`${REDIS_KEYS.PRODUCT_CACHE}${product.slug}`);
  }
  await del(`${REDIS_KEYS.PRODUCTS_LIST}*`);

  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Delete all Cloudinary assets
  const deletePromises = product.images.map((img) => deleteImage(img.publicId));
  try {
    await Promise.all(deletePromises);
  } catch (err) {
    console.error(`Failed to clear product images on deletion: ${err.message}`);
  }

  // Hard delete the product document
  await Product.findByIdAndDelete(id);

  // Invalidate caches
  await del(`${REDIS_KEYS.PRODUCT_CACHE}${id}`);
  if (product.slug) {
    await del(`${REDIS_KEYS.PRODUCT_CACHE}${product.slug}`);
  }
  await del(`${REDIS_KEYS.PRODUCTS_LIST}*`);
};

export const updateStock = async (id, stock) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  product.stock = stock;
  await product.save();

  // Invalidate caches
  await del(`${REDIS_KEYS.PRODUCT_CACHE}${id}`);
  if (product.slug) {
    await del(`${REDIS_KEYS.PRODUCT_CACHE}${product.slug}`);
  }
  await del(`${REDIS_KEYS.PRODUCTS_LIST}*`);

  return product;
};
