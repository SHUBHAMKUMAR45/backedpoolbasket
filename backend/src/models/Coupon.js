import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: [true, 'Discount type is required']
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative']
    },
    maxDiscount: {
      type: Number, // Caps the discount amount for percentage coupons
      min: [0, 'Max discount limit must be positive']
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order amount must be positive']
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true
    },
    usageLimit: {
      type: Number,
      default: null // null indicates unlimited uses
    },
    usedCount: {
      type: Number,
      default: 0
    },
    usedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Method to compute discount values and run validation constraints
couponSchema.methods.calculateDiscount = function (orderAmount, userId) {
  if (!this.isActive) {
    throw new ApiError(400, 'This coupon is no longer active.');
  }

  if (this.expiryDate && new Date(this.expiryDate) < new Date()) {
    throw new ApiError(400, 'This coupon has expired.');
  }

  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    throw new ApiError(400, 'This coupon usage limit has been reached.');
  }

  if (userId && this.usedBy.map(id => id.toString()).includes(userId.toString())) {
    throw new ApiError(400, 'You have already used this coupon code.');
  }

  if (orderAmount < this.minOrderAmount) {
    throw new ApiError(400, `This coupon requires a minimum purchase amount of ₹${this.minOrderAmount}`);
  }

  let discountAmount = 0;

  if (this.discountType === 'flat') {
    discountAmount = this.discountValue;
  } else if (this.discountType === 'percentage') {
    discountAmount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscount) {
      discountAmount = Math.min(discountAmount, this.maxDiscount);
    }
  }

  // Cap discount at total order amount
  discountAmount = Math.min(discountAmount, orderAmount);

  return {
    discountAmount,
    finalAmount: Math.max(0, orderAmount - discountAmount)
  };
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
