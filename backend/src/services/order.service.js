import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ORDER_STATUS } from '../utils/constants.js';
import { createNotification } from './notification.service.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import environment from '../config/environment.js';
import logger from '../utils/logger.js';

const STATUS_SEQUENCE = [
  ORDER_STATUS.PENDING,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED
];

export const createOrder = async (userId, { items, shippingAddress, payment, giftMessage, couponCode }) => {
  // Step 1: Validate stock and availability
  if (!items || items.length === 0) {
    throw new ApiError(400, 'Order items are required');
  }

  const productIds = items.map((i) => i.product);
  const dbProducts = await Product.find({ _id: { $in: productIds } });
  
  const stockErrors = [];
  const productMap = new Map();
  dbProducts.forEach((p) => productMap.set(p._id.toString(), p));

  items.forEach((item) => {
    const dbProd = productMap.get(item.product.toString());
    if (!dbProd) {
      stockErrors.push({ product: item.product, message: 'Product not found' });
    } else if (!dbProd.isActive) {
      stockErrors.push({ product: item.product, message: `Product "${dbProd.name}" is deactivated` });
    } else if (dbProd.stock < item.quantity) {
      stockErrors.push({
        product: item.product,
        message: `Insufficient stock for "${dbProd.name}". Available: ${dbProd.stock}, Requested: ${item.quantity}`
      });
    }
  });

  if (stockErrors.length > 0) {
    throw new ApiError(400, 'Stock validation failed', stockErrors);
  }

  // Step 2: Calculate subtotal using database prices (not client-side prices)
  let subtotal = 0;
  const mappedItems = items.map((item) => {
    const dbProd = productMap.get(item.product.toString());
    const itemTotal = dbProd.price * item.quantity;
    subtotal += itemTotal;

    const primaryImg = dbProd.images.find((img) => img.isPrimary) || dbProd.images[0];
    const image = primaryImg ? primaryImg.url : '';

    return {
      product: dbProd._id,
      name: dbProd.name,
      price: dbProd.price,
      quantity: item.quantity,
      image
    };
  });

  // Step 3: Apply delivery charges
  const deliveryCharge = subtotal >= 999 ? 0 : 50;

  // Step 4: Apply coupon if provided
  let discount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) {
      throw new ApiError(400, 'Invalid coupon code');
    }
    const couponResult = coupon.calculateDiscount(subtotal, userId);
    discount = couponResult.discountAmount;
  }

  // Step 5: Compute final total
  const total = subtotal + deliveryCharge - discount;

  // Only COD is supported for payment method
  if (payment.method !== 'cod') {
    throw new ApiError(400, 'Only Cash on Delivery (COD) is supported as a payment method.');
  }
  let razorpayOrderId = null;

  // B2 FIX: Atomic stock deduction — replaces the 2-step read+bulkWrite with per-product
  // atomic updateOne. The filter { stock: { $gte: quantity } } ensures we only decrement
  // when sufficient stock exists. modifiedCount === 0 means out-of-stock race was lost.
  const atomicStockOps = [];
  for (const item of items) {
    const result = await Product.updateOne(
      { _id: item.product, stock: { $gte: item.quantity }, isActive: true },
      { $inc: { stock: -item.quantity } }
    );
    if (result.modifiedCount === 0) {
      // Another request won the race. Restore previously decremented items.
      if (atomicStockOps.length > 0) {
        await Product.bulkWrite(
          atomicStockOps.map((op) => ({
            updateOne: { filter: { _id: op.product }, update: { $inc: { stock: op.quantity } } }
          }))
        );
      }
      const prod = productMap.get(item.product.toString());
      throw new ApiError(400, `"${prod?.name || item.product}" is out of stock. Please update your cart.`);
    }
    atomicStockOps.push({ product: item.product, quantity: item.quantity });
  }

  // B3 FIX: Atomic coupon application — replaces findOne+updateOne (race condition) with a
  // single findOneAndUpdate. The query includes { usedBy: { $ne: userId } } so concurrent
  // requests for the same user cannot both succeed.
  if (couponCode && discount > 0) {
    const couponUpdateResult = await Coupon.findOneAndUpdate(
      {
        code: couponCode.toUpperCase(),
        isActive: true,
        usedBy: { $ne: userId },
        $or: [
          { usageLimit: null },
          { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
        ]
      },
      {
        $inc: { usedCount: 1 },
        $push: { usedBy: userId }
      },
      { new: true }
    );
    if (!couponUpdateResult) {
      // Coupon was used concurrently or deactivated — rollback stock
      await Product.bulkWrite(
        atomicStockOps.map((op) => ({
          updateOne: { filter: { _id: op.product }, update: { $inc: { stock: op.quantity } } }
        }))
      );
      throw new ApiError(409, 'Coupon has already been used. Stock has been restored.');
    }
  }

  // Step 9: Clear user's cart
  await Cart.findOneAndUpdate({ user: userId }, { items: [], total: 0 });

  // Step 10: Create and save order
  const order = new Order({
    user: userId,
    items: mappedItems,
    shippingAddress,
    pricing: {
      subtotal,
      deliveryCharge,
      discount,
      total
    },
    payment: {
      method: payment.method,
      status: 'pending',
      razorpayOrderId
    },
    couponCode,
    couponDiscount: discount,
    status: 'pending'
  });

  await order.save();

  // Step 11: Dispatch notification
  try {
    await createNotification(userId, {
      title: 'Order Placed successfully!',
      description: `Your order ${order.orderNumber} for ₹${total} has been placed.`,
      type: 'order',
      relatedOrder: order._id
    });
  } catch (err) {
    console.error(`FCM/Notification trigger failed: ${err.message}`);
  }

  return { order, razorpayOrderId };
};

