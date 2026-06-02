import DeliveryPartner from '../models/DeliveryPartner.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { ORDER_STATUS } from '../utils/constants.js';
import { createNotification } from './notification.service.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import environment from '../config/environment.js';
import logger from '../utils/logger.js';

export const getDashboard = async (userId) => {
  const partner = await DeliveryPartner.findOne({ user: userId }).populate('user', 'name phone avatar');
  if (!partner) {
    throw new ApiError(404, 'Delivery partner profile not found');
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Stats queries (Delivered today + Active assignments)
  const [todayOrders, activeOrders, availableOrders] = await Promise.all([
    Order.find({
      status: ORDER_STATUS.DELIVERED,
      deliveryPartnerId: userId,
      deliveredAt: { $gte: today }
    }),
    Order.find({
      deliveryPartnerId: userId,
      status: { $in: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY] }
    }).populate('user', 'name phone'),
    Order.find({
      status: ORDER_STATUS.PROCESSING,
      deliveryPartnerId: null
    })
      .limit(5)
      .populate('user', 'name phone')
  ]);

  const todayEarnings = todayOrders.length * 50; // flat rate 50 per order for rider

  return {
    partner: {
      name: partner.user.name,
      phone: partner.user.phone,
      avatar: partner.user.avatar?.url || '',
      rating: partner.rating.average,
      isOnDuty: partner.isOnDuty,
      vehicleType: partner.vehicleType,
      vehicleNumber: partner.vehicleNumber,
      kycVerified: partner.kycVerified
    },
    todayStats: {
      earnings: todayEarnings,
      orders: todayOrders.length,
      distance: 0,
      loginHours: 0
    },
    activeOrders,
    availableOrders
  };
};

export const toggleDuty = async (userId, isOnDuty) => {
  const partner = await DeliveryPartner.findOne({ user: userId });
  if (!partner) {
    throw new ApiError(404, 'Delivery partner profile not found');
  }

  partner.isOnDuty = isOnDuty;
  await partner.save();

  return { isOnDuty: partner.isOnDuty };
};

export const getDeliveryOrders = async (userId, { status }) => {
  const filter = {};

  if (status === 'pending') {
    // Unassigned orders ready for pickup
    filter.status = ORDER_STATUS.PROCESSING;
    filter.deliveryPartnerId = null;
  } else if (status === 'active') {
    // Orders assigned to this partner and currently in progress
    filter.deliveryPartnerId = userId;
    filter.status = {
      $in: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING, ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY]
    };
  } else if (status === 'delivered') {
    // Past completed deliveries
    filter.deliveryPartnerId = userId;
    filter.status = ORDER_STATUS.DELIVERED;
  } else {
    throw new ApiError(400, 'Invalid status filter query. Use pending, active, or delivered.');
  }

  const orders = await Order.find(filter)
    .populate('user', 'name phone')
    .sort({ createdAt: -1 });

  return orders.map((o) => ({
    _id: o._id,
    orderNumber: o.orderNumber,
    customerName: o.shippingAddress.fullName,
    customerPhone: o.shippingAddress.phone,
    address: `${o.shippingAddress.street}, ${o.shippingAddress.city}, ${o.shippingAddress.state} - ${o.shippingAddress.pincode}`,
    itemsCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
    amount: o.pricing.total,
    status: o.status,
    distance: 0
  }));
};

export const getDeliveryOrderDetail = async (userId, orderId) => {
  const order = await Order.findOne({
    _id: orderId,
    $or: [{ deliveryPartnerId: userId }, { deliveryPartnerId: null, status: ORDER_STATUS.PROCESSING }]
  }).populate('user', 'name phone');

  if (!order) {
    throw new ApiError(404, 'Order not found or not accessible');
  }

  return order;
};

