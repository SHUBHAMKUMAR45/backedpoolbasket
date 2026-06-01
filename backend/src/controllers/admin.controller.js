import * as adminService from '../services/admin.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getOverview = asyncHandler(async (req, res) => {
  const result = await adminService.getOverview();
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Dashboard overview fetched successfully'));
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const { period } = req.query;
  const result = await adminService.getAnalytics({ period });
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Dashboard analytics fetched successfully'));
});

export const getCustomers = asyncHandler(async (req, res) => {
  const result = await adminService.getCustomers(req.query);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Customer records retrieved successfully'));
});

export const getInventory = asyncHandler(async (req, res) => {
  const result = await adminService.getInventory();
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Inventory alerts retrieved successfully'));
});
