import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ORDER_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required']
  },
  name: {
    type: String,
    required: [true, 'Product name is required']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  image: {
    type: String
  }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true
    },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      landmark: { type: String }
    },
    pricing: {
      subtotal: { type: Number, required: true },
      deliveryCharge: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, required: true }
    },
    payment: {
      method: {
        type: String,
        enum: ['cod'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
      },
      razorpayOrderId: { type: String },
      razorpayPaymentId: { type: String },
      razorpaySignature: { type: String },
      paidAt: { type: Date }
    },
    couponCode: { type: String },
    couponDiscount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: 'pending',
      index: true
    },
    statusHistory: [
      {
        status: { type: String },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    deliveryOtp: {
      type: String,
      select: false
    },
    // B6: Per-order OTP attempt counter for brute-force protection
    deliveryOtpAttempts: {
      type: Number,
      default: 0,
      select: false
    },
    giftMessage: {
      type: String,
      maxLength: 500
    },
    deliveryDate: {
      type: Date
    },
    deliveredAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancelReason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, user: 1 });
orderSchema.index({ 'payment.razorpayOrderId': 1 });
orderSchema.index({ deliveryPartnerId: 1, status: 1 });

// Pre-save hook
orderSchema.pre('save', async function (next) {
  const isNewOrder = this.isNew;

  // 1. Auto-generate orderNumber and initial history if new
  if (isNewOrder) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.orderNumber = `PB-${dateStr}-${randomChars}`;

    // Generate 4-digit deliveryOtp and save hashed
    const plainOtp = Math.floor(1000 + Math.random() * 9000).toString();
    this.deliveryOtp = await bcrypt.hash(plainOtp, 10);
    logger.info(`[Order OTP] Order: ${this.orderNumber} | OTP: ${plainOtp} (hashed for database)`);

    // Push initial status history
    this.statusHistory.push({
      status: 'pending',
      note: 'Order placed successfully',
      updatedBy: this.user
    });
  }

  // 2. Capture history and timestamps on status change
  if (this.isModified('status') && !isNewOrder) {
    this.statusHistory.push({
      status: this.status,
      note: `Order status updated to ${this.status}`,
      updatedBy: this.deliveryPartnerId || this.user
    });

    if (this.status === 'delivered') {
      this.deliveredAt = new Date();
      this.payment.status = 'completed'; // auto-complete payment on delivery if COD
    } else if (this.status === 'cancelled') {
      this.cancelledAt = new Date();
    }
  }

  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
