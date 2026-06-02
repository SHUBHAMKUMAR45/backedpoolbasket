import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ApiError from '../utils/ApiError.js';
import { createNotification } from './notification.service.js';
import { PAGINATION } from '../utils/constants.js';
import mongoose from 'mongoose';

export const createReview = async (userId, { productId, orderId, rating, title, comment }) => {
  // 1. Fetch the order and verify eligibility
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new ApiError(404, 'Associated order not found');
  }

  if (order.status !== 'delivered') {
    throw new ApiError(400, 'Reviews can only be submitted for delivered orders');
  }

  // 2. Ensure product was part of the order items
  const productInOrder = order.items.some(
    (item) => item.product.toString() === productId
  );

  if (!productInOrder) {
    throw new ApiError(400, 'This product was not purchased in the specified order');
  }

  // 3. Prevent duplicate reviews
  const existingReview = await Review.findOne({ user: userId, product: productId, order: orderId });
  if (existingReview) {
    throw new ApiError(409, 'You have already submitted a review for this product in this order');
  }

  // 4. Create the review
  const review = await Review.create({
    user: userId,
    product: productId,
    order: orderId,
    rating,
    title,
    comment,
    isVerifiedPurchase: true
  });

  // Note: the ratings average updates automatically via the Review model's post-save hook

  // 5. Send confirmation notification
  try {
    await createNotification(userId, {
      title: 'Review submitted',
      description: 'Thank you for your feedback! Your review was successfully submitted.',
      type: 'info'
    });
  } catch (err) {
    console.error(`Failed to send review confirmation: ${err.message}`);
  }

  return review;
};

export const getProductReviews = async (productId, query) => {
  const page = parseInt(query.page || PAGINATION.DEFAULT_PAGE, 10);
  const limit = parseInt(query.limit || PAGINATION.DEFAULT_LIMIT, 10);

  const filter = { product: productId, isVisible: true };
  const skip = (page - 1) * limit;

  const total = await Review.countDocuments(filter);
  const reviews = await Review.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name avatar.url');

  // Compute rating breakdown (1-5 stars)
  const breakdownAgg = await Review.aggregate([
    {
      $match: { product: new mongoose.Types.ObjectId(productId), isVisible: true }
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 }
      }
    }
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  breakdownAgg.forEach((item) => {
    breakdown[item._id] = item.count;
  });

  // Read ratings from Product summary
  const product = await Product.findById(productId).select('ratings');
  const average = product ? product.ratings.average : 0;
  const count = product ? product.ratings.count : 0;

  const pages = Math.ceil(total / limit);

  return {
    reviews,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    },
    summary: {
      average,
      count,
      breakdown
    }
  };
};
