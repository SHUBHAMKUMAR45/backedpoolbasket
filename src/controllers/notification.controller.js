import * as notificationService from '../services/notification.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getUserNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(req.user._id, req.query);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Notifications retrieved successfully'));
});

export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user._id, req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, { notification }, 'Notification marked as read'));
});

export const markAllRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllRead(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'All notifications marked as read'));
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.deleteNotification(req.user._id, req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'Notification deleted successfully'));
});

export const broadcastNotification = asyncHandler(async (req, res) => {
  const { title, message, category, targetAudience } = req.body;
  const result = await notificationService.broadcastNotification({
    title,
    message,
    category,
    targetAudience
  });
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Notifications broadcasted successfully'));
});