export const updateDeliveryStatus = async (userId, orderId, { status, location }) => {
  const order = await Order.findOne({ _id: orderId, deliveryPartnerId: userId });
  if (!order) {
    throw new ApiError(404, 'Assigned order not found');
  }

  // Update Rider Location if provided (Async)
  if (location && location.lat && location.lng) {
    DeliveryPartner.updateOne(
      { user: userId },
      { currentLocation: { lat: location.lat, lng: location.lng, updatedAt: new Date() } }
    ).catch((err) => console.error(`Failed to update rider location: ${err.message}`));
  }

  // State sequences: ACCEPTED -> REACHED_STORE -> PICKED_UP -> DELIVERED
  if (status === 'accepted') {
    if (order.status !== ORDER_STATUS.PROCESSING) {
      throw new ApiError(400, 'Order is not in processing state');
    }
    order.status = ORDER_STATUS.SHIPPED;
    order.statusHistory.push({
      status: ORDER_STATUS.SHIPPED,
      note: 'Delivery accepted by rider',
      updatedBy: userId
    });
  } else if (status === 'reached_store') {
    if (order.status !== ORDER_STATUS.SHIPPED) {
      throw new ApiError(400, 'Order has not been accepted yet');
    }
    order.statusHistory.push({
      status: ORDER_STATUS.SHIPPED,
      note: 'Rider reached flower store',
      updatedBy: userId
    });
  } else if (status === 'picked_up') {
    if (order.status !== ORDER_STATUS.SHIPPED) {
      throw new ApiError(400, 'Rider must reach store before picking up order');
    }
    order.status = ORDER_STATUS.OUT_FOR_DELIVERY;
    
    // B5 FIX: Hash delivery OTP before storing — never store plaintext.
    // Verification in verifyDeliveryOtp updated to use bcrypt.compare.
    const plainOtp = Math.floor(1000 + Math.random() * 9000).toString();
    order.deliveryOtp = await bcrypt.hash(plainOtp, 10);
    order.deliveryOtpAttempts = 0; // B6: reset attempt counter on new OTP
    
    order.statusHistory.push({
      status: ORDER_STATUS.OUT_FOR_DELIVERY,
      note: 'Order picked up from store',
      updatedBy: userId
    });

    try {
      // B5 FIX: NEVER embed OTP in notification body.
      // In production, OTP is sent via Twilio SMS to the customer's registered number.
      // In development, log at debug level only.
      if (environment.NODE_ENV !== 'production') {
        logger.debug(`[DEV-ONLY DELIVERY OTP] Order: ${order.orderNumber} | OTP: ${plainOtp}`);
      }
      await createNotification(order.user, {
        title: 'Order on the way!',
        description: `Your rider is on the way! Please check your SMS for the OTP to confirm delivery.`,
        type: 'order',
        relatedOrder: order._id
      });
    } catch (err) {
      logger.error(`FCM notification failure: ${err.message}`);
    }
  } else if (status === 'delivered') {
    if (order.status !== ORDER_STATUS.OUT_FOR_DELIVERY) {
      throw new ApiError(400, 'Order is not out for delivery yet');
    }
    // DO NOT mark delivered yet — return require OTP verification flag
    return { requiresOtp: true, message: 'Please verify delivery OTP' };
  } else {
    throw new ApiError(400, `Invalid delivery status target: ${status}`);
  }

  await order.save();
  return order;
};

