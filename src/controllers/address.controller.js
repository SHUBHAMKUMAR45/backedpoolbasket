import * as addressService from '../services/address.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.getAddresses(req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, { addresses }, 'Addresses retrieved successfully'));
});

export const createAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user._id, req.body);
  res
    .status(201)
    .json(new ApiResponse(201, { address }, 'Address created successfully'));
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(req.user._id, req.params.id, req.body);
  res
    .status(200)
    .json(new ApiResponse(200, { address }, 'Address updated successfully'));
});

export const deleteAddress = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.user._id, req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'Address deleted successfully'));
});

export const setDefault = asyncHandler(async (req, res) => {
  const address = await addressService.setDefaultAddress(req.user._id, req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, { address }, 'Default address updated successfully'));
});
