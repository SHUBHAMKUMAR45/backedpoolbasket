import * as orderService from '../services/order.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createOrder = asyncHandler(async (req, res) => {
  const result = await orderService.createOrder(req.user._id, req.body);
  res
    .status(201)
    .json(new ApiResponse(201, result, 'Order placed successfully'));
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getMyOrders(req.user._id, req.query);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Orders retrieved successfully'));
});

export const getOrderDetails = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderDetails(req.user._id, req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, { order }, 'Order details retrieved successfully'));
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await orderService.updateOrderStatus(req.params.id, { status, note }, req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, { order }, 'Order status updated successfully'));
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const result = await orderService.getAllOrders(req.query);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'All orders retrieved successfully'));
});

export const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId } = req.body;
  const order = await orderService.assignDeliveryPartner(req.params.id, deliveryPartnerId, req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, { order }, 'Delivery partner assigned successfully'));
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { cancelReason } = req.body;
  const order = await orderService.cancelOrder(req.params.id, req.user._id, cancelReason);
  res
    .status(200)
    .json(new ApiResponse(200, { order }, 'Order cancelled successfully'));
});
