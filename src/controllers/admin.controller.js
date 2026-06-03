import * as adminService from '../services/admin.service.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

export const getDeliveryPartners = asyncHandler(async (req, res) => {
  const partners = await adminService.getDeliveryPartners();
  res.status(200).json(new ApiResponse(200, partners, 'Delivery partners fetched successfully'));
});

export const toggleDeliveryPartnerStatus = asyncHandler(async (req, res) => {
  const partner = await adminService.toggleDeliveryPartnerStatus(req.params.id);
  res.status(200).json(new ApiResponse(200, partner, 'Delivery partner status updated successfully'));
});

export const getDeliveryReports = asyncHandler(async (req, res) => {
  const reports = await adminService.getDeliveryReports();
  res.status(200).json(new ApiResponse(200, reports, 'Reports fetched successfully'));
});

export const assignPendingOrder = asyncHandler(async (req, res) => {
  const { orderId, partnerId } = req.body;
  const order = await adminService.assignPendingOrder(orderId, partnerId);
  res.status(200).json(new ApiResponse(200, order, 'Order assigned successfully'));
});


export const assignRandomPendingOrder = asyncHandler(async (req, res) => {
  const result = await adminService.assignRandomPendingOrder();
  res.status(200).json(new ApiResponse(200, result, 'Random pending order assigned successfully'));
});