export const getMyOrders = async (userId, { page = 1, limit = 12, status }) => {
  const filter = { user: userId };
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;
  const total = await Order.countDocuments(filter);
  
  // Projection: orderNumber, status, pricing.total, first item only, and dates
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('orderNumber status pricing.total items createdAt')
    .slice('items', 1); // returns only the first element of items array

  const pages = Math.ceil(total / limit);

  return {
    orders,
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

export const getOrderDetails = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, user: userId })
    .populate('items.product', 'name images');

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  return order;
};

export const updateOrderStatus = async (orderId, { status, note }, adminId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const currentIdx = STATUS_SEQUENCE.indexOf(order.status);
  const newIdx = STATUS_SEQUENCE.indexOf(status);

  // Validate state transitions
  if (newIdx === -1 && status !== ORDER_STATUS.CANCELLED && status !== ORDER_STATUS.REFUNDED) {
    throw new ApiError(400, `Invalid order status target: ${status}`);
  }

  if (newIdx !== -1 && newIdx <= currentIdx) {
    throw new ApiError(400, `Cannot regress order status from "${order.status}" back to "${status}"`);
  }

  order.status = status;
  
  // B5 FIX: Hash delivery OTP before storing — never store plaintext in MongoDB.
  // Previously: order.deliveryOtp = plainOtp (bypassed the Order pre-save bcrypt hashing).
  // Fix: Hash with bcrypt here. Verification in verifyDeliveryOtp uses bcrypt.compare.
  if (status === ORDER_STATUS.OUT_FOR_DELIVERY) {
    const plainOtp = Math.floor(1000 + Math.random() * 9000).toString();
    order.deliveryOtp = await bcrypt.hash(plainOtp, 10); // Hashed — never stored plaintext
    // B5 FIX: NEVER embed OTP in notification body.
    // The OTP will be delivered via Twilio SMS to the customer's registered phone only.
    // Log only at debug level, never in production logs.
    if (environment.NODE_ENV !== 'production') {
      logger.debug(`[DEV-ONLY OTP] Order: ${order.orderNumber} | OTP: ${plainOtp}`);
    }
  }

  await order.save();

  // B5 FIX: Notification MUST NOT contain the OTP
  if (status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.OUT_FOR_DELIVERY) {
    try {
      let desc = `Your order ${order.orderNumber} is now ${status}.`;
      if (status === ORDER_STATUS.OUT_FOR_DELIVERY) {
        // OTP will be delivered separately via SMS — do not include in push notification
        desc = `Your order is out for delivery! Please check your SMS for the verification OTP.`;
      }
      await createNotification(order.user, {
        title: `Order status: ${status.toUpperCase()}`,
        description: desc,
        type: 'order',
        relatedOrder: order._id
      });
    } catch (err) {
      logger.error(`Status change notification failed: ${err.message}`);
    }
  }

  return order;
};

