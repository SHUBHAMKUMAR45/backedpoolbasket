import * as couponService from '../services/coupon.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const getCoupons = asyncHandler(async (req, res) => {
  const result = await couponService.getCoupons(req.query);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Coupons fetched successfully'));
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.body, req.user._id);
  res
    .status(201)
    .json(new ApiResponse(201, { coupon }, 'Coupon created successfully'));
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderAmount } = req.body;
  const result = await couponService.validateCoupon(code, orderAmount, req.user._id);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Coupon code validated successfully'));
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await couponService.deleteCoupon(req.params.id);
  res
    .status(200)
    .json(new ApiResponse(200, null, 'Coupon deleted successfully'));
});
