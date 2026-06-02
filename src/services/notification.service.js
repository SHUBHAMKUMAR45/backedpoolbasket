import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { sendPushNotification } from '../config/fcm.js';
import { PAGINATION } from '../utils/constants.js';

export const createNotification = async (userId, { title, description, type, relatedOrder }) => {
  const notification = await Notification.create({
    user: userId,
    title,
    description,
    type: type || 'info',
    relatedOrder: relatedOrder || null
  });

  // Attempt push notification trigger asynchronously (fire-and-forget)
  User.findById(userId)
    .select('fcmToken')
    .then((user) => {
      if (user && user.fcmToken) {
        sendPushNotification(user.fcmToken, title, description, {
          type: type || 'info',
          relatedOrder: relatedOrder ? relatedOrder.toString() : ''
        }).catch((err) => {
          console.error(`Async FCM dispatch error: ${err.message}`);
        });
      }
    })
    .catch((err) => {
      console.error(`Failed to fetch user FCM token: ${err.message}`);
    });

  return notification;
};

export const getUserNotifications = async (userId, query) => {
  const page = parseInt(query.page || PAGINATION.DEFAULT_PAGE, 10);
  const limit = parseInt(query.limit || PAGINATION.DEFAULT_LIMIT, 10);
  const { type, read } = query;

  const filter = { user: userId };
  if (type) {
    filter.type = type;
  }
  if (read !== undefined) {
    filter.read = read === 'true' || read === true;
  }

  const skip = (page - 1) * limit;
  const total = await Notification.countDocuments(filter);
  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const unreadCount = await Notification.countDocuments({ user: userId, read: false });
  const pages = Math.ceil(total / limit);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1
    },
    unreadCount
  };
};

export const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  notification.read = true;
  await notification.save();

  return notification;
};

export const markAllRead = async (userId) => {
  const result = await Notification.updateMany({ user: userId, read: false }, { read: true });
  return { updated: result.modifiedCount };
};

export const deleteNotification = async (userId, notificationId) => {
  const notification = await Notification.findOne({ _id: notificationId, user: userId });
  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  await Notification.findByIdAndDelete(notificationId);
};

export const broadcastNotification = async ({ title, message, category, targetAudience }) => {
  const userFilter = { isActive: true };

  if (targetAudience === 'customers') {
    userFilter.role = 'user';
  } else if (targetAudience === 'delivery_partners') {
    userFilter.role = 'delivery_partner';
  }

  // Retrieve matching users' IDs and FCM tokens
  const users = await User.find(userFilter).select('_id fcmToken').lean();
  if (users.length === 0) {
    return { sent: 0, type: category };
  }

  // 1. Bulk insert in-app notifications
  const notificationDocs = users.map((user) => ({
    user: user._id,
    title,
    description: message,
    type: category || 'info'
  }));
  await Notification.insertMany(notificationDocs);

  // 2. Dispatch FCM in batches of 500
  const usersWithTokens = users.filter((u) => u.fcmToken);
  let pushSentCount = 0;

  if (usersWithTokens.length > 0) {
    const batchSize = 500;
    for (let i = 0; i < usersWithTokens.length; i += batchSize) {
      const batch = usersWithTokens.slice(i, i + batchSize);
      const pushPromises = batch.map((user) =>
        sendPushNotification(user.fcmToken, title, message, {
          type: category || 'info'
        }).catch((err) => {
          console.error(`FCM Broadcast batch error: ${err.message}`);
          return null;
        })
      );
      await Promise.all(pushPromises);
      pushSentCount += batch.length;
    }
  }

  return { sent: users.length, pushSent: pushSentCount, type: category };
};