export const getAllOrders = async (query) => {
  const page = parseInt(query.page || 1, 10);
  const limit = parseInt(query.limit || 12, 10);
  const { status, search, dateFrom, dateTo } = query;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  if (search) {
    // Search by orderNumber or check customer name
    const matchingUsers = await User.find({ name: new RegExp(search, 'i') }).select('_id');
    const userIds = matchingUsers.map((u) => u._id);
    filter.$or = [
      { orderNumber: new RegExp(search, 'i') },
      { user: { $in: userIds } }
    ];
  }

  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (page - 1) * limit;
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'name email phone');

  // Aggregation summary by status
  const summaryAgg = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$pricing.total' } } }
  ]);

  const summary = {
    totalOrders: total,
    byStatus: summaryAgg.reduce((acc, curr) => {
      acc[curr._id] = { count: curr.count, amount: curr.totalAmount };
      return acc;
    }, {})
  };

  const pages = Math.ceil(total / limit);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    },
    summary
  };
};

export const assignDeliveryPartner = async (orderId, deliveryPartnerId, adminId) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const partner = await User.findOne({ _id: deliveryPartnerId, role: 'delivery_partner' });
  if (!partner) {
    throw new ApiError(404, 'Delivery partner not found');
  }

  order.deliveryPartnerId = deliveryPartnerId;
  order.status = ORDER_STATUS.PROCESSING;

  await order.save();

  // Create notifications
  try {
    await createNotification(deliveryPartnerId, {
      title: 'New Delivery Assigned',
      description: `You have been assigned order ${order.orderNumber} for delivery.`,
      type: 'delivery',
      relatedOrder: order._id
    });

    await createNotification(order.user, {
      title: 'Delivery Partner Assigned',
      description: `Delivery partner ${partner.name} has been assigned to your order.`,
      type: 'order',
      relatedOrder: order._id
    });
  } catch (err) {
    console.error(`FCM dispatches on delivery assignment failed: ${err.message}`);
  }

  return order;
};

export const cancelOrder = async (orderId, userId, cancelReason) => {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  if (order.status !== ORDER_STATUS.PENDING && order.status !== ORDER_STATUS.CONFIRMED) {
    throw new ApiError(400, `Cannot cancel order at status "${order.status}". Only pending or confirmed orders can be cancelled.`);
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelReason = cancelReason || 'Cancelled by customer';
  order.cancelledAt = new Date();

  // Restore inventory stock
  const bulkOps = order.items.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { stock: item.quantity } }
    }
  }));
  await Product.bulkWrite(bulkOps);

  // Process payment refund if completed
  if (order.payment.status === 'completed') {
    order.payment.status = 'refunded';
    logger.info(`Refund initiated for Order: ${order.orderNumber} | Amount: ₹${order.pricing.total}`);
    // Real Razorpay refunds can be triggered here in production
  }

  await order.save();

  // Send cancellation notification
  try {
    await createNotification(userId, {
      title: 'Order Cancelled',
      description: `Your order ${order.orderNumber} has been successfully cancelled.`,
      type: 'order',
      relatedOrder: order._id
    });
  } catch (err) {
    console.error(`Cancellation notification failed: ${err.message}`);
  }

  return order;
};
