import Coupon from '../models/Coupon.js';
import ApiError from '../utils/ApiError.js';
import { PAGINATION } from '../utils/constants.js';

export const getCoupons = async (query) => {
  const page = parseInt(query.page || PAGINATION.DEFAULT_PAGE, 10);
  const limit = parseInt(query.limit || PAGINATION.DEFAULT_LIMIT, 10);
  const { isActive } = query;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }

  const skip = (page - 1) * limit;
  const total = await Coupon.countDocuments(filter);
  const coupons = await Coupon.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const pages = Math.ceil(total / limit);

  return {
    coupons,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    }
  };
};

export const createCoupon = async (data, adminId) => {
  const code = data.code.trim().toUpperCase();

  const existing = await Coupon.findOne({ code });
  if (existing) {
    throw new ApiError(409, `Coupon with code "${code}" already exists`);
  }

  const coupon = await Coupon.create({
    ...data,
    code,
    createdBy: adminId
  });

  return coupon;
};

export const validateCoupon = async (code, orderAmount, userId) => {
  if (!code) {
    throw new ApiError(400, 'Coupon code is required');
  }
  if (orderAmount === undefined || orderAmount < 0) {
    throw new ApiError(400, 'Valid order amount is required');
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    throw new ApiError(404, 'Invalid coupon code');
  }

  const { discountAmount, finalAmount } = coupon.calculateDiscount(orderAmount, userId);

  return {
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount,
    finalAmount
  };
};

export const deleteCoupon = async (id) => {
  const coupon = await Coupon.findById(id);
  if (!coupon) {
    throw new ApiError(404, 'Coupon not found');
  }

  await Coupon.findByIdAndDelete(id);
};
