import * as reviewService from '../services/review.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

export const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user._id, req.body);
  res
    .status(201)
    .json(new ApiResponse(201, { review }, 'Review submitted successfully'));
});

export const getProductReviews = asyncHandler(async (req, res) => {
  const result = await reviewService.getProductReviews(req.params.productId, req.query);
  res
    .status(200)
    .json(new ApiResponse(200, result, 'Product reviews fetched successfully'));
});