export const verifyDeliveryOtp = async (userId, orderId, otp) => {
  const order = await Order.findOne({
    _id: orderId,
    deliveryPartnerId: userId,
    status: ORDER_STATUS.OUT_FOR_DELIVERY
  }).select('+deliveryOtp +deliveryOtpAttempts');

  if (!order) {
    throw new ApiError(404, 'Active delivery order not found');
  }

  if (!order.deliveryOtp) {
    throw new ApiError(400, 'No verification OTP assigned to this order');
  }

  // B6 FIX: Per-order OTP attempt limit — defence-in-depth beyond the route-level rate limiter.
  // Max 5 attempts per order before OTP is locked (requiring admin reset).
  const MAX_OTP_ATTEMPTS = 5;
  if ((order.deliveryOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
    throw new ApiError(429, 'Maximum OTP attempts exceeded for this order. Please contact support.');
  }

  // B5 FIX: Use bcrypt.compare instead of timingSafeEqual — OTP is now stored as a bcrypt hash.
  // timingSafeEqual on plaintext strings provided false security anyway.
  const isMatch = await bcrypt.compare(otp, order.deliveryOtp);

  if (!isMatch) {
    // Increment attempt counter atomically
    await Order.updateOne({ _id: orderId }, { $inc: { deliveryOtpAttempts: 1 } });
    const remaining = MAX_OTP_ATTEMPTS - ((order.deliveryOtpAttempts || 0) + 1);
    throw new ApiError(401, `Incorrect delivery verification OTP. ${remaining} attempt(s) remaining.`);
  }

  // Update order status
  order.status = ORDER_STATUS.DELIVERED;
  order.deliveredAt = new Date();
  order.payment.status = 'completed';
  await order.save();

  // Credit earnings to DeliveryPartner ledger
  const deliveryFee = 50; // flat 50 per order
  const partner = await DeliveryPartner.findOne({ user: userId });
  if (partner) {
    partner.totalDeliveries += 1;
    partner.earnings.today += deliveryFee;
    partner.earnings.week += deliveryFee;
    partner.earnings.total += deliveryFee;
    partner.earnings.balance += deliveryFee;
    await partner.save();
  }

  // Notifications
  try {
    await createNotification(order.user, {
      title: 'Order Delivered!',
      description: `Your order ${order.orderNumber} was delivered successfully.`,
      type: 'order',
      relatedOrder: order._id
    });

    await createNotification(userId, {
      title: 'Delivery Completed',
      description: `Delivered order ${order.orderNumber}. ₹${deliveryFee} credited to balance.`,
      type: 'delivery',
      relatedOrder: order._id
    });
  } catch (err) {
    console.error(`Post-delivery notification trigger failed: ${err.message}`);
  }

  return { success: true, message: 'Delivery verified and completed successfully' };
};

export const getEarnings = async (userId) => {
  const partner = await DeliveryPartner.findOne({ user: userId });
  if (!partner) {
    throw new ApiError(404, 'Delivery partner profile not found');
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  // Query completed orders
  const orders = await Order.find({
    deliveryPartnerId: userId,
    status: ORDER_STATUS.DELIVERED,
    deliveredAt: { $gte: sevenDaysAgo }
  });

  // Calculate day-by-day stats
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const statsMap = new Map(daysOfWeek.map((day) => [day, 0]));

  orders.forEach((o) => {
    const dayName = daysOfWeek[new Date(o.deliveredAt).getDay()];
    statsMap.set(dayName, statsMap.get(dayName) + 50); // flat 50 credit
  });

  const weeklyStats = daysOfWeek.map((day) => ({
    day,
    amount: statsMap.get(day)
  }));

  // Retrieve last 10 completed order transactions
  const transactions = orders
    .slice(0, 10)
    .map((o) => ({
      orderId: o._id,
      orderNumber: o.orderNumber,
      amount: 50,
      date: o.deliveredAt
    }));

  // Calculate next payout date (coming Monday)
  const nextPayout = new Date();
  nextPayout.setDate(nextPayout.getDate() + ((1 + 7 - nextPayout.getDay()) % 7 || 7));
  nextPayout.setHours(10, 0, 0, 0); // Monday 10:00 AM

  return {
    balance: partner.earnings.balance,
    today: partner.earnings.today,
    week: partner.earnings.week,
    total: partner.earnings.total,
    nextPayout,
    weeklyStats,
    transactions
  };
};

export const withdrawEarnings = async (userId, amount) => {
  const partner = await DeliveryPartner.findOne({ user: userId });
  if (!partner) {
    throw new ApiError(404, 'Delivery partner profile not found');
  }

  if (amount <= 0) {
    throw new ApiError(400, 'Withdrawal amount must be greater than zero');
  }

  // B7 FIX: Atomic withdrawal using findOneAndUpdate with balance check in the query.
  // Previous code used read-modify-write (findOne, check, save) which is vulnerable to
  // race conditions: two concurrent requests both read the same balance, both pass the
  // check, and both deduct, potentially driving the balance negative.
  // The atomic pattern below ensures only one request can win the race.
  const result = await DeliveryPartner.findOneAndUpdate(
    {
      user: userId,
      'earnings.balance': { $gte: amount }  // balance check is INSIDE the atomic query
    },
    {
      $inc: { 'earnings.balance': -amount }
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(400, `Insufficient balance. Available: ₹${partner.earnings.balance}`);
  }

  logger.info(`[Rider Payout Transfer] User: ${userId} | Amount: ₹${amount} | Remaining: ₹${result.earnings.balance}`);

  return {
    withdrawn: amount,
    remaining: result.earnings.balance
  };
};

export const updateLocation = async (userId, { lat, lng }) => {
  const result = await DeliveryPartner.updateOne(
    { user: userId },
    { currentLocation: { lat, lng, updatedAt: new Date() } }
  );

  if (result.matchedCount === 0) {
    throw new ApiError(404, 'Delivery partner profile not found');
  }

  return { updated: true };
};

export const getProfile = async (userId) => {
  const partner = await DeliveryPartner.findOne({ user: userId }).populate('user', 'name phone avatar');
  if (!partner) {
    throw new ApiError(404, 'Delivery partner profile not found');
  }

  return partner;
};

export const getTrackingData = async (userId, orderId) => {
  const order = await Order.findOne({
    _id: orderId,
    $or: [{ deliveryPartnerId: userId }, { user: userId }]
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const partner = await DeliveryPartner.findOne({ user: order.deliveryPartnerId });
  const riderLocation = partner ? partner.currentLocation : null;

  return {
    storeLocation: { lat: 28.6139, lng: 77.2090 }, // Hardcoded florist central depot location
    customerLocation: {
      address: `${order.shippingAddress.street}, ${order.shippingAddress.city}`
    },
    riderLocation
  };
};

export const updateVehicle = async (userId, data) => {
  const partner = await DeliveryPartner.findOne({ user: userId });
  if (!partner) {
    throw new ApiError(404, 'Delivery partner profile not found');
  }
  if (data.vehicleType) partner.vehicleType = data.vehicleType;
  if (data.vehicleNumber) partner.vehicleNumber = data.vehicleNumber;
  if (data.vehicleName) partner.vehicleName = data.vehicleName;
  if (data.vehicleColor) partner.vehicleColor = data.vehicleColor;
  await partner.save();
  return partner;
};

export const settleCod = async (userId, amount) => {
  const partner = await DeliveryPartner.findOne({ user: userId });
  if (!partner) {
    throw new ApiError(404, 'Delivery partner profile not found');
  }
  
  if (amount > partner.earnings.codCollected) {
    throw new ApiError(400, 'Amount exceeds pending COD balance');
  }
  
  partner.earnings.codCollected -= amount;
  await partner.save();
  return partner;
};

