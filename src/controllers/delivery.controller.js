import * as deliveryService from '../services/delivery.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const result = await deliveryService.getDashboard(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Dashboard details retrieved successfully'));
});

export const toggleDuty = asyncHandler(async (req, res) => {
  const { isOnDuty } = req.body;
  const result = await deliveryService.toggleDuty(req.user._id, isOnDuty);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Duty status updated successfully'));
});

export const getOrders = asyncHandler(async (req, res) => {
  const result = await deliveryService.getDeliveryOrders(req.user._id, req.query);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Assigned orders retrieved successfully'));
});

export const getOrderDetail = asyncHandler(async (req, res) => {
  const order = await deliveryService.getDeliveryOrderDetail(req.user._id, req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, { order }, 'Order details retrieved successfully'));
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status, location } = req.body;
  const result = await deliveryService.updateDeliveryStatus(req.user._id, req.params.id, {
    status,
    location
  });
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Delivery status updated successfully'));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const result = await deliveryService.verifyDeliveryOtp(req.user._id, req.params.id, otp);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Delivery verified successfully'));
});

export const getEarnings = asyncHandler(async (req, res) => {
  const result = await deliveryService.getEarnings(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Earnings statistics retrieved successfully'));
});

export const withdraw = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const result = await deliveryService.withdrawEarnings(req.user._id, parseFloat(amount));
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Withdrawal request completed successfully'));
});

export const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const result = await deliveryService.updateLocation(req.user._id, { lat, lng });
  res
    .status(200)
    .json(new ApiResponse(200, result, ' Rder geolocation coordinates updated'));
});

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await deliveryService.getProfile(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, { profile }, 'Profile data fetched successfully'));
});

export const getTracking = asyncHandler(async (req, res) => {
  const result = await deliveryService.getTrackingData(req.user._id, req.params.orderId);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Tracking coordinates fetched successfully'));
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const { vehicleType, vehicleNumber, vehicleName, vehicleColor } = req.body;
  const result = await deliveryService.updateVehicle(req.user._id, { vehicleType, vehicleNumber, vehicleName, vehicleColor });
  res.status(200).json(new ApiResponse(200, result, 'Vehicle details updated successfully'));
});

export const settleCod = asyncHandler(async (req, res) => {
  const result = await deliveryService.settleCod(req.user._id, req.body.amount);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'COD settlement successful'));
});

